export async function renderRoll(
    rollResult,
    entityData,
    resultData,
    messageTemplate,
    additionalData,
    isReroll,
    commitCallback,
    dialogOptions,
    itemTarget,
    reroll
) {
    let enableReroll = checkForReroll(entityData.owner);

    if (entityData.type == "skill" && resultData == "total")
        enableReroll = false;

    if (enableReroll && !reroll) {
        reroll = generateIdString();
    }

    const targetNames = entityData.targets
        ? entityData.targets.map((x) => x.name)
        : [];

    let targetData = [];

    /*
    if (entityData.type == "skill")
        targetData.push({
            additionalData: additionalData[0],
            rollResult: rollResult[0],
            resultData: resultData[0],
        });*/

    for (let i = 0; i < rollResult.length; i++) {
        targetData.push({
            additionalData: additionalData[i],
            rollResult: rollResult[i],
            resultData: resultData[i],
            targetName: targetNames[i],
        });
    }

    let renderedRoll = await rollResult[0].render({
        template: messageTemplate,
        flavor: {
            speaker: ChatMessage.getSpeaker({ alias: entityData.owner.name }),
            entityData: entityData,
            enableReroll: enableReroll,
            isReroll: isReroll,
            targetData: targetData,
        },
    });

    let messageData = {
        speaker: ChatMessage.getSpeaker({ alias: entityData.owner.name }),
        content: renderedRoll,
        flags: {
            sourceItem: entityData,
            resultData: resultData,
            additionalData: additionalData,
            dialogOptions: dialogOptions,
            itemTarget: itemTarget,
            enableReroll: enableReroll,
            reroll: false,
            commit: false,
            tokenId: entityData.owner.token ? entityData.owner.token.id : null,
            actorId: entityData.owner.id ?? entityData.owner._id,
            reroll: reroll,
        },
    };

    await rollResult[0].toMessage(messageData);

    if (!enableReroll && commitCallback)
        await commitCallback(resultData, entityData, dialogOptions, itemTarget);

    setTimeout(() => ui.combat.render(), 500);
}

function generateIdString() {
    length = 12;
    let result = "";
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
        counter += 1;
    }
    return result;
}

export async function getManeuverRollOptions(item) {
    const template =
        "systems/animaprime/templates/dialogs/dialog-maneuverroll/dialog-maneuverroll.hbs";

    const html = await renderTemplate(template, item);

    return new Promise((resolve) => {
        const dialogOptions = {
            width: 400,
            height: 180,
        };

        const data = {
            title:
                item.type.charAt(0).toUpperCase() +
                item.type.slice(1) +
                " Roll",
            content: html,
            buttons: {
                cancel: {
                    label: "Cancel",
                    callback: (html) => resolve({ cancelled: true }),
                },
                normal: {
                    label: "Confirm",
                    callback: (html) =>
                        resolve({
                            maneuverStyle:
                                html[0].querySelector("form").maneuverStyle
                                    .value,
                            supportDie:
                                html[0].querySelector("form").supportDie
                                    .checked,
                        }),
                },
            },
            default: "normal",
            close: () => resolve({ cancelled: true }),
        };

        new Dialog(data, dialogOptions).render(true);
    });
}

export async function getSkillRollOptions(item) {
    const template =
        "systems/animaprime/templates/dialogs/dialog-skillroll/dialog-skillroll.hbs";

    const html = await renderTemplate(template, item);

    return new Promise((resolve) => {
        const dialogOptions = {
            width: 280,
            height: 245,
        };

        const data = {
            title:
                item.type.charAt(0).toUpperCase() +
                item.type.slice(1) +
                " Roll",
            content: html,
            buttons: {
                cancel: {
                    label: "Cancel",
                    callback: (html) => resolve({ cancelled: true }),
                },
                normal: {
                    label: "Confirm",
                    callback: (html) =>
                        resolve({
                            difficulty:
                                html[0].querySelector("form").difficulty.value,
                        }),
                },
            },
            default: "normal",
            close: () => resolve({ cancelled: true }),
        };

        new Dialog(data, dialogOptions).render(true);
    });
}

