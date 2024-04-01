export async function renderRoll(rollResult, entityData, resultData, messageTemplate, additionalData, isReroll, commitCallback, dialogOptions, itemTarget, reroll) {
    let enableReroll = checkForReroll(entityData.owner);

    if (entityData.type == "skill" && resultData == "total") enableReroll = false;

    if (enableReroll && !reroll) {
        reroll = generateIdString();
    }

    const targetNames = entityData.targets ? entityData.targets.map((x) => x.name) : [];

    let targetData = [];

    for (let i = 0; i < rollResult.length; i++) {
        targetData.push({
            rollsId: generateIdString(),
            additionalData: additionalData[i],
            rollResult: rollResult[i],
            resultData: resultData[i],
            targetName: targetNames[i],
        });
    }

    var chatMessageUniqueId = generateIdString();

    let renderedRoll = await rollResult[0].render({
        template: messageTemplate,
        flavor: {
            rollsId: chatMessageUniqueId,
            speaker: ChatMessage.getSpeaker({ alias: entityData.owner.name }),
            entityData: entityData,
            enableReroll: enableReroll,
            isReroll: isReroll,
            targetData: targetData,
            resultData: resultData,
        },
    });

    // sort dice rolls;
    await targetData.forEach((target) => {
        renderedRoll = sortDiceRolls(renderedRoll, target.rollsId);
    });

    let messageData = {
        speaker: ChatMessage.getSpeaker({ alias: entityData.owner.name }),
        content: renderedRoll,
        flags: {
            rollsId: chatMessageUniqueId,
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

    const chatMessage = await rollResult[0].toMessage(messageData);

    if (!enableReroll && commitCallback) {
        if (game.dice3d) await game.dice3d.waitFor3DAnimationByMessageID(chatMessage.id);

        await commitCallback(resultData, entityData, dialogOptions, itemTarget);
    }
}

function sortDiceRolls(renderedRoll, chatMessageUniqueId) {
    var elems = $(".rolls-" + chatMessageUniqueId + " li", renderedRoll)
        .not(".outside-dice")
        .detach()
        .sort(function (a, b) {
            return $(a).find(".roll-dice").html() < $(b).find(".roll-dice").html() ? 1 : $(a).find(".roll-dice").html() > $(b).find(".roll-dice").html() ? -1 : 0;
        });

    var htmlToModify = $("<div>" + renderedRoll + "</div>");
    htmlToModify
        .find(".rolls-" + chatMessageUniqueId + " li")
        .not(".outside-dice")
        .not(":last")
        .replaceWith("");
    htmlToModify
        .find(".rolls-" + chatMessageUniqueId + " li")
        .not(".outside-dice")
        .replaceWith(elems);
    return htmlToModify.html();
}

function generateIdString() {
    length = 12;
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

export async function getManeuverRollOptions(item) {
    const template = "systems/animaprime/templates/dialogs/dialog-maneuverroll/dialog-maneuverroll.hbs";

    const html = await renderTemplate(template, item);

    return new Promise((resolve) => {
        const dialogOptions = {
            width: 400,
            height: 230,
            classes: ["window-dialog"],
        };

        const data = {
            title: item.type.charAt(0).toUpperCase() + item.type.slice(1) + " Roll",
            content: html,
            buttons: {
                cancel: {
                    label: '<i class="fas fa-x"></i> Cancel',
                    callback: (html) => resolve({ cancelled: true }),
                },
                normal: {
                    label: '<i class="fas fa-check"></i> Confirm',
                    callback: (html) =>
                        resolve({
                            maneuverStyle: html[0].querySelector("form").maneuverStyle.value,
                        }),
                },
            },
            default: "normal",
            close: () => resolve({ cancelled: true }),
        };

        new Dialog(data, dialogOptions).render(true);
    });
}

export async function getItemRollOptions(item, targetId) {
    const template = "systems/animaprime/templates/dialogs/dialog-itemroll/dialog-itemroll.hbs";

    const html = await renderTemplate(template, item);

    return new Promise((resolve) => {
        const dialogOptions = {
            width: 440,
            height: item.owner.type == "character" ? 368 : 304,
            classes: ["window-dialog", "window-dialog-itemroll", `window-target-${targetId}`],
        };

        const data = {
            title: item.type.charAt(0).toUpperCase() + item.type.slice(1) + " Roll - Target: " + item.targetName,
            content: html,
            buttons: {
                cancel: {
                    label: '<i class="fas fa-x"></i> Cancel',
                    callback: (html) => resolve({ cancelled: true }),
                },
                normal: {
                    label: '<i class="fas fa-check"></i> Confirm',
                    callback: (html) => resolve(processRollOptions(html[0].querySelector("form"), item.maxVariableDice)),
                },
            },
            default: "normal",
            close: () => resolve({ cancelled: true }),
        };

        new Dialog(data, dialogOptions).render(true);
    });
}

export async function getConfirmEndOfTurn(actor) {
    const actorIdByCombat = game.combats.active.getCurrentCombatant().actorId;
    const actorIdByInterface = ui.combat.getCurrentTurnToken().actorId;
    const actorIdParameter = actor.id ?? actor._id;

    if (actorIdByCombat == actorIdParameter || actorIdByInterface == actorIdParameter) {
        const endTurnDialogResult = await confirmEndTurnDialog();
        if (endTurnDialogResult.confirmed) {
            if (game.user.isGM) {
                await ui.combat.performEndTurn();
            } else {
                game.socket.emit("system.animaprime", {
                    operation: "endTurn",
                    id: game.combats.active.getCurrentCombatant().id,
                });
            }
        }
    }
}

async function confirmEndTurnDialog() {
    const template = "systems/animaprime/templates/dialogs/dialog-endturn/dialog-endturn.hbs";

    const html = await renderTemplate(template);

    return new Promise((resolve) => {
        const dialogOptions = {
            width: 310,
            height: 167,
            classes: ["window-dialog"],
        };

        const data = {
            title: "Confirm End Turn",
            content: html,
            buttons: {
                cancel: {
                    label: '<i class="fas fa-x"></i> Cancel',
                    callback: (html) => resolve({ cancelled: true }),
                },
                normal: {
                    label: '<i class="fas fa-check"></i> Confirm',
                    callback: (html) => resolve({ confirmed: true }),
                },
            },
            default: "normal",
            close: () => resolve({ cancelled: true }),
        };

        new Dialog(data, dialogOptions).render(true);
    });
}

export function processRollOptions(form, variableMax) {
    return {
        strikeDice: parseInt(form.strikeDice?.value ?? 0),
        actionDice: parseInt(form.actionDice?.value ?? 0),
        variableDice: variableMax,
        bonusDice: parseInt(form.bonusDice?.value ?? 0),
        rollModifier: parseInt(form.rollModifier?.value ?? 0),
        weakness: parseInt(form.weakness?.checked ? 2 : 1) ?? 1,
        damageType: form.damageType?.value ?? "physical"
    };
}

export function splitRollResult(results, regular, strike = 0, action = 0, variable = 0, bonus = 0, resistance = 0, successModifier = 0, isEmpowered = false, isWeakened = false, positiveGoal = true, powerScaleDiff = 1) {
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
        scaleDice: [],
        scaleReductionDice: [],
    };

    for (let i = 0; i < regular; i++) diceTypeArray.push("abilityDice");
    for (let i = 0; i < strike; i++) diceTypeArray.push("strikeDice");
    for (let i = 0; i < action; i++) diceTypeArray.push("actionDice");
    if (positiveGoal) {
        for (let i = 0; i < variable; i++) diceTypeArray.push("variableDice");
        for (let i = 0; i < bonus; i++) diceTypeArray.push("bonusDice");
        if (isEmpowered) diceTypeArray.push("empoweredDice");
    }

    if (powerScaleDiff < 1) {
        let sux = 0;
        for (let s = 0; s < results.length; s++) {
            if (results[s].result >= 3) sux++;
        }
        let adjustedSux = Math.floor(sux * powerScaleDiff);
        let suxReduction = sux - adjustedSux;

        let suxAdjusted = 0;
        let suxReductionPointer = diceTypeArray.length - 1;
        while (suxAdjusted < suxReduction) {
            if (results[suxReductionPointer].result >= 3) {
                diceTypeArray[suxReductionPointer] = "scaleReductionDice";
                suxAdjusted++;
            }
            suxReductionPointer--;
        }
    }

    if (isWeakened)
        for (let w = diceTypeArray.length - 1 - resistance; w > -1; w--) {
            if (results[w].result >= 3) {
                returnArray.weakenedDice.push(results[w]);
                diceTypeArray.splice(w, 1);
                break;
            }
        }

    for (let i = 0; i < diceTypeArray.length - resistance; i++) {
        if (diceTypeArray[i] == "abilityDice") returnArray.abilityDice.push(results[i]);
        if (diceTypeArray[i] == "strikeDice") returnArray.strikeDice.push(results[i]);
        if (diceTypeArray[i] == "actionDice") returnArray.actionDice.push(results[i]);
        if (diceTypeArray[i] == "variableDice") returnArray.variableDice.push(results[i]);
        if (diceTypeArray[i] == "bonusDice") returnArray.bonusDice.push(results[i]);
        if (diceTypeArray[i] == "empoweredDice") returnArray.empoweredDice.push(results[i]);
        if (diceTypeArray[i] == "scaleReductionDice") returnArray.scaleReductionDice.push(results[i]);
    }

    for (let i = 0; i < Math.min(resistance, results.length); i++) {
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

export function checkVariableGain(splitResults, powerScaleDiff) {
    let variableGain = 0;

    for (let i of splitResults.abilityDice) {
        if (i.result >= 3) variableGain++;
    }

    for (let i of splitResults.strikeDice) {
        if (i.result >= 3) variableGain++;
    }

    for (let i of splitResults.actionDice) {
        if (i.result >= 3) variableGain++;
    }

    if (powerScaleDiff > 1) variableGain = Math.floor(variableGain * powerScaleDiff);

    return Math.min(variableGain, Math.floor((splitResults.abilityDice.length + 1) * powerScaleDiff));
}

export function checkForReroll(owner) {
    if (owner.type != "character") return false;

    return owner.system.reroll > 0;
}
