import * as DiceRolls from "./dice-rolls.js";

export async function attackRoll(item, isReroll = false, dialogOptions) {
    // HTML template
    const messageTemplate = `systems/animaprime/templates/rolls/roll-${item.type}/roll-${item.type}.hbs`;

    const isEmpowered =
        checkCondition(item.owner, "empowered") && item.type == "strike";
    const isWeakened =
        checkCondition(item.owner, "weakened") && item.type == "strike";
    const isHexed = checkCondition(item.owner, "hexed");

    const ownerData = item.owner.system;

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

    const targetData = item.targets[0].system;

    if (item.system.cost) {
        const ownerChargeDice = ownerData.chargeDice;
        item.capitalizedType =
            item.type.charAt(0).toUpperCase() + item.type.slice(1);

        if (ownerChargeDice < item.system.cost + (isHexed ? 1 : 0)) {
            ui.notifications.error(
                `Not enough available charge dice to use this ${item.capitalizedType}.`
            );
            return;
        }
    }

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
            maxStrikeDice: Math.min(ownerData.strikeDice, item.system.sdl),
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
        item.system.roll.split("d")[0] * dialogOptions.weakness
    );

    let successModifier = 0;
    if (item.system.roll.indexOf("+") >= 0)
        successModifier = parseInt(
            item.system.roll.split("d")[1].replace("+", "").replace("-", "")
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

    const rl = new Roll(rollFormula, item);
    const rollResult = await rl.evaluate({ async: true });

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
    const ownerData = item.owner.system;
    const ownerStrikeDice = ownerData.strikeDice;
    const ownerActionDice = ownerData.actionDice;

    await item.owner.update({
        "system.strikeDice": ownerStrikeDice - dialogOptions.strikeDice,
    });
    await item.owner.update({
        "system.actionDice": ownerActionDice - dialogOptions.actionDice,
    });

    if (item.system.cost) {
        const ownerChargeDice = ownerData.chargeDice;
        const isHexed = checkCondition(item.owner, "hexed");
        await item.owner.update({
            "system.chargeDice":
                ownerChargeDice - (item.system.cost + (isHexed ? 1 : 0)),
        });
    }
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