export async function getItemRollOptions(item) {
    const template =
        "systems/animaprime/templates/dialogs/dialog-itemroll/dialog-itemroll.hbs";

    const html = await renderTemplate(template, item);

    return new Promise((resolve) => {
        const dialogOptions = {
            width: 600,
            height: 255,
        };

        const data = {
            title:
                item.type.charAt(0).toUpperCase() +
                item.type.slice(1) +
                " Roll - Target: " +
                item.targetName,
            content: html,
            buttons: {
                cancel: {
                    label: "Cancel",
                    callback: (html) => resolve({ cancelled: true }),
                },
                normal: {
                    label: "Confirm",
                    callback: (html) =>
                        resolve(
                            processRollOptions(html[0].querySelector("form"))
                        ),
                },
            },
            default: "normal",
            close: () => resolve({ cancelled: true }),
        };

        new Dialog(data, dialogOptions).render(true);
    });
}

export function processRollOptions(form) {
    return {
        strikeDice: parseInt(form.strikeDice?.value ?? 0),
        actionDice: parseInt(form.actionDice?.value ?? 0),
        variableDice: parseInt(form.variableDice?.value ?? 0),
        bonusDice: parseInt(form.bonusDice?.value ?? 0),
        weakness: parseInt(form.weakness?.value ?? 0),
        resistance: parseInt(form.resistance?.value ?? 0),
    };
}

export function splitRollResult(
    results,
    regular,
    strike = 0,
    action = 0,
    variable = 0,
    bonus = 0,
    resistance = 0,
    successModifier = 0,
    isEmpowered = false,
    isWeakened = false
) {
    let diceTypeArray = [];
    let returnArray = {
        abilityDice: [],
        strikeDice: [],
        actionDice: [],
        variableDice: [],
        bonusDice: [],
        resistanceDice: [],
        successDice: [],
        empoweredDice: [],
        weakenedDice: [],
    };

    for (let i = 0; i < regular; i++) diceTypeArray.push("abilityDice");
    for (let i = 0; i < strike; i++) diceTypeArray.push("strikeDice");
    for (let i = 0; i < action; i++) diceTypeArray.push("actionDice");
    for (let i = 0; i < variable; i++) diceTypeArray.push("variableDice");
    for (let i = 0; i < bonus; i++) diceTypeArray.push("bonusDice");
    if (isEmpowered) diceTypeArray.push("empoweredDice");

    let weakenedFlag = false;
    for (let i = resistance; i < diceTypeArray.length; i++) {
        if (
            isWeakened &&
            !weakenedFlag &&
            results[i - resistance].result >= 3
        ) {
            returnArray.weakenedDice.push(results[0]);
            weakenedFlag = true;
            continue;
        }
        if (diceTypeArray[i] == "abilityDice")
            returnArray.abilityDice.push(results[i - resistance]);
        if (diceTypeArray[i] == "strikeDice")
            returnArray.strikeDice.push(results[i - resistance]);
        if (diceTypeArray[i] == "actionDice")
            returnArray.actionDice.push(results[i - resistance]);
        if (diceTypeArray[i] == "variableDice")
            returnArray.variableDice.push(results[i - resistance]);
        if (diceTypeArray[i] == "bonusDice")
            returnArray.bonusDice.push(results[i - resistance]);
        if (diceTypeArray[i] == "empoweredDice")
            returnArray.empoweredDice.push(results[i - resistance]);
        if (diceTypeArray[i] == "weakenedDice")
            returnArray.weakenedDice.push(results[i - resistance]);
    }

    for (let i = 0; i < resistance; i++) {
        returnArray.resistanceDice.push(results[0]);
    }

    for (let i = 0; i < successModifier; i++) {
        returnArray.successDice.push(results[0]);
    }

    return returnArray;
}

export function checkSuccess(results, successModifier) {
    let successes = 0;

    for (let i of results) {
        if (i.result >= 3) successes++;
    }

    return Math.max(successes + successModifier, 0);
}

export function checkSkillSuccess(results, difficulty) {
    var sux = 0;

    for (let i of results) {
        if (i.result >= difficulty) {
            sux++;
            i.success = true;
        }
    }

    return sux;
}

export function checkForReroll(owner) {
    if (owner.type != "character") return false;

    const ownerData = owner.system;

    const traits = ownerData.traits;
    return traits.trait1.marked || traits.trait2.marked || traits.trait3.marked;
}
