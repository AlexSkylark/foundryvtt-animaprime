import * as DiceRolls from "./dice-rolls.js";

export async function poisonRoll(poison, isReroll = false) {
    const messageTemplate = "systems/animaprime/templates/rolls/roll-poison/roll-poison.hbs";

    const rollFormula = "1d6";

    const rl = new Roll(rollFormula, poison);
    const rollResult = [await rl.evaluate({ async: true })];

    const resultData = [checkPoisonResult(rollResult[0].dice[0].results)];

    await DiceRolls.renderRoll(rollResult, poison, resultData, messageTemplate, [], isReroll, this.commitResults);
}

function checkPoisonResult(results) {
    if (results[0].result == 1) return true;
    else return false;
}

export async function commitResults(resultData, poisonData) {
    let owner = poisonData.owner;

    if (resultData[0] == true) {
        const poisonEffect = CONFIG.statusEffects.find((e) => e.id == poisonData.name);
        owner.object.toggleEffect(poisonEffect, false);
    } else {
        let ownerActor = {};
        if (owner.isLinked) {
            ownerActor = game.actors.get(owner.actor.id);
        } else {
            ownerActor = owner.actor ?? owner.actorData;
        }

        await ownerActor.update({
            "system.threatDice": ownerActor.system.threatDice + 1,
        });
    }
}
