import * as DiceRolls from "./dice-rolls.js";

export async function maneuverRoll(item, isReroll = false, dialogOptions, reroll) {
    const messageTemplate = "systems/animaprime/templates/rolls/roll-maneuver/roll-maneuver.hbs";

    if (isReroll) {
        item.owner = game.scenes.viewed.tokens.get(item.originalOwner.tokenId).actor;
        await item.owner.update(item.originalOwner);
        item.owner.tokenId = item.originalOwner.tokenId;

        let rollTargets = []
        for (let tg of item.originalTargets) {
            let rollTarget = game.scenes.viewed.tokens.get(tg.tokenId).actor;
            await rollTarget.update(tg);
            rollTargets.push(tg);
        }
        item.targets = rollTargets;
    }

    let maneuverDice = parseInt(item.system.roll.replace("d"));
    const isQuickened = item.owner.checkCondition("quickened");
    const isDazed = item.owner.checkCondition("dazed");

    if (isQuickened) {
        maneuverDice += 1;
    }

    // dialog
    if (!dialogOptions) {
        if (item.owner.type == "character") {
            let itemForDialog = {
                ...item,
                type: item.type,
            };

            dialogOptions = await DiceRolls.getManeuverRollOptions(itemForDialog);
            if (dialogOptions.cancelled) return;
        } else {
            dialogOptions = { maneuverStyle: "regular" };
        }
    }

    // snapshot dialog options for rerolls
    item.originalDialogOptions = JSON.parse(JSON.stringify(dialogOptions));

    item.originalTargets = item.targets;
    item.originalOwner = duplicate(item.owner);

    if (!checkManeuverTarget(item, dialogOptions.maneuverStyle)) return;

    if (dialogOptions.maneuverStyle == "reckless") {
        maneuverDice += 2;
    }

    const isSupported = item.owner.checkCondition("supported");

    if (isSupported) {
        maneuverDice += 1;
    }

    const rollFormula = maneuverDice + "d6";

    let rollResult = [];
    const rl = new Roll(rollFormula, item);
    rollResult.push(await rl.evaluate({ async: true }));

    let resultData = [];
    resultData.push(checkManeuverResult(item.system.gain, rollResult[0].dice[0].results, dialogOptions.maneuverStyle == "aggressive"));

    let resultsCopy = JSON.parse(JSON.stringify(rollResult[0].dice[0].results));

    let supportDice = [];
    if (isSupported) {
        supportDice.push(resultsCopy.pop());
    }

    let quickenedDie = null;
    if (isQuickened) {
        quickenedDie = resultsCopy.pop();
    }

    let recklessDice = [];
    if (dialogOptions.maneuverStyle == "reckless") {
        recklessDice.push(resultsCopy.pop());
        recklessDice.push(resultsCopy.pop());
    }

    rollResult[0].dice[0].results = JSON.parse(JSON.stringify(resultsCopy));

    let diceResults = rollResult[0].dice[0].results;

    // take out dazed die
    let dazedDie = null;
    if (isDazed) {
        let indexDazedSuccess = diceResults.findIndex((x) => x.charge || x.strike);

        if (indexDazedSuccess > -1) {
            if (diceResults[indexDazedSuccess].charge) {
                diceResults[indexDazedSuccess].charge = false;
                resultData[0].charge -= 1;
            } else {
                diceResults[indexDazedSuccess].strike = false;
                resultData[0].strike -= 1;
            }

            diceResults[indexDazedSuccess].invisible = true;
            dazedDie = diceResults[indexDazedSuccess];
        }
    }

    rollResult[0].dice[0].results = diceResults;

    // take out defensive die
    let defensiveDie = null;
    if (dialogOptions.maneuverStyle == "defensive") {
        let indexDefensive = diceResults.findIndex((x) => x.strike);
        if (indexDefensive > -1) {
            diceResults[indexDefensive].strike = false;
            diceResults[indexDefensive].invisible = true;
            defensiveDie = diceResults[indexDefensive];
            resultData[0].strike -= 1;
        }
    }

    // turn off supported condition
    if (isSupported) {
        const supportedEffect = CONFIG.statusEffects.find((e) => e.id == "supported");

        const token = item.owner.getActiveTokens()[0];
        token.toggleEffect(supportedEffect, false);
    }

    // is the target of equal disposition to the user?
    const isPositive = !item.targets[0] ?
        true :
        game.scenes.viewed.tokens.find((tk) => tk.id == item.targets[0].tokenId).disposition == (item.owner.token ?? item.owner.prototypeToken).disposition;

    let additionalData = [];
    additionalData.push({
        isQuickened: isQuickened,
        quickenedDie: quickenedDie,
        recklessDice: recklessDice,
        supportDice: supportDice,
        isDazed: isDazed,
        slowedDie: dazedDie,
        defensiveDie: defensiveDie,
        maneuverStyle: dialogOptions.maneuverStyle,
        hasSupportDie: isSupported,
        isPositiveTarget: isPositive,
        isRegular: dialogOptions.maneuverStyle == "regular",
        isAggressive: dialogOptions.maneuverStyle == "aggressive",
        isCunning: dialogOptions.maneuverStyle == "cunning",
        isDefensive: dialogOptions.maneuverStyle == "defensive",
        isMethodical: dialogOptions.maneuverStyle == "methodical",
        isReckless: dialogOptions.maneuverStyle == "reckless",
        isSupportive: dialogOptions.maneuverStyle == "supportive"
    });

    if (item.system.cost) {
        const isHexed = item.owner.checkCondition("hexed");
        await item.owner.update({
            "system.chargeDice": item.owner.system.chargeDice - (item.system.cost + (isHexed ? 1 : 0)),
        });
    }

    await DiceRolls.renderRoll(rollResult, item, resultData, messageTemplate, additionalData, isReroll, item.owner.getActiveTokens()[0].id, dialogOptions, null, reroll);
}

