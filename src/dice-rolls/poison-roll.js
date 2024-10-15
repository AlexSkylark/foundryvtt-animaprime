import * as DiceRolls from "./dice-rolls.js";

export async function poisonRoll(poison, isReroll = false) {
    const messageTemplate = "systems/animaprime/templates/rolls/roll-poison/roll-poison.hbs";

    const rollFormula = "1d6";

    const rl = new Roll(rollFormula, poison);
    const rollResult = [await rl.evaluate({ async: true })];

    const resultData = [checkPoisonResult(poison.name, rollResult[0].dice[0].results)];

    poison.label = "Poison";
    if (poison.name == "burning") poison.label = "Burning";
    else if (poison.name == "bleeding") poison.label = "Bleeding";

    poison.owner.tokenId = poison.owner.id;

    await DiceRolls.renderRoll(rollResult, poison, resultData, messageTemplate, [], isReroll, poison.owner.id);
}

function checkPoisonResult(conditionName, results) {
    let cleanseValue = 1;
    if (conditionName == "burning") cleanseValue = 6;
    else if (conditionName == "bleeding") cleanseValue = 2;

    if (results[0].result == cleanseValue) return true;
    else return false;
}

export async function commitResults(resultData, poisonData) {
    let owner = poisonData.owner;

    if (resultData[0] == true) {
        const poisonEffect = CONFIG.statusEffects.find((e) => e.id == poisonData.name);
        owner.object.toggleEffect(poisonEffect, false);
    } else {
        let ownerActor = game.scenes.viewed.tokens.get(owner.id).actor;
        await ownerActor.update({
            "system.threatDice": ownerActor.system.threatDice + 1,
        });
    }
}
