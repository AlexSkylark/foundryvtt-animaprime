import * as DiceRolls from "./dice-rolls.js";

export async function skillCheck(skill, withHelp = false, difficult = false) {
    const messageTemplate = "systems/animaprime/templates/rolls/roll-skill/roll-skill.hbs";

    // dialog
    let itemForDialog = {
        ...skill,
        type: skill.type,
    };

    const dialogOptions = await getSkillRollOptions(itemForDialog);
    if (dialogOptions.cancelled) return;

    let dice = (!skill.generic ? parseInt(skill.system.rating) : 2) + (withHelp ? 1 : 0);

    const rollFormula = dice + "d6";

    let rollResult = [];
    const rl = new Roll(rollFormula, skill);
    rollResult.push(await rl.evaluate({ async: true }));

    let sixes = await checkSkillSixes(rollResult[0].dice[0].results);

    while (sixes > 0) {
        const rexFormula = sixes + "d6";
        const rexRoll = new Roll(rexFormula, skill);
        const rexResults = await rexRoll.evaluate({ async: true });

        sixes = await checkSkillSixes(rexResults.dice[0].results);

        rollResult[0].dice[0].results = rollResult[0].dice[0].results.concat(rexResults.dice[0].results);
    }

    const sux = await checkSkillSuccess(rollResult[0].dice[0].results, dialogOptions.difficulty);

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

    let resultData = [];
    resultData.push({
        help: withHelp,
        successes: sux,
        difficultyText: difficultyText,
        difficulty: parseInt(dialogOptions.difficulty),
    });

    const splittedResults = [DiceRolls.splitRollResult(rollResult[0].dice[0].results, dice, 0, 0, 0, rollResult[0].dice[0].results.length - dice)];

    await DiceRolls.renderRoll(rollResult, skill, resultData, messageTemplate, splittedResults);
}

async function getSkillRollOptions(item) {
    return new Promise(async (resolve) => {
        const dialogOptions = {
            width: 320,
            height: 291,
            classes: ["window-dialog"],
        };

        const data = {
            title: item.type.charAt(0).toUpperCase() + item.type.slice(1) + " Roll",
            content: await renderTemplate("systems/animaprime/templates/dialogs/dialog-skillroll/dialog-skillroll.hbs", item),
            options: {
                classes: ["window-content-white"],
            },
            buttons: {
                cancel: {
                    label: '<i class="fas fa-x"></i> Cancel',
                    callback: (html) => resolve({ cancelled: true }),
                },
                normal: {
                    label: '<i class="fas fa-check"></i> Confirm',
                    callback: (html) =>
                        resolve({
                            difficulty: html[0].querySelector("form").difficulty.value,
                        }),
                },
            },
            default: "normal",
            close: () => resolve({ cancelled: true }),
        };

        new Dialog(data, dialogOptions).render(true);
    });
}

async function checkSkillSuccess(results, difficulty) {
    var sux = 0;

    for (let i of results) {
        if (i.result >= difficulty) {
            sux++;
            i.success = true;
        }
    }

    return sux;
}

function checkSkillSixes(results) {
    var sux = 0;

    for (let i of results) {
        if (i.result == 6) {
            sux++;
        }
    }

    return sux;
}
