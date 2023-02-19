import * as SkillRoll from "./skill-roll.js";
import * as ManeuverRoll from "./maneuver-roll.js";
import * as AttackRoll from "./attack-roll.js";
import AnimaPrimeActor from "../AnimaPrimeActor.js";

Hooks.on("renderChatMessage", (app, [html]) => {
    html.addEventListener("click", async (event) => {
        if ($(event.target).hasClass("button-roll")) {
            const flags = app.flags;

            if (!game.actors.get(app.flags.actorId).isOwner) {
                ui.notifications.error("You did not perform this roll!");
                return;
            }

            const rerollList = await game.settings
                .get("animaprime", "commitedRerolls")
                .split(",");
            flags.commit = rerollList.some((x) => x == flags.reroll);

            if (flags.commit) {
                ui.notifications.error("This roll was already comitted.");
                return;
            }

            if (app.flags.tokenId) {
                app.flags.sourceItem.owner = game.scenes.active.tokens.get(
                    app.flags.tokenId
                ).actor;
            } else {
                app.flags.sourceItem.owner = game.actors.get(app.flags.actorId);
            }

            if ($(event.target).hasClass("reroll")) {
                try {
                    if (!app.flags.previousApps) app.flags.previousApps = [];
                    flags.previousApps.push(app);
                    await performReroll(app.flags);
                } catch (ex) {
                    throw ex;
                }
            } else if ($(event.target).hasClass("commit")) {
                try {
                    await performCommit(flags);
                    if (flags.previousApps)
                        flags.previousApps.forEach(async (prevApp) => {
                            prevApp.flags.commit = true;
                        });
                } catch (ex) {
                    throw ex;
                }
            }
        }
    });
});

async function performReroll(flags) {
    if (flags.sourceItem.type == "skill")
        SkillRoll.skillCheck(flags.sourceItem, flags.additionalData.withHelp);
    else if (flags.sourceItem.type == "maneuver")
        ManeuverRoll.maneuverRoll(
            flags.sourceItem,
            true,
            flags.dialogOptions,
            flags.reroll
        );
    else if (
        flags.sourceItem.type == "strike" ||
        flags.sourceItem.type == "achievement"
    ) {
        AttackRoll.attackRoll(
            flags.sourceItem,
            true,
            flags.dialogOptions,
            flags.reroll
        );
    }
}

async function performCommit(flags) {
    if (flags.sourceItem.type == "maneuver") {
        ManeuverRoll.commitResults(
            flags.resultData,
            flags.sourceItem,
            flags.dialogOptions
        );
    } else if (
        flags.sourceItem.type == "strike" ||
        flags.sourceItem.type == "achievement"
    ) {
        AttackRoll.commitResults(
            flags.resultData,
            flags.sourceItem,
            flags.dialogOptions,
            flags.itemTarget
        );
    }

    flags.enableReroll = false;

    let rerollList = await game.settings
        .get("animaprime", "commitedRerolls")
        .split(",");
    rerollList.push(flags.reroll);

    if (rerollList.length > 20) rerollList.shift();

    let rerollConfig = rerollList.join(",");
    if (rerollConfig.charAt(0) == ",") rerollConfig.slice(1);

    return ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ alias: flags.sourceItem.owner.name }),
        content: await renderTemplate(
            "systems/animaprime/templates/rolls/commit-roll.hbs"
        ),
        flags: {
            ...flags,
            rerollConfig: rerollConfig,
        },
    });
}
