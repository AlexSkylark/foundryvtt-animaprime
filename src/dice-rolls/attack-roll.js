import * as DiceRolls from "./dice-rolls.js";

export async function attackRoll(item, isReroll = false, dialogOptions) {
    // HTML template
    const messageTemplate = `systems/animaprime/templates/rolls/roll-${item.type}/roll-${item.type}.hbs`;

    const isEmpowered =
        checkCondition(item.owner, "empowered") && item.type == "strike";
    const isWeakened =
        checkCondition(item.owner, "weakened") && item.type == "strike";

    // validations
    const targetCheck = {
        strike: item.targets.filter((i) => {
            return (
                i.type == "character" ||
                i.type == "adversity" ||
                i.type == "hazard"
            );
        }).length,
        achievement: item.targets.filter((i) => {
            return i.type == "goal";
        }).length,
    };

    if (item.targets.length != 1 || targetCheck[item.type] != 1) {
        ui.notifications.error(
            `Please select a suitable target to perform a${
                item.type == "achievement" ? "n" : ""
            } ${item.type}.`
        );
        return;
    }

    if (item.data.cost) {
        const ownerChargeDice = item.owner.data.data.chargeDice;
        const isHexed = checkCondition(item.owner, "hexed");
        item.capitalizedType =
            item.type.charAt(0).toUpperCase() + item.type.slice(1);

        if (ownerChargeDice < item.data.cost + (isHexed ? 1 : 0)) {
            ui.notifications.error(
                `Not enough available charge dice to use this ${item.capitalizedType}.`
            );
            return;
        }
    }

    const targetData = item.targets[0].data.data ?? item.targets[0].data;
    const ownerData = item.owner.data.data ?? item.owner.data;

    // options for item type
    const itemFixedOptions = {
        strike: {
            variableDiceName: "Threat Dice",
            variableDiceValue: targetData.threatDice,
            defenseAttribute: targetData.defense,
        },
        achievement: {
            variableDiceName: "Progress Dice",
            variableDiceValue: targetData.progressDice,
            defenseAttribute: targetData.difficulty,
        },
    };

    // dialog
    if (!dialogOptions) {
        let itemForDialog = {
            ...item,
            maxStrikeDice: Math.min(ownerData.strikeDice, item.data.sdl),
            maxActionDice: Math.min(2, ownerData.actionDice),
            maxVariableDice: itemFixedOptions[item.type].variableDiceValue,
            variableDiceName: itemFixedOptions[item.type].variableDiceName,
            type: item.type,
        };

        dialogOptions = await DiceRolls.getItemRollOptions(itemForDialog);
        if (dialogOptions.cancelled) return;
    }

    if (!dialogOptions.weakness) dialogOptions.weakness = 1;

    const abilityDice = parseInt(
        item.data.roll.split("d")[0] * dialogOptions.weakness
    );

    let successModifier = 0;
    if (item.data.roll.indexOf("+") >= 0)
        successModifier = parseInt(
            item.data.roll.split("d")[1].replace("+", "").replace("-", "")
        );

    // roll execution
    const rollFormula =
        (
            abilityDice +
            dialogOptions.strikeDice +
            dialogOptions.actionDice +
            dialogOptions.variableDice +
            dialogOptions.bonusDice -
            dialogOptions.resistance +
            (isEmpowered ? 1 : 0)
        ).toString() + "d6";

    const rollResult = await new Roll(rollFormula, item).roll();

    let resultData = checkItemResult(
        itemFixedOptions[item.type].defenseAttribute,
        DiceRolls.checkSuccess(
            rollResult.dice[0].results,
            successModifier + isWeakened * -1
        )
    );

    let splittedResults = DiceRolls.splitRollResult(
        rollResult.dice[0].results,
        abilityDice,
        dialogOptions.strikeDice,
        dialogOptions.actionDice,
        dialogOptions.variableDice,
        dialogOptions.bonusDice,
        dialogOptions.resistance,
        successModifier,
        isEmpowered,
        isWeakened
    );

    let targetArray = [];
    game.user.targets.forEach((t) => targetArray.push(t._id ?? t.id));

    // chat message rendering
    await DiceRolls.renderRoll(
        rollResult,
        item,
        resultData,
        messageTemplate,
        splittedResults,
        isReroll,
        this.commitResults,
        dialogOptions,
        duplicate(targetArray)
    );
}

export async function commitResults(
    resultData,
    item,
    dialogOptions,
    itemTargets
) {
    for (let targetId of itemTargets) {
        const target = game.scenes.active.tokens.get(targetId);

        let targetData = {};
        if (target.isLinked) {
            targetData = game.actors.get(target.actor.id).data.data;
        } else {
            targetData = target.data.actorData.data ?? target.actor.data.data;
        }

        if (item.type == "strike") {
            if (resultData.hit) {
                targetData.health.value -= 1;
                targetData.threatDice = 0;
            } else {
                targetData.threatDice =
                    targetData.threatDice -
                    dialogOptions.variableDice +
                    resultData.successes;
            }

            await target.update({
                "actorData.data": targetData,
            });
        } else if (item.type == "achievement") {
            if (!resultData.hit) {
                targetData.progressDice =
                    targetData.progressDice -
                    dialogOptions.variableDice +
                    resultData.successes;
            }
            await target.update({
                "actorData.data": targetData,
            });
        }

        if (item.data.cost) {
            const ownerChargeDice = item.owner.data.data.chargeDice;
            const isHexed = item.owner.checkCondition("hexed");
            await item.owner.update({
                "data.chargeDice":
                    ownerChargeDice - (item.data.cost + (isHexed ? 1 : 0)),
            });
        }
    }

    let ownerData = item.owner.data.data ?? item.owner.data;

    const ownerStrikeDice = ownerData.strikeDice;
    const ownerActionDice = ownerData.actionDice;
    await item.owner.update({
        "data.strikeDice": ownerStrikeDice - dialogOptions.strikeDice,
    });
    await item.owner.update({
        "data.actionDice": ownerActionDice - dialogOptions.actionDice,
    });
}

function checkItemResult(targetDefense, successes) {
    let returnValue = {
        hit: false,
        successes: successes,
    };

    if (successes >= targetDefense) returnValue.hit = true;

    return returnValue;
}

function checkCondition(actorData, condition) {
    return actorData.effects.filter((e) => e.label == condition).length > 0;
}
