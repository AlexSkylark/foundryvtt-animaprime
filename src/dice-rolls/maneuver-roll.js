import * as DiceRolls from "./dice-rolls.js";

export async function maneuverRoll(
    maneuver,
    isReroll = false,
    dialogOptions,
    reroll
) {
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

    maneuver.targets = [];
    maneuver.targetIds = [];
    await game.user.targets.forEach((element) => {
        maneuver.targets.push(element.document.actor);
        maneuver.targetIds.push(element._id ?? element.id);
    });

    if (!checkManeuverTarget(maneuver, dialogOptions.maneuverStyle)) return;

    if (dialogOptions.maneuverStyle == "reckless") {
        maneuverDice += 2;
    }

    if (dialogOptions.supportDie) {
        maneuverDice += 1;
    }

    const rollFormula = maneuverDice + "d6";

    let rollResult = [];
    const rl = new Roll(rollFormula, maneuver);
    rollResult.push(await rl.evaluate({ async: true }));

    let resultData = [];
    resultData.push(
        checkManeuverResult(
            maneuver.system.gain,
            rollResult[0].dice[0].results,
            dialogOptions.maneuverStyle == "aggressive"
        )
    );

    let supportDice = [];
    if (dialogOptions.supportDie) {
        supportDice.push(rollResult[0].dice[0].results.pop());
    }

    let quickenedDie = null;
    if (isQuickened) {
        quickenedDie = rollResult[0].dice[0].results.pop();
    }

    let recklessDice = [];
    if (dialogOptions.maneuverStyle == "reckless") {
        recklessDice.push(rollResult[0].dice[0].results.pop());
        recklessDice.push(rollResult[0].dice[0].results.pop());
    }

    let diceResults = rollResult[0].dice[0].results;

    // take out slowed die
    let slowedDie = null;
    if (isSlowed) {
        let indexSlowedCharge = diceResults.findIndex((x) => x.charge);
        let indexSlowedStrike = diceResults.findIndex((x) => x.strike);

        if (indexSlowedCharge > -1) {
            diceResults[indexSlowedCharge].charge = false;
            diceResults[indexSlowedCharge].invisible = true;
            slowedDie = diceResults[indexSlowedCharge];
            resultData[0].charge -= 1;
        } else if (indexSlowedStrike > -1) {
            diceResults[indexSlowedStrike].strike = false;
            diceResults[indexSlowedStrike].invisible = true;
            slowedDie = diceResults[indexSlowedStrike];
            resultData[0].strike -= 1;
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

    let additionalData = [];
    additionalData.push({
        isQuickened: isQuickened,
        quickenedDie: quickenedDie,
        recklessDice: recklessDice,
        supportDice: supportDice,
        isSlowed: isSlowed,
        slowedDie: slowedDie,
        defensiveDie: defensiveDie,
        maneuverStyle: dialogOptions.maneuverStyle,
        hasSupportDie: dialogOptions.supportDie,
        isRegular: dialogOptions.maneuverStyle == "regular",
        isAggressive: dialogOptions.maneuverStyle == "aggressive",
        isCunning: dialogOptions.maneuverStyle == "cunning",
        isDefensive: dialogOptions.maneuverStyle == "defensive",
        isHeroic: dialogOptions.maneuverStyle == "heroic",
        isReckless: dialogOptions.maneuverStyle == "reckless",
        isSupportive: dialogOptions.maneuverStyle == "supportive",
    });

    await DiceRolls.renderRoll(
        rollResult,
        maneuver,
        resultData,
        messageTemplate,
        additionalData,
        isReroll,
        this.commitResults,
        dialogOptions,
        null,
        reroll
    );
}

function checkManeuverTarget(maneuver, maneuverStyle) {
    if (
        maneuverStyle == "cunning" ||
        maneuverStyle == "heroic" ||
        maneuverStyle == "supportive"
    ) {
        const originalTargets = duplicate(maneuver.targets);
        if (maneuverStyle == "cunning") {
            maneuver.targets = maneuver.targets.filter((i) => {
                return i.type == "adversity" || i.type == "hazard";
            });
        } else if (maneuverStyle == "heroic") {
            maneuver.targets = maneuver.targets.filter((i) => {
                return i.type == "goal";
            });
        } else if (maneuverStyle == "supportive") {
            maneuver.targets = maneuver.targets.filter((i) => {
                return i.type == "character";
            });
        }

        if (
            !maneuver.targets ||
            !maneuver.targets.length ||
            maneuver.targets.length != originalTargets.length
        ) {
            ui.notifications.error(
                `Please select a suitable target when using the <i>"${
                    maneuverStyle.charAt(0).toUpperCase() +
                    maneuverStyle.slice(1)
                }"</i> maneuver style.`
            );
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

export async function commitResults(resultData, item, dialogOptions) {
    const ownerStrikeDice = item.owner.system.strikeDice;
    const ownerChargeDice = item.owner.system.chargeDice;

    switch (dialogOptions.maneuverStyle) {
        case "aggressive":
            resultData[0].strike += 1;
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
        "system.strikeDice": ownerStrikeDice + resultData[0].strike,
    });

    await item.owner.update({
        "system.chargeDice": ownerChargeDice + resultData[0].charge,
    });
}
