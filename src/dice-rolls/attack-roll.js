import * as DiceRolls from "./dice-rolls.js";
import * as ScriptEngine from "../AnimaPrimeScriptEngine.js";

export async function attackRoll(item, isReroll = false, dialogOptions, previousRolls) {
    // HTML template
    const messageTemplate = `systems/animaprime/templates/rolls/roll-${item.type}/roll-${item.type}.hbs`;

    const isEmpowered = item.owner.checkCondition("empowered") && item.type == "strike";
    const isWeakened = item.owner.checkCondition("weakened") && item.type == "strike";
    const isSupported = item.owner.checkCondition("supported");

    const ownerData = item.owner.system;

    item.originalItemTargets = duplicate(item.targets);
    // validations
    if (item.type == "strike") {
        item.targets = item.targets.filter((i) => {
            return i.type == "character" || i.type == "adversity" || i.type == "ally" || i.type == "vehicle";
        });
    } else if (item.type == "achievement") {
        item.targets = item.targets.filter((i) => {
            return i.type == "goal";
        });
    }

    if (!item.targets || !item.targets.length || item.targets.length != item.originalItemTargets.length) {
        ui.notifications.error(`Please select suitable targets for the <i>"${item.name}"</i> ${item.type} action. Targets de-selected`);
        game.user.updateTokenTargets([]);
        return;
    }

    if (item.targets.length > (item.system.targets ?? 1)) {
        ui.notifications.error(((item.system.targets ?? 1) == 1 ? `Too many targets! the <i>"${item.name}"</i> ${item.type} action is single-target.` : `Too many targets! the <i>"${item.name}"</i> ${item.type} action can hit ${item.system.targets} targets at most.`) + " Targets de-selected");
        game.user.updateTokenTargets([]);
        return;
    }

    let itemFixedOptions = [];
    for (let i = 0; i < item.targets.length; i++) {
        let targetData = item.targets[i].system;

        // options for item type
        itemFixedOptions.push({
            variableDiceName: item.type == "strike" ? "Threat Dice" : "Progress Dice",
            variableDiceValue: item.type == "strike" ? targetData.threatDice : targetData.progressDice,
            defenseAttribute: item.type == "strike" ? targetData.defense : targetData.difficulty,
        });
    }

    let successModifier = 0;
    if (item.system.roll.indexOf("+") >= 0)
        successModifier = parseInt(item.system.roll.split("d")[1].replace("+", "").replace("-", ""));

    // dialog
    if (!dialogOptions) {
        dialogOptions = [];
        let dialogPromises = [];

        for (let i = 0; i < item.targets.length; i++) {
            let itemForDialog = {
                ...item,
                maxStrikeDice: Math.min(ownerData.strikeDice, item.system.sdl),
                maxActionDice: Math.min(2, ownerData.actionDice),
                damageType: item.system.damage,
                rollModifier: successModifier,
                maxVariableDice: itemFixedOptions[i].variableDiceValue,
                variableDiceName: itemFixedOptions[i].variableDiceName,
                type: item.type,
                targetType: item.targets[i].type,
                targetName: item.targets[i].name,
                targetId: item.targetIds[i],
            };
            dialogOptions.push({});
            dialogPromises.push(
                DiceRolls.getItemRollOptions(itemForDialog, item.targetIds[i]).then((result) => {
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



    for (let i = 0; i < item.targets.length; i++) {
        const resistance = item.targets[i].items.filter((it) => it.type == "resistance" && dialogOptions[i].damageType.toUpperCase().indexOf(it.name.toUpperCase()) >= 0);
        if (resistance.length) {
            dialogOptions[i].resistance = parseInt(resistance[0].system.rating);
        }
    }

    const abilityDice = [];
    await dialogOptions.forEach((options) => {
        abilityDice.push(parseInt(item.system.roll.split("d")[0]) * options.weakness);
    });

    let splittedResults = [];
    let rollResults = [];
    let resultData = [];
    for (let i = 0; i < item.targets.length; i++) {

        successModifier = dialogOptions[i].rollModifier;

        // add a bonus dice if supported
        if (isSupported)
            dialogOptions[i].bonusDice += 1;

        //execute scripts for each target
        let scriptBody = ""
        if (game.combats.active.flags.actionBoost?.scriptBeforeResolve) {
            scriptBody = game.combats.active.flags.actionBoost?.scriptBeforeResolve + "\n\n";
        }

        if (item.system.scriptBeforeResolve) {
            scriptBody += item.system.scriptBeforeResolve;
        }

        if (scriptBody) {
            const scriptResult = await ScriptEngine.executeResolveScript(item, item.targets[i], scriptBody);

            // sum script dialog options values with real ones;
            if (scriptResult.dialogOptions) {
                for (let key in dialogOptions[i]) {
                    if (dialogOptions[i].hasOwnProperty(key)) {
                        let val1 = dialogOptions[i][key];
                        let val2 = scriptResult.dialogOptions[key];

                        if (typeof val1 === 'number' && typeof val2 === 'number') {
                            dialogOptions[i][key] = val1 + val2;
                        }
                    }
                }
            }
        }

        // roll execution
        const rollFormula = (abilityDice[i] + dialogOptions[i].strikeDice + dialogOptions[i].actionDice + dialogOptions[i].variableDice + dialogOptions[i].bonusDice - (dialogOptions[i].resistance ?? 0) + (isEmpowered ? 1 : 0)).toString() + "d6";

        const rl = new Roll(rollFormula, item);
        rollResults.push(await rl.evaluate({ async: true }));

        let forceNoHit = false;
        let positiveGoal = true;
        if (item.type == "achievement") {
            // if sabotaging goal
            const targetToken = game.scenes.active.tokens.find((tk) => tk.id == item.targetIds[i])
            positiveGoal = isPositiveGoal(targetToken.disposition, (item.owner.token ?? item.owner.prototypeToken).disposition);
            if (!positiveGoal) {
                forceNoHit = true;

                const naturalDice = abilityDice[i] + dialogOptions[i].strikeDice + dialogOptions[i].actionDice;

                let resultsCopy = JSON.parse(JSON.stringify(rollResults[i].dice[0].results));
                for (let d = naturalDice; d < rollResults[i].dice[0].results.length; d++) {
                    resultsCopy.pop();
                }
                rollResults[i].dice[0].results = JSON.parse(JSON.stringify(resultsCopy));
            }
        }

        let powerScaleDiff = 1;
        if (item.type == "strike") powerScaleDiff = Math.pow(2, parseInt(item.owner.system.powerScale) - parseInt(item.targets[i].system.powerScale));

        let splitRes = DiceRolls.splitRollResult(rollResults[i].dice[0].results, abilityDice[i], dialogOptions[i].strikeDice, dialogOptions[i].actionDice, dialogOptions[i].variableDice, dialogOptions[i].bonusDice, dialogOptions[i].resistance, successModifier, isEmpowered, isWeakened, positiveGoal, powerScaleDiff);

        let itemSux = DiceRolls.checkSuccess(rollResults[i].dice[0].results, isWeakened * -1);

        let itemSuxOriginal = JSON.parse(JSON.stringify(itemSux));
        let successModifierOriginal = JSON.parse(JSON.stringify(successModifier));
        if (item.type == "strike") {
            itemSux = Math.floor(itemSux * powerScaleDiff);
            successModifier = Math.floor(successModifier * powerScaleDiff);
            if (powerScaleDiff > 1) {
                for (let i = itemSuxOriginal + successModifierOriginal; i < itemSux + successModifier; i++) {
                    splitRes.scaleDice.push(rollResults[0].dice[0].results[0]);
                }
            }
        }
        let vGain = DiceRolls.checkVariableGain(splitRes, powerScaleDiff);
        let itemRes = checkItemResult(itemFixedOptions[i].defenseAttribute - (item.type == "achievement" ? 1 : 0), itemSux, vGain, successModifier, powerScaleDiff, forceNoHit);

        splittedResults.push(splitRes);
        resultData.push(itemRes);
    }

    // chat message rendering
    await DiceRolls.renderRoll(rollResults, item, resultData, messageTemplate, splittedResults, isReroll, this.commitResults, dialogOptions, item.targetId, previousRolls);
}

function isPositiveGoal(goalType, ownerType) {
    if (goalType == ownerType) return true;
    else return false;
}

export async function checkDialogs(userTargets, options) {
    let allDone = [];

    while (allDone.filter((x) => x == true).length < userTargets) {
        allDone = [];
        for (let o = 0; o < options.length; o++) allDone.push(await isDialogResolved(options[o]));
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
    return new Promise((done) => setTimeout(() => done(returnValue), milliseconds));
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
        const isHexed = item.owner.checkCondition("hexed");
        await item.owner.update({
            "system.chargeDice": ownerData.chargeDice - (item.system.cost + (isHexed ? 1 : 0)),
        });
    }
}

function checkItemResult(targetDefense, successes, variableGain, successModifier, powerScaleDiff, forceNoHit = false) {
    let returnValue = {
        hit: false,
        successes: successes,
        variableGain: variableGain,
        wounds: 1,
    };

    if (!forceNoHit) {
        let totalSux = successes + successModifier;
        if (totalSux > targetDefense) returnValue.hit = true;

        if (powerScaleDiff > 1) returnValue.wounds = Math.floor(totalSux / targetDefense);
    }

    return returnValue;
}


