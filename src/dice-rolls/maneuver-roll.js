import * as DiceRolls from "./dice-rolls.js";

export async function maneuverRoll(maneuver, isReroll = false, dialogOptions) {
    const messageTemplate =
        "systems/animaprime/templates/rolls/roll-maneuver/roll-maneuver.hbs";

    let maneuverDice = parseInt(maneuver.system.roll.replace("d"));
    const isQuickened = maneuver.owner.checkCondition("quickened");
    const isSlowed = maneuver.owner.checkCondition("slowed");

    if (isQuickened) {
        maneuverDice += 1;
    }

    // dialog
    if (!dialogOptions) {
        if (maneuver.owner.type == "character") {
            let itemForDialog = {
                ...maneuver,
                type: maneuver.type,
            };

            dialogOptions = await DiceRolls.getManeuverRollOptions(
                itemForDialog
            );
            if (dialogOptions.cancelled) return;
        } else {
            dialogOptions = { maneuverStyle: "regular" };
        }
    }

    if (dialogOptions.maneuverStyle == "reckless") {
        maneuverDice += 2;
    }

    const rollFormula = maneuverDice + "d6";

    const rl = new Roll(rollFormula, maneuver);
    const rollResult = await rl.evaluate({ async: true });

    const resultData = checkManeuverResult(
        maneuver.system.gain,
        rollResult.dice[0].results,
        isSlowed
    );

    let quickenedDie = null;
    if (isQuickened) {
        quickenedDie = rollResult.dice[0].results.pop();
    }

    let recklessDice = [];
    if (dialogOptions.maneuverStyle == "reckless") {
        recklessDice.push(rollResult.dice[0].results.pop());
        recklessDice.push(rollResult.dice[0].results.pop());
    }

    let slowedDie = null;
    if (isSlowed) {
        slowedDie = rollResult.dice[0].results.splice(
            resultData.slowedDie,
            1
        )[0];
    }

    await DiceRolls.renderRoll(
        rollResult,
        maneuver,
        resultData,
        messageTemplate,
        {
            isQuickened: isQuickened,
            quickenedDie: quickenedDie,
            recklessDice: recklessDice,
            isSlowed: isSlowed,
            slowedDie: slowedDie,
            maneuverStyle: dialogOptions.maneuverStyle,
            isRegular: dialogOptions.maneuverStyle == "regular",
            isAggressive: dialogOptions.maneuverStyle == "aggressive",
            isCunning: dialogOptions.maneuverStyle == "cunning",
            isDefensive: dialogOptions.maneuverStyle == "defensive",
            isHeroic: dialogOptions.maneuverStyle == "heroic",
            isReckless: dialogOptions.maneuverStyle == "reckless",
            isSupportive: dialogOptions.maneuverStyle == "supportive",
        },
        isReroll,
        this.commitResults,
        dialogOptions
    );
}

function checkManeuverResult(maneuverGain, results, isSlowed) {
    let strikeGain = 0;
    let chargeGain = 0;
    let strikeIndexes = [];
    let chargeIndexes = [];

    let slowedFlag = false;
    let slowedDie = 0;
    for (let i = 0; i < results.length; i++) {
        if (maneuverGain["r" + results[i].result] == 1) {
            if (isSlowed && !slowedFlag) {
                slowedDie = i;
                slowedFlag = true;
            } else {
                strikeGain++;
                results[i].strike = true;
            }
        } else if (maneuverGain["r" + results[i].result] == 2) {
            if (isSlowed && !slowedFlag) {
                slowedDie = i;
                slowedFlag = true;
            } else {
                chargeGain++;
                results[i].charge = true;
            }
        }
    }

    return {
        strike: strikeGain,
        charge: chargeGain,
        slowedDie: slowedDie,
    };
}

export async function commitResults(resultData, item, dialogOptions) {
    const ownerStrikeDice = item.owner.system.strikeDice;
    const ownerChargeDice = item.owner.system.chargeDice;

    switch (dialogOptions.maneuverStyle) {
        case "aggressive":
            resultData.strike += 1;
            break;
        case "defensive":
            await item.owner.update({
                "system.threatDice": Math.max(
                    item.owner.system.threatDice - 1,
                    0
                ),
            });
            break;
        case "reckless":
            await item.owner.update({
                "system.threatDice": item.owner.system.threatDice + 1,
            });
            break;
    }

    await item.owner.update({
        "system.strikeDice": ownerStrikeDice + resultData.strike,
    });

    await item.owner.update({
        "system.chargeDice": ownerChargeDice + resultData.charge,
    });
}
