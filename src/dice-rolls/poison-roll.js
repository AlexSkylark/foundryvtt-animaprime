import * as DiceRolls from "./dice-rolls.js";

export async function poisonRoll(poison, isReroll = false) {
    const messageTemplate =
        "systems/animaprime/templates/rolls/roll-poison/roll-poison.hbs";

    const rollFormula = "1d6";

    const rl = new Roll(rollFormula, poison);
    const rollResult = await rl.evaluate({ async: true });

    const resultData = checkPoisonResult(rollResult.dice[0].results);

    await DiceRolls.renderRoll(
        rollResult,
        poison,
        resultData,
        messageTemplate,
        null,
        isReroll,
        this.commitResults
    );
}

function checkPoisonResult(results) {
    if (results[0].result == 1) return true;
    else return false;
}

export async function commitResults(resultData, poisonData) {
    let owner = poisonData.owner;

    if (resultData == true) {
        const poisonEffect = CONFIG.statusEffects.find(
            (e) => e.id == "poisoned"
        );
        owner.object.toggleEffect(poisonEffect, false);
    } else {
        let ownerData = {};
        if (owner.isLinked) {
            ownerData = game.actors.get(owner.actor.id).system;
        } else {
            ownerData = owner.actor.system ?? owner.actorData.system;
        }

        ownerData.threatDice += 1;

        await owner.update({
            "actorData.system": ownerData,
        });
    }
}
