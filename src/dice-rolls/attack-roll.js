import * as DiceRolls from "./dice-rolls.js";

export async function attackRoll(
    item,
    isReroll = false,
    dialogOptions,
    previousRolls
) {
    // HTML template
    const messageTemplate = `systems/animaprime/templates/rolls/roll-${item.type}/roll-${item.type}.hbs`;

    const isEmpowered =
        checkCondition(item.owner, "empowered") && item.type == "strike";
    const isWeakened =
        checkCondition(item.owner, "weakened") && item.type == "strike";
    const isHexed = checkCondition(item.owner, "hexed");

    const ownerData = item.owner.system;

    item.originalItemTargets = duplicate(item.targets);
    // validations
    if (item.type == "strike") {
        item.targets = item.targets.filter((i) => {
            return (
                i.type == "character" ||
                i.type == "adversity" ||
                i.type == "hazard"
            );
        });
    } else if (item.type == "achievement") {
        item.targets = item.targets.filter((i) => {
            return i.type == "goal";
        });
    }

    if (
        !item.targets ||
        !item.targets.length ||
        item.targets.length != item.originalItemTargets.length
    ) {
        ui.notifications.error(
            `Please select suitable targets for the <i>"${item.name}"</i> ${item.type} action.`
        );
        return;
    }

    if (item.targets.length > (item.system.targets ?? 1)) {
        ui.notifications.error(
            (item.system.targets ?? 1) == 1
                ? `Too many targets! the <i>"${item.name}"</i> ${item.type} action is single-target.`
                : `Too many targets! the <i>"${item.name}"</i> ${item.type} action can hit ${item.system.targets} targets at most.`
        );
        return;
    }

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

    let itemFixedOptions = [];
    for (let i = 0; i < item.targets.length; i++) {
        let targetData = item.targets[i].system;

        // options for item type
        itemFixedOptions.push({
            variableDiceName:
                item.type == "strike" ? "Threat Dice" : "Progress Dice",
            variableDiceValue:
                item.type == "strike"
                    ? targetData.threatDice
                    : targetData.progressDice,
            defenseAttribute:
                item.type == "strike"
                    ? targetData.defense
                    : targetData.difficulty,
        });
    }

    // dialog
    if (!dialogOptions) {
        dialogOptions = [];
        let dialogPromises = [];

        for (let i = 0; i < item.targets.length; i++) {
            let itemForDialog = {
                ...item,
                maxStrikeDice: Math.min(ownerData.strikeDice, item.system.sdl),
                maxActionDice: Math.min(2, ownerData.actionDice),
                maxVariableDice: itemFixedOptions[i].variableDiceValue,
                variableDiceName: itemFixedOptions[i].variableDiceName,
                type: item.type,
                targetName: item.targets[i].name,
                targetId: item.targetIds[i],
            };
            dialogOptions.push({});
            dialogPromises.push(
                DiceRolls.getItemRollOptions(itemForDialog).then((result) => {
                    dialogOptions[i] = result;
                })
            );
        }

        await checkDialogs(item.targets.length, dialogPromises);

        if (dialogOptions.some((x) => x.cancelled)) return;
    }

    await dialogOptions.forEach((options) => {
        if (options.cancelled) return;
        if (!options.weakness) options.weakness = 1;
    });

    const abilityDice = [];
    await dialogOptions.forEach((options) => {
        abilityDice.push(
            parseInt(item.system.roll.split("d")[0]) * options.weakness
        );
    });

    let successModifier = 0;
    if (item.system.roll.indexOf("+") >= 0)
        successModifier = parseInt(
            item.system.roll.split("d")[1].replace("+", "").replace("-", "")
        );

    let splittedResults = [];
    let rollResults = [];
    let resultData = [];
    for (let i = 0; i < item.targets.length; i++) {
        // roll execution
        const rollFormula =
            (
                abilityDice[i] +
                dialogOptions[i].strikeDice +
                dialogOptions[i].actionDice +
                dialogOptions[i].variableDice +
                dialogOptions[i].bonusDice -
                dialogOptions[i].resistance +
                (isEmpowered ? 1 : 0)
            ).toString() + "d6";

        const rl = new Roll(rollFormula, item);
        rollResults.push(await rl.evaluate({ async: true }));

        resultData.push(
            checkItemResult(
                itemFixedOptions[i].defenseAttribute,
                DiceRolls.checkSuccess(
                    rollResults[i].dice[0].results,
                    successModifier + isWeakened * -1
                )
            )
        );

        splittedResults.push(
            DiceRolls.splitRollResult(
                rollResults[i].dice[0].results,
                abilityDice[i],
                dialogOptions[i].strikeDice,
                dialogOptions[i].actionDice,
                dialogOptions[i].variableDice,
                dialogOptions[i].bonusDice,
                dialogOptions[i].resistance,
                successModifier,
                isEmpowered,
                isWeakened
            )
        );
    }

    // chat message rendering
    await DiceRolls.renderRoll(
        rollResults,
        item,
        resultData,
        messageTemplate,
        splittedResults,
        isReroll,
        this.commitResults,
        dialogOptions,
        item.targetId,
        previousRolls
    );
}

export async function checkDialogs(userTargets, options) {
    let allDone = [];

    while (allDone.filter((x) => x == true).length < userTargets) {
        allDone = [];
        for (let o = 0; o < options.length; o++)
            allDone.push(await isDialogResolved(options[o]));
    }
    return true;
}

async function isDialogResolved(promise) {
    return await Promise.race([
        checkDialogDelay(200, false),
        promise.then(
            () => true,
            () => false
        ),
    ]);
}

async function checkDialogDelay(milliseconds = 0, returnValue) {
    return new Promise((done) =>
        setTimeout(() => done(returnValue), milliseconds)
    );
}

export async function commitResults(resultData, item, dialogOptions) {
    const ownerData = item.owner.system;
    const ownerStrikeDice = ownerData.strikeDice;
    const ownerActionDice = ownerData.actionDice;

    let totalStrikeDice = 0;
    let totalActionDice = 0;

    for (let i = 0; i < dialogOptions.length; i++) {
        totalStrikeDice += dialogOptions[i].strikeDice;
        totalActionDice += dialogOptions[i].actionDice;
    }

    await item.owner.update({
        "system.strikeDice": Math.max(ownerStrikeDice - totalStrikeDice, 0),
    });
    await item.owner.update({
        "system.actionDice": Math.max(ownerActionDice - totalActionDice, 0),
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
