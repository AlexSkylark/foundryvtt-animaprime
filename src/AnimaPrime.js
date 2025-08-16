import AnimaPrimeActorSheet from "../src/sheets/AnimaPrimeActorSheet.js";
import AnimaPrimeAdversitySheet from "../src/sheets/AnimaPrimeAdversitySheet.js";
import AnimaPrimeAllySheet from "../src/sheets/AnimaPrimeAllySheet.js";
import AnimaPrimeVehicleSheet from "../src/sheets/AnimaPrimeVehicleSheet.js";

import AnimaPrimeSkillSheet from "../src/sheets/AnimaPrimeSkillSheet.js";
import AnimaPrimeResistanceSheet from "../src/sheets/AnimaPrimeResistanceSheet.js";

import AnimaPrimeActionSheet from "../src/sheets/AnimaPrimeActionSheet.js";
import AnimaPrimeGoalSheet from "../src/sheets/AnimaPrimeGoalSheet.js";
import AnimaPrimeItem from "../src/AnimaPrimeItem.js";
import AnimaPrimeCombatTracker from "../src/sidebars/AnimaPrimeCombatTracker.js";
import AnimaPrimeCombatant from "../src/AnimaPrimeCombatant.js";
import AnimaPrimeCombat from "../src/AnimaPrimeCombat.js";
import AnimaPrimeActor from "../src/AnimaPrimeActor.js";
import AnimaPrimeActionHUD from "./AnimaPrimeActionHUD.js";
import AnimaPrimeGamemasterHUD from "./AnimaPrimeGamemasterHUD.js";

import * as HandlebarsHelpers from "./Handlebars.js";
import * as DiceRolls from "./dice-rolls/dice-rolls.js";
import * as ScriptEngine from "./AnimaPrimeScriptEngine.js";

async function preloadTemplates() {
    const templatePaths = ["systems/animaprime/templates/cards/item-card/item-card.hbs",
        "systems/animaprime/templates/partials/script-health.hbs",
        "systems/animaprime/templates/partials/script-reformbasics.hbs",
        "systems/animaprime/templates/partials/script-togglegmhud.hbs",
        "systems/animaprime/templates/partials/health-defense-container.hbs"];

    return loadTemplates(templatePaths);
}

function registerSheets() {
    Actors.unregisterSheet("core", ActorSheet);
    Actors.registerSheet("animaprime", AnimaPrimeActorSheet, {
        makedefault: true,
        types: ["character"],
    });
    Actors.registerSheet("animaprime", AnimaPrimeGoalSheet, {
        makedefault: true,
        types: ["goal"],
    });
    Actors.registerSheet("animaprime", AnimaPrimeAdversitySheet, {
        makedefault: true,
        types: ["adversity"],
    });
    Actors.registerSheet("animaprime", AnimaPrimeAllySheet, {
        makedefault: true,
        types: ["ally"],
    });

    Actors.registerSheet("animaprime", AnimaPrimeVehicleSheet, {
        makedefault: true,
        types: ["vehicle"],
    });

    Items.unregisterSheet("core", ItemSheet);

    Items.registerSheet("animaprime", AnimaPrimeSkillSheet, {
        makedefault: true,
        types: ["skill"],
    });

    Items.registerSheet("animaprime", AnimaPrimeResistanceSheet, {
        makedefault: true,
        types: ["resistance"],
    });

    Items.registerSheet("animaprime", AnimaPrimeActionSheet, {
        makedefault: true,
        types: ["maneuver", "strike", "power", "boost", "reaction", "extra", "achievement"],
    });
}


Hooks.on("renderActorSheet", async (sheet, html, data) => {
    let varWidth = sheet.constructor.defaultOptions.width;
    let varHeight = sheet.constructor.defaultOptions.height;

    if (sheet.actor.isOwner || game.user.isGM) {
        varWidth = sheet.widthUnlocked;
        varHeight = sheet.heightUnlocked;
    }

    await sheet.setPosition({
        width: varWidth,
        height: varHeight,
    });

    sheet.options.width = varWidth;
    sheet.options.height = varHeight;
});

Hooks.on("createToken", async (token, data, context, userId) => {
    await token.update({ displayName: 30  });
});

