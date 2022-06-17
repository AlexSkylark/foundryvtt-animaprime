import * as DiceRolls from "./dice-rolls.js";

export async function maneuverRoll(maneuver, isReroll = false) {
    const messageTemplate =
        "systems/animaprime/templates/rolls/roll-maneuver/roll-maneuver.hbs";

    let maneuverDice = parseInt(maneuver.data.roll.replace("d"));
    const isQuickened = maneuver.owner.checkCondition("quickened");
    const isSlowed = maneuver.owner.checkCondition("slowed");

    if (isQuickened) {
        maneuverDice += 1;
    }

    const rollFormula = maneuverDice + 1 + "d6";

    const rollResult = await new Roll(rollFormula, maneuver).roll();
    const resultData = checkManeuverResult(
        maneuver.data.gain,
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

export async function commitResults(ownerId, resultData, item) {
    let owner =
        game.scenes.active.tokens.get(ownerId) ?? game.actors.get(ownerId);

    const ownerStrikeDice = owner.data.data.strikeDice;
    const ownerChargeDice = owner.data.data.chargeDice;

    await owner.update({
        "data.strikeDice": ownerStrikeDice + resultData.strike,
    });

    await owner.update({
        "data.chargeDice": ownerChargeDice + resultData.charge,
    });
}
