import * as DiceRolls from "./dice-rolls.js";

export async function maneuverRoll(maneuver, isReroll = false) {
    const messageTemplate =
        "systems/animaprime/templates/rolls/roll-maneuver/roll-maneuver.hbs";

    let maneuverDice = parseInt(maneuver.system.roll.replace("d"));
    const isQuickened = maneuver.owner.checkCondition("quickened");
    const isSlowed = maneuver.owner.checkCondition("slowed");

    if (isQuickened) {
        maneuverDice += 1;
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
            isSlowed: isSlowed,
            slowedDie: slowedDie,
        },
        isReroll,
        this.commitResults
    );
}

function checkManeuverResult(maneuverGain, results, isSlowed) {
    let strikeGain = 0;
    let chargeGain = 0;

    let slowedFlag = false;
    let slowedDie = 0;
    for (let i = 0; i < results.length; i++) {
        if (maneuverGain["r" + results[i].result] == 1) {
            if (isSlowed && !slowedFlag) {
                slowedDie = i;
                slowedFlag = true;
            } else {
                strikeGain++;
            }
        } else if (maneuverGain["r" + results[i].result] == 2) {
            if (isSlowed && !slowedFlag) {
                slowedDie = i;
                slowedFlag = true;
            } else {
                chargeGain++;
            }
        }
    }

    return { strike: strikeGain, charge: chargeGain, slowedDie: slowedDie };
}

export async function commitResults(resultData, item) {
    const ownerStrikeDice = item.owner.system.strikeDice;
    const ownerChargeDice = item.owner.system.chargeDice;

    await item.owner.update({
        "system.strikeDice": ownerStrikeDice + resultData.strike,
    });

    await item.owner.update({
        "system.chargeDice": ownerChargeDice + resultData.charge,
    });
}
