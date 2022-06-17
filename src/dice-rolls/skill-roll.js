import * as DiceRolls from "./dice-rolls.js";

export async function skillCheck(skill, withHelp = false, difficult = false) {
    const messageTemplate =
        "systems/animaprime/templates/rolls/roll-skill/roll-skill.hbs";

    let disadvantage = false;
    let dice = (!skill.generic ? 2 : 1) + withHelp - difficult;
    if (dice < 1) {
        disadvantage = true;
        dice = 2;
    }

    const rollFormula = dice + "d6";

    const rollResult = await new Roll(rollFormula, skill).roll();
    const resultData = await DiceRolls.checkSkillSuccess(
        rollResult.dice[0].results,
        disadvantage
    );
    await DiceRolls.renderRoll(rollResult, skill, resultData, messageTemplate, {
        withHelp: withHelp,
    });
}
