import * as SkillRoll from "./skill-roll.js";
import * as ManeuverRoll from "./maneuver-roll.js";
import * as AttackRoll from "./attack-roll.js";

Hooks.on("renderChatMessage", (app, [html]) => {
    html.addEventListener("click", async (event) => {
        if ($(event.target).parent().hasClass("button-roll")) {
            const flags = app.data.flags;
            if (!game.actors.get(app.data.speaker.actor).isOwner) {
                ui.notifications.error("You did not perform this roll!");
                return;
            }
            if (flags.reroll) {
                ui.notifications.error("reroll already done for this roll.");
                return;
            }

            if (flags.commit) {
                ui.notifications.error("This roll was already comitted.");
                return;
            }

            if ($(event.target).parent().hasClass("reroll")) {
                await performReroll(flags);
                await app.update({ "flags.reroll": true });
            } else if ($(event.target).parent().hasClass("commit")) {
                await performCommit(flags);
                await app.update({ "flags.commit": true });
            }
        }
    });
});

function performReroll(flags) {
    if (flags.sourceItem.type == "skill")
        SkillRoll.skillCheck(flags.sourceItem, flags.additionalData.withHelp);
    else if (flags.sourceItem.type == "maneuver")
        ManeuverRoll.maneuverRoll(flags.sourceItem, true);
    else if (
        flags.sourceItem.type == "strike" ||
        flags.sourceItem.type == "achievement"
    ) {
        AttackRoll.attackRoll(flags.sourceItem, true, flags.dialogOptions);
    }
}

async function performCommit(flags) {
    if (flags.sourceItem.type == "maneuver") {
        let ownerId = flags.sourceItem.owner.id ?? flags.sourceItem.owner._id;
        ManeuverRoll.commitResults(ownerId, flags.resultData, flags.sourceItem);
    } else if (
        flags.sourceItem.type == "strike" ||
        flags.sourceItem.type == "achievement"
    ) {
        let ownerId = flags.sourceItem.owner.id ?? flags.sourceItem.owner._id;
        AttackRoll.commitResults(
            ownerId,
            flags.resultData,
            flags.sourceItem,
            flags.dialogOptions,
            flags.itemTargets
        );
    }

    return ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker(),
        content: await renderTemplate(
            "systems/animaprime/templates/rolls/commit-roll.hbs"
        ),
        roll: true,
    });
}
