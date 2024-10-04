import * as SkillRoll from "./skill-roll.js";
import * as ManeuverRoll from "./maneuver-roll.js";
import * as AttackRoll from "./attack-roll.js";

Hooks.on("renderChatMessage", (app, [html]) => {
    html.addEventListener("click", async (event) => {
        if ($(event.target).hasClass("button-roll")) {
            const flags = app.flags;

            if (!app.flags.ownerTokenId) return;

            if (!game.scenes.viewed.tokens.get(app.flags.ownerTokenId).isOwner) {
                ui.notifications.error("You did not perform this roll!");
                return;
            }
            const rerollListString = game.combats.active.flags.commitedRerolls
            if (rerollListString) {
                const rerollList = rerollListString.split(",");
                flags.commit = rerollList.some((x) => x == flags.reroll);

                if (flags.commit) {
                    ui.notifications.error("This roll was already comitted.");
                    return;
                }
            }


            app.flags.sourceItem.owner = game.scenes.viewed.tokens.get(app.flags.ownerTokenId).actor;
            app.flags.sourceItem.originalOwner.tokenId = app.flags.ownerTokenId;

            if ($(event.target).hasClass("reroll")) {
                try {
                    if (!app.flags.previousApps) app.flags.previousApps = [];
                    flags.previousApps.push(app);
                    $(event.target).addClass('hide-button')
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
    const reroll = flags.sourceItem.owner.system.reroll;

    await flags.sourceItem.owner.update({
        "system.reroll": reroll - 1,
    });
    flags.sourceItem.originalOwner.system.reroll -= 1;

    flags.sourceItem.owner = flags.sourceItem.originalOwner;
    flags.sourceItem.targets = flags.sourceItem.originalTargets;

    if (flags.sourceItem.type == "skill") SkillRoll.skillCheck(flags.sourceItem, flags.additionalData.withHelp);
    else if (flags.sourceItem.type == "maneuver") ManeuverRoll.maneuverRoll(flags.sourceItem, true, flags.sourceItem.originalDialogOptions, flags.reroll);
    else if (flags.sourceItem.type == "strike" || flags.sourceItem.type == "achievement") {
        AttackRoll.attackRoll(flags.sourceItem, true, flags.sourceItem.originalDialogOptions, flags.reroll);
    }
}

async function performCommit(flags) {

    flags.enableReroll = false;

    let rerollConfig = "";
    const rerollListString = game.combats.active.flags.commitedRerolls ?? null;

    let rerollList = rerollListString ? rerollListString.split(",") : [];
    rerollList.push(flags.reroll);

    if (rerollList.length > 10) rerollList.shift();

    rerollConfig = rerollList.join(",");
    if (rerollConfig.charAt(0) == ",") rerollConfig.slice(1);

    return ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ alias: flags.sourceItem.owner.name }),
        content: await renderTemplate("systems/animaprime/templates/rolls/commit-roll.hbs"),
        flags: {
            ...flags,
            rerollConfig: rerollConfig,
        },
    });
}
