export async function renderRoll(
    rollResult,
    entityData,
    resultData,
    messageTemplate,
    additionalData,
    isReroll,
    commitCallback,
    dialogOptions,
    itemTargets
) {
    let enableReroll = checkForReroll(entityData.owner);

    if (entityData.type == "skill" && resultData == "total")
        enableReroll = false;

    let renderedRoll = await rollResult.render({
        template: messageTemplate,
        flavor: {
            speaker: ChatMessage.getSpeaker({ alias: entityData.owner.name }),
            entityData: entityData,
            rollResults: rollResult,
            resultData: resultData,
            additionalData: additionalData,
            enableReroll: enableReroll,
            isReroll: isReroll,
            targetNames: entityData.targets
                ? entityData.targets.map((i) => i.name)
                : [],
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
            itemTargets: itemTargets,
            reroll: false,
            commit: false,
            tokenId: entityData.owner.token ? entityData.owner.token.id : null,
            actorId: entityData.owner.id ?? entityData.owner._id,
        },
    };

    await rollResult.toMessage(messageData);

    if (!enableReroll && commitCallback)
        commitCallback(resultData, entityData, dialogOptions, itemTargets);

    setTimeout(() => game.combats.apps[0].render(false), 300);
}

export async function getManeuverRollOptions(item) {
    const template =
        "systems/animaprime/templates/dialogs/dialog-maneuverroll/dialog-maneuverroll.hbs";

    const html = await renderTemplate(template, item);

    return new Promise((resolve) => {
        const dialogOptions = {
            width: 400,
            height: 140,
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

export function checkSkillSuccess(results, disadvantage = false) {
    var total = 0;
    var partial = 0;
    var failure;
    for (let i of results) {
        if (i.result >= 5) total++;
        if (i.result >= 3) partial++;
        if (i.result < 3) failure++;
    }
    if (!disadvantage) {
        if (total) return "total";
        else if (partial) return "partial";
        else return "failure";
    } else {
        if (failure) return "failure";
        else if (partial) return "partial";
        else return "total";
    }
}

export function checkForReroll(owner) {
    if (owner.type != "character") return false;

    const ownerData = owner.system;

    const traits = ownerData.traits;
    return traits.trait1.marked || traits.trait2.marked || traits.trait3.marked;
}
