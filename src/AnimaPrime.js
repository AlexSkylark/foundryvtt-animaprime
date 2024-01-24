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

async function preloadTemplates() {
    const templatePaths = ["systems/animaprime/templates/cards/item-card/item-card.hbs", "systems/animaprime/templates/partials/script-health.hbs", "systems/animaprime/templates/partials/script-reformbasics.hbs", "systems/animaprime/templates/partials/script-togglegmhud.hbs", "systems/animaprime/templates/partials/health-defense-container.hbs"];

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

    let varLeft = window.innerWidth / 2 - varWidth / 2;
    let varTop = window.innerHeight / 2 - varHeight / 2;

    await sheet.setPosition({
        left: varLeft,
        top: varTop,
        width: varWidth,
        height: varHeight,
    });

    sheet.options.width = varWidth;
    sheet.options.height = varHeight;
    sheet.options.left = varLeft;
    sheet.options.top = varTop;

    html.css("top", `${varTop}px`);
});

Hooks.on("createActor", async (actor, data, context, userId) => {
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

    if (actor.type == "adversity" || actor.type == "ally") {
        actor.ownership.default = 2;
    }

    if ((actor.type == "character" || actor.type == "ally" || actor.type == "vehicle" || actor.type == "goal") && actor.prototypeToken) await actor.prototypeToken.update({ actorLink: true });
});

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
            const actorOwner = game.actors.get(message.speaker.actor);
            if (!message.flags.enableReroll && actorOwner.isOwner) {
                await DiceRolls.getConfirmEndOfTurn(item.owner);
            }
        }
    }
});

// set roll as comitted when comitting rolls
Hooks.on("createChatMessage", async (message, data, options, userId) => {
    if (game.dice3d && message.type == 5) await game.dice3d.waitFor3DAnimationByMessageID(message.id);

    if (game.user.isGM && message.flags.rerollConfig) {
        if (message.flags.rerollConfig.charAt(0) == ",") message.flags.rerollConfig = message.flags.rerollConfig.slice(1);
        await game.settings.set("animaprime", "commitedRerolls", message.flags.rerollConfig);
    }
});

// auto-delete player-created update messages
Hooks.on("createChatMessage", async (message, data, options, userId) => {
    if (!message.flags.sourceItem && ((game.user.isGM && message.content.includes("added") && message.content.includes(" die ")) || (message.content.includes("subtracted") && message.content.includes(" die ")))) {
        setTimeout(() => {
            message.delete();
        }, 5000);
    }
});

// GM proxy for maneuver commits on targets the player doesn't own
Hooks.on("createChatMessage", async (message, data, options, userId) => {
    if (game.dice3d && message.type == 5) await game.dice3d.waitFor3DAnimationByMessageID(message.id);

    if (game.user.isGM && message.flags.sourceItem && !message.flags.enableReroll) {
        const item = message.flags.sourceItem;
        const dialogOptions = message.flags.dialogOptions;

        if (dialogOptions && dialogOptions.maneuverStyle) {
            if (dialogOptions.maneuverStyle == "cunning" || dialogOptions.maneuverStyle == "heroic" || dialogOptions.maneuverStyle == "supportive") {
                const token = game.scenes.active.tokens.get(message.flags.sourceItem.targetIds[0]);

                let targetEntity = {};
                if (token.isLinked) {
                    targetEntity = game.actors.get(token.actor.id);
                } else {
                    targetEntity = token.actor ?? token.actorData;
                }

                let targetData = targetEntity.system;

                if (dialogOptions.maneuverStyle == "cunning") {
                    targetData.threatDice += 1;
                } else if (dialogOptions.maneuverStyle == "heroic") {
                    targetData.progressDice += 1;
                } else if (dialogOptions.maneuverStyle == "supportive") {
                    targetData.strikeDice += 1;
                }

                await targetEntity.update({
                    system: targetData,
                });
            }
        }
    }
});