// handle changes in disposition for actors/tokens in combat
Hooks.on("updateToken", async (token, data, context, userId) => {

    if (!token.combatant) return;

    if (data.disposition != null) {
        await ui.combat.viewed.handleDispositionChange(data.disposition, token.id);
    }
});

// gives basic actions to actor/tokens on create
Hooks.on("createActor", async (actor, data, context, userId) => {

    if (!game.user.isGM) return;

    if (actor.type == "character" || actor.type == "adversity" || actor.type == "ally") {
        let items = await game.packs.get("animaprime.basic-actions").getDocuments();
        items = items.sort((a, b) => a.name.localeCompare(b.name));

        const BasicManeuver = items[1];
        const BasicStrike = items[0];

        items[0] = BasicManeuver;
        items[1] = BasicStrike;

        await actor.createEmbeddedDocuments("Item", items);
    } else if (actor.type == "vehicle") {
        let items = await game.packs.get("animaprime.basic-vehicle-actions").getDocuments();
        await actor.createEmbeddedDocuments("Item", items);
    }

    if (actor.type == "character" || actor.type == "ally" || actor.type == "goal") {
        await actor.update({ prototypeToken: { disposition: 1 } });
    } else if (actor.type == "adversity") {
        await actor.update({ prototypeToken: { disposition: -1 } });
    }

    if ((actor.type == "character" || actor.type == "ally" || actor.type == "vehicle" || actor.type == "goal") && actor.prototypeToken) await actor.prototypeToken.update({ actorLink: true });

    await actor.update({ prototypeToken: { displayName: 30 } });
});

// handles name changes for actors in combat
Hooks.on("preUpdateActor", async (actor, change, context, userId) => {
    if (change.name) {
        game.scenes.forEach(async (scene) => {
            let tokens = scene.tokens.filter((x) => x.actorId == actor.id ?? actor._id);

            tokens.forEach(async (token) => {
                token.namePreffix = token.name.split(actor.name)[0];
                token.nameSuffix = token.name.split(actor.name)[1];

                await token.update({
                    name: token.namePreffix + change.name + token.nameSuffix,
                });

                let combatants = game.combats.active.turns.filter((x) => x.tokenId == token.id ?? token._id);

                combatants.forEach(async (combatant) => {
                    await combatant.update({
                        name: token.namePreffix + change.name + token.nameSuffix,
                    });
                });
            });
        });

        if (actor.prototypeToken) await actor.prototypeToken.update({ name: change.name });
    }
});

Hooks.on("updateItem", async (actor, change, context, userId) => {
    await game.actionHud.render(true);
});

// refresh combat tracker
Hooks.on("createChatMessage", async (message, data, options, userId) => {
    if (game.dice3d && message.type == 5) await game.dice3d.waitFor3DAnimationByMessageID(message.id);

    if (!message.flags.sourceItem) {
        setTimeout(() => {
            $("li[data-message-id='" + message.id + "']").addClass("chat-message-message");
        });
    }
});

// display "confirm end turn" dialog for the owner if unit has the current turn
Hooks.on("createChatMessage", async (message, data, options, userId) => {
    if (game.dice3d && message.type == 5) await game.dice3d.waitFor3DAnimationByMessageID(message.id);

    if (message.flags.sourceItem) {
        const item = message.flags.sourceItem;

        if (item.type == "boost" || item.type == "reaction" || item.type == "extra" || item.type == "skill") {
            return;
        }

        if (!game.user.isGM) {
            const actorOwner = game.scenes.viewed.tokens.get(item.owner.id).actor;
            if (!message.flags.enableReroll && actorOwner.isOwner) {
                await DiceRolls.getConfirmEndOfTurn(item.owner);
            }
        }
    }
});

// set roll as comitted when comitting rolls
Hooks.on("createChatMessage", async (message, data, options, userId) => {
    if (game.dice3d && message.type == 5) await game.dice3d.waitFor3DAnimationByMessageID(message.id);


});

// auto-delete player-created update messages
Hooks.on("createChatMessage", async (message, data, options, userId) => {
    if (!message.flags.sourceItem && ((game.user.isGM && message.content.includes("added") && message.content.includes(" die ")) || (message.content.includes("subtracted") && message.content.includes(" die ")))) {
        setTimeout(() => {
            message.delete();
        }, 5000);
    }
});