function checkManeuverTarget(maneuver, maneuverStyle) {
    if (maneuverStyle == "cunning" || maneuverStyle == "methodical" || maneuverStyle == "supportive") {

        const originalTargets = duplicate(maneuver.targets);

        if (maneuverStyle == "cunning") {
            maneuver.targets = maneuver.targets.filter((i) => {
                const tokenActor = game.scenes.viewed.tokens.get(i.tokenId).actor;
                return tokenActor.type == "adversity" || tokenActor.type == "vehicle";
            });
        } else if (maneuverStyle == "methodical") {
            maneuver.targets = maneuver.targets.filter((i) => {
                const tokenActor = game.scenes.viewed.tokens.get(i.tokenId).actor;
                return tokenActor.type == "goal";
            });
        } else if (maneuverStyle == "supportive") {
            maneuver.targets = maneuver.targets.filter((i) => {
                const tokenActor = game.scenes.viewed.tokens.get(i.tokenId).actor;
                return tokenActor.type == "character" || tokenActor.type == "ally" || tokenActor.type == "vehicle";
            });
        }

        if (!maneuver.targets || !maneuver.targets.length || maneuver.targets.length != originalTargets.length) {
            ui.notifications.error(`Please select a suitable target when using the <i>"${maneuverStyle.charAt(0).toUpperCase() + maneuverStyle.slice(1)}"</i> maneuver style.`);
            return false;
        }
    }

    return true;
}

function checkManeuverResult(maneuverGain, results, isAggressive) {
    let strikeGain = 0;
    let chargeGain = 0;

    let defensiveFlag = false;
    let defensiveIndex = null;
    let defensiveDie = null;

    for (let i = 0; i < results.length; i++) {
        if (maneuverGain["r" + results[i].result] == 2) {
            chargeGain++;
            results[i].charge = true;
        } else if (maneuverGain["r" + results[i].result] == 1) {
            strikeGain++;
            results[i].strike = true;
        }
    }

    if (isAggressive) strikeGain++;

    return {
        strike: strikeGain,
        charge: chargeGain,
    };
}

