import * as DiceRolls from "./dice-rolls.js";

export async function skillCheck(skill, withHelp = false, difficult = false) {
    const messageTemplate =
        "systems/animaprime/templates/rolls/roll-skill/roll-skill.hbs";

    // dialog
    let itemForDialog = {
        ...skill,
        type: skill.type,
    };

    const dialogOptions = await DiceRolls.getSkillRollOptions(itemForDialog);
    if (dialogOptions.cancelled) return;

    let dice =
        (!skill.generic ? parseInt(skill.system.rating) : 2) +
        (withHelp ? 1 : 0);

    const rollFormula = dice + "d6";

    const rl = new Roll(rollFormula, skill);
    const rollResult = await rl.evaluate({ async: true });

    const sux = await DiceRolls.checkSkillSuccess(
        rollResult.dice[0].results,
        dialogOptions.difficulty
    );

    let difficultyText = "regular";
    switch (dialogOptions.difficulty) {
        case "4":
            difficultyText = "hard";
            break;
        case "5":
            difficultyText = "very hard";
            break;
        case "6":
            difficultyText = "near impossible";
            break;
    }

    const resultData = {
        help: withHelp,
        successes: sux,
        difficultyText: difficultyText,
    };

    await DiceRolls.renderRoll(rollResult, skill, resultData, messageTemplate, {
        withHelp: withHelp,
    });
}