// MASTER GM PROXY HOOK FOR ACTION CASTS
// ==============================================================================
Hooks.on("createChatMessage", async (message, data, options, userId) => {

    if (game.dice3d && message.type == 5) await game.dice3d.waitFor3DAnimationByMessageID(message.id);

    // set all rerolls from the sequence as commited when commiting rolls
    if (game.user.isGM && message.flags.rerollConfig) {
        if (message.flags.rerollConfig.charAt(0) == ",") message.flags.rerollConfig = message.flags.rerollConfig.slice(1);
        await game.combats.active.update({ "flags.commitedRerolls": message.flags.rerollConfig });
    }

    if (game.user.isGM && message.flags.sourceItem && !message.flags.enableReroll) {

        let item = message.flags.sourceItem;
        const dialogOptionsContainer = message.flags.dialogOptions;
        const resultDataContainer = message.flags.resultData;

        const ownerData = item.owner.system;
        const itemOwnerToken = game.scenes.viewed.tokens.get(message.flags.ownerTokenId);

        // handle threat over time effects
        if (item.name == "poisoned" || item.name == "burning" || item.name == "bleeding") {

            if (resultDataContainer[0] == true) {
                const poisonEffect = CONFIG.statusEffects.find((e) => e.id == item.name);
                itemOwnerToken.object.toggleEffect(poisonEffect, false);
            } else {
                await itemOwnerToken.actor.update({
                    "system.threatDice": itemOwnerToken.actor.system.threatDice + 1,
                });
            }

            return;
        }

        const ownerStrikeDice = ownerData.strikeDice;
        const ownerActionDice = ownerData.actionDice;
        const ownerChargeDice = ownerData.chargeDice;

        if (message.flags.sourceItem.type != "skill") {
            item.owner = itemOwnerToken ? itemOwnerToken.actor : message.flags.item.owner;
            item.owner.tokenId = itemOwnerToken.id;

            if (item.originalOwner)
                item.originalOwner.tokenId = itemOwnerToken.id;
        }

        let dialogOptions = {};
        let resultData = {};

        // handle strike/achievement/maneuver casts
        switch (message.flags.sourceItem.type) {
            case "strike":
            case "achievement":
                if (message.flags &&
                    message.flags.sourceItem &&
                    message.flags.sourceItem.targets
                ) {

                    let totalStrikeDice = 0;
                    let totalActionDice = 0;

                    for (let i = 0; i < message.flags.sourceItem.targets.length; i++) {
                        resultData = resultDataContainer[i];
                        dialogOptions = dialogOptionsContainer[i];

                        const token = game.scenes.viewed.tokens.get(message.flags.sourceItem.targets[i].tokenId);

                        let targetData = token.actor.system;

                        if (item.type == "strike") {
                            if (resultData.hit) {
                                targetData.health.value += resultData.wounds;
                                targetData.threatDice = 0;
                                token.actor.effects.clear();
                            } else {
                                targetData.threatDice += resultData.variableGain;
                            }

                            await token.actor.update({
                                system: targetData,
                            });
                        } else if (item.type == "achievement") {
                            const ownerDisposition = itemOwnerToken.disposition;

                            const isSupported = item.owner.checkCondition("supported");
                            if (isSupported) {
                                const supportedEffect = CONFIG.statusEffects.find((e) => e.id == "supported");
                                itemOwnerToken.object.toggleEffect(supportedEffect, false);
                            }

                            if (resultData.hit) {
                                targetData.progressDice = 0;
                            } else {
                                targetData.progressDice = Math.max(targetData.progressDice + resultData.variableGain * (ownerDisposition == token.disposition ? 1 : -1), 0);
                            }

                            await token.actor.update({
                                system: targetData,
                            });

                            item.targets[i] = token.actor;
                        }

                        totalStrikeDice += dialogOptions.strikeDice;
                        totalActionDice += dialogOptions.actionDice;
                    }

                    await item.owner.update({
                        "system.strikeDice": Math.max(ownerStrikeDice - totalStrikeDice, 0),
                    });
                    await item.owner.update({
                        "system.actionDice": Math.max(ownerActionDice - totalActionDice, 0),
                    });

                    if (item.system.cost) {
                        const isHexed = item.owner.checkCondition("hexed");
                        await item.owner.update({
                            "system.chargeDice": ownerData.chargeDice - (item.system.cost + (isHexed ? 1 : 0)),
                        });
                    }
                }
                break;
            case "maneuver":
                dialogOptions = dialogOptionsContainer;
                resultData = resultDataContainer;

                if (dialogOptions && dialogOptions.maneuverStyle) {
                    if (dialogOptions.maneuverStyle == "cunning" || dialogOptions.maneuverStyle == "methodical" || dialogOptions.maneuverStyle == "supportive") {

                        const token = game.scenes.viewed.tokens.get(message.flags.sourceItem.targets[0].tokenId);
                        let targetData = token.actor.system;

                        if (dialogOptions.maneuverStyle == "cunning") {
                            targetData.threatDice += 1;
                        } else if (dialogOptions.maneuverStyle == "methodical") {
                            const ownerDisposition = item.owner.disposition;
                            if (ownerDisposition == token.disposition) {
                                targetData.progressDice += 1;
                            }
                            else
                                targetData.progressDice = Math.max(targetData.progressDice - 1, 0);
                        } else if (dialogOptions.maneuverStyle == "supportive") {
                            targetData.strikeDice += 1;
                        }

                        await token.actor.update({
                            system: targetData,
                        });
                    }
                }

                switch (dialogOptions.maneuverStyle) {
                    case "aggressive":
                        break;
                    case "defensive":
                        await item.owner.update({
                            "system.threatDice": Math.max(item.owner.system.threatDice - 1, 0),
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
                break;
        }

        // execute AfterResolve script actions
        if (message.flags.sourceItem.type == "boost") {

            let boost = {
                scriptBeforeResolve: message.flags.sourceItem.system.scriptBeforeResolve,
                scriptAfterResolve: message.flags.sourceItem.system.scriptAfterResolve,
                validActions: message.flags.sourceItem.system.actionTypes,
                identifierId: message.flags.sourceItem.owner.id
            }

            await game.combats.active.update({ "flags.actionBoost": boost });
        } else {
            if (message.flags.sourceItem.system.scriptAfterResolve) {
                await ScriptEngine.executeResolveScript(item, item.targets, item.system.scriptAfterResolve);
            }

            // inactivate any boost scripts still active
            await game.combats.active.update({ "flags.actionBoost": null });
        }

        // restore original values of items who were modified by GM
        if (item.system.originalValues != null && Object.keys(item.system.originalValues).length) {
            let itemOriginalValues = JSON.parse(JSON.stringify(item.system.originalValues));
            itemOriginalValues.originalValues = null;
            let originalItem = item.owner.items.get(item.originalItem._id)
            await originalItem.update({ system: itemOriginalValues });
        }
    }
});

// cancel boosts by deleting the boost chat log message
Hooks.on("deleteChatMessage", async (app) => {

    if (game.user.isGM && app.flags.sourceItem && app.flags.sourceItem.type == "boost") {
        await game.combats.active.update({ "flags.actionBoost": null });
    }
});

// setup action HUD
Hooks.once("canvasReady", async () => {
    if (!game.actionHud) {
        game.actionHud = new AnimaPrimeActionHUD();
    }

    if (!game.gmHud) {
        game.gmHud = new AnimaPrimeGamemasterHUD();
    }

    await game.actionHud.render(true);
    await game.gmHud.render(true);
});

Hooks.once("ready", async function () {
    // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
    Hooks.on("hotbarDrop", (bar, data, slot) => createActionCardMacro(bar, data, slot));
});

Hooks.once("init", async () => {
    game.animaprime = {
        AnimaPrimeItem,
        AnimaPrimeCombat,
        AnimaPrimeCombatant
    };

    CONFIG.Actor.documentClass = AnimaPrimeActor;
    CONFIG.Item.documentClass = AnimaPrimeItem;
    CONFIG.Combat.documentClass = AnimaPrimeCombat;
    CONFIG.Combatant.documentClass = AnimaPrimeCombatant;
    CONFIG.ui.combat = AnimaPrimeCombatTracker;

    CONFIG.dialogWindows = [];

    preloadTemplates();
    HandlebarsHelpers.registerHandlebarsHelpers();
    registerSheets();
    configureStatusEffects();

    await ColorPicker.register("animaprime", "primaryColor", {
        name: "Primary Color",
        hint: "Color used on Sheets",
        default: "#723485",
        scope: "client",
        config: true,
        onChange: (value) => {
            changePrimaryColor(value);
        },
    });

    changePrimaryColor(await game.settings.get("animaprime", "primaryColor"));
});

function changePrimaryColor(color) {
    const hslValue = hexToHSL(color);

    const r = document.querySelector(":root");

    r.style.setProperty("--hue", hslValue.hue);
    r.style.setProperty("--saturation", hslValue.saturation);
    r.style.setProperty("--light", hslValue.light);
}

function configureStatusEffects() {
    CONFIG.statusEffects = [
        {
            id: "dead",
            label: "EFFECT.StatusDead",
            icon: "icons/svg/skull.svg",
        },
        {
            id: "unconscious",
            label: "EFFECT.StatusUnconscious",
            icon: "icons/svg/unconscious.svg",
        },
        {
            id: "burning",
            label: "Burning",
            icon: "systems/animaprime/assets/icons/candlebright.svg",
        },
        {
            id: "bleeding",
            label: "Bleeding",
            icon: "systems/animaprime/assets/icons/blood.svg",
        },
        {
            id: "dazed",
            label: "Dazed",
            icon: "systems/animaprime/assets/icons/star-swirl.svg",
        },
        {
            id: "diseased",
            label: "Diseased",
            icon: "systems/animaprime/assets/icons/pill.svg",
        },
        {
            id: "doomed",
            label: "Doomed",
            icon: "systems/animaprime/assets/icons/reaper-scythe.svg",
        },
        {
            id: "empowered",
            label: "Empowered",
            icon: "systems/animaprime/assets/icons/swords-power.svg",
        },
        {
            id: "hexed",
            label: "Hexed",
            icon: "systems/animaprime/assets/icons/death-note.svg",
        },
        {
            id: "immobilized",
            label: "Immobilized",
            icon: "systems/animaprime/assets/icons/frozen-body.svg",
        },
        {
            id: "poisoned",
            label: "Poisoned",
            icon: "systems/animaprime/assets/icons/poison-gas.svg",
        },
        {
            id: "quickened",
            label: "Quickened",
            icon: "systems/animaprime/assets/icons/running-ninja.svg",
        },
        {
            id: "shielded",
            label: "Shielded",
            icon: "systems/animaprime/assets/icons/shield-echoes.svg",
            changes: [
                {
                    key: "system.defense",
                    mode: 2,
                    value: "2",
                },
            ],
        },
        {
            id: "supported",
            label: "Supported",
            icon: "systems/animaprime/assets/icons/curly-wing.svg",
        },
        {
            id: "weakened",
            label: "Weakened",
            icon: "systems/animaprime/assets/icons/breaking-chain.svg",
        },
        {
            id: "marked",
            label: "Marked",
            icon: "systems/animaprime/assets/icons/cross-mark.svg",
        },
    ];
}

const intToRoman = (num) => {
    const map = {
        M: 1000,
        CM: 900,
        D: 500,
        CD: 400,
        C: 100,
        XC: 90,
        L: 50,
        XL: 40,
        X: 10,
        IX: 9,
        V: 5,
        IV: 4,
        I: 1,
    };
    let result = "";

    for (const key in map) {
        const repeatCounter = Math.floor(num / map[key]);

        if (repeatCounter !== 0) {
            result += key.repeat(repeatCounter);
        }

        num %= map[key];

        if (num === 0) return result;
    }

    return result;
};

function hexToHSL(H) {
    // Convert hex to RGB first
    let r = 0,
        g = 0,
        b = 0;
    if (H.length == 4) {
        r = "0x" + H[1] + H[1];
        g = "0x" + H[2] + H[2];
        b = "0x" + H[3] + H[3];
    } else if (H.length == 7) {
        r = "0x" + H[1] + H[2];
        g = "0x" + H[3] + H[4];
        b = "0x" + H[5] + H[6];
    }
    // Then to HSL
    r /= 255;
    g /= 255;
    b /= 255;
    let cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        l = 0;

    if (delta == 0) h = 0;
    else if (cmax == r) h = ((g - b) / delta) % 6;
    else if (cmax == g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);

    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return { hue: h, saturation: s + "%", light: l + "%" };
}