// GM proxy for strike/achievement commits on targets the player doesn't own
Hooks.on("createChatMessage", async (message, data, options, userId) => {
    if (game.dice3d && message.type == 5) await game.dice3d.waitFor3DAnimationByMessageID(message.id);

    if (game.user.isGM && message.flags.sourceItem && !message.flags.enableReroll) {
        const item = message.flags.sourceItem;

        if (message.flags && message.flags.sourceItem && message.flags.sourceItem.targets) {
            for (let i = 0; i < message.flags.sourceItem.targets.length; i++) {
                const resultData = message.flags.resultData[i];
                const dialogOptions = message.flags.dialogOptions[i];

                const token = game.scenes.active.tokens.get(message.flags.sourceItem.targetIds[i]);

                let targetEntity = {};
                if (token.isLinked) {
                    targetEntity = game.actors.get(token.actor.id);
                } else {
                    targetEntity = token.actor ?? token.actorData;
                }

                let targetData = targetEntity.system;

                if (item.type == "strike") {
                    if (resultData.hit) {
                        targetData.health.value += resultData.wounds;
                        targetData.threatDice = 0;
                        targetEntity.effects.clear();
                    } else {
                        targetData.threatDice += resultData.variableGain;
                    }

                    await targetEntity.update({
                        system: targetData,
                    });
                } else if (item.type == "achievement") {
                    let ownerType = 0;
                    if (item.owner.type == "adversity") ownerType = 1;

                    if (!resultData.hit) {
                        targetData.progressDice = Math.max(targetData.progressDice + resultData.variableGain * (ownerType == targetData.type ? 1 : -1), 0);
                    }

                    await targetEntity.update({
                        system: targetData,
                    });
                }
            }
        }
    }
});

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

async function createActionCardMacro(bar, data, slot) {
    if (data.type !== "Item") return;

    const splitData = data.uuid.split(".");
    const item = game.actors.get(splitData[1]).items.get(splitData[3]);

    // Create the macro command
    const command = `game.animaprime.rollItemMacro("${splitData[3]}");`;
    let macro = game.macros.find((m) => m.name === item.name && m.command === command);
    if (!macro) {
        macro = await Macro.create({
            name: item.name,
            type: "script",
            img: item.img,
            command: command,
            flags: { "animaprime.itemMacro": true },
        });
    }
    setTimeout(async () => {
        await game.user.assignHotbarMacro(macro, slot);
    }, 500);

    return false;
}

Hooks.once("init", async () => {
    game.animaprime = {
        AnimaPrimeItem,
        AnimaPrimeCombat,
        AnimaPrimeCombatant,
        rollItemMacro: (itemName) => {
            const speaker = ChatMessage.getSpeaker();
            let actor;
            if (speaker.token) actor = game.actors.tokens[speaker.token];
            if (!actor) actor = game.actors.get(speaker.actor);
            const item = actor ? actor.items.get(itemName) : null;
            if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

            // Trigger the item roll
            return item.roll();
        },
    };

    CONFIG.Actor.documentClass = AnimaPrimeActor;
    CONFIG.Item.documentClass = AnimaPrimeItem;
    CONFIG.Combat.documentClass = AnimaPrimeCombat;
    CONFIG.Combatant.documentClass = AnimaPrimeCombatant;
    CONFIG.ui.combat = AnimaPrimeCombatTracker;
    CONFIG.time.turnTime = 10;

    CONFIG.dialogWindows = [];

    preloadTemplates();
    HandlebarsHelpers.registerHandlebarsHelpers();
    registerSheets();
    configureStatusEffects();

    await game.settings.register("animaprime", "commitedRerolls", {
        name: "Reroll List",
        hint: "Comma-separated list for reroll control",
        scope: "world",
        config: false,
        type: String,
        default: "",
        onChange: (value) => {
            console.log("reroll added: " + value);
        },
    });

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
