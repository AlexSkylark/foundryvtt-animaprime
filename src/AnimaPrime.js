import AnimaPrimeActorSheet from "../src/sheets/AnimaPrimeActorSheet.js";
import AnimaPrimeAdversitySheet from "../src/sheets/AnimaPrimeAdversitySheet.js";
import AnimaPrimeHazardSheet from "../src/sheets/AnimaPrimeHazardSheet.js";

import AnimaPrimeSkillSheet from "../src/sheets/AnimaPrimeSkillSheet.js";
import AnimaPrimeActionSheet from "../src/sheets/AnimaPrimeActionSheet.js";
import AnimaPrimeGoalSheet from "../src/sheets/AnimaPrimeGoalSheet.js";
import AnimaPrimeItem from "../src/AnimaPrimeItem.js";
import AnimaPrimeCombatTracker from "../src/sidebars/AnimaPrimeCombatTracker.js";
import AnimaPrimeCombatant from "../src/AnimaPrimeCombatant.js";
import AnimaPrimeCombat from "../src/AnimaPrimeCombat.js";
import AnimaPrimeActor from "../src/AnimaPrimeActor.js";

import * as HandlebarsHelpers from "./Handlebars.js";

async function preloadTemplates() {
    const templatePaths = [
        "systems/animaprime/templates/cards/item-card/item-card.hbs",
        "systems/animaprime/templates/partials/script-health.hbs",
    ];

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
    Actors.registerSheet("animaprime", AnimaPrimeHazardSheet, {
        makedefault: true,
        types: ["hazard"],
    });

    Items.unregisterSheet("core", ItemSheet);
    Items.registerSheet("animaprime", AnimaPrimeSkillSheet, {
        makedefault: true,
        types: ["skill"],
    });
    Items.registerSheet("animaprime", AnimaPrimeActionSheet, {
        makedefault: true,
        types: [
            "maneuver",
            "strike",
            "power",
            "boost",
            "reaction",
            "extra",
            "achievement",
        ],
    });
}

Hooks.on("preCreateToken", async (token, data, options, userId) => {
    const sceneTokens = game.scenes.active.tokens.contents.filter(
        (x) => x.actor.name == token.actor.name
    );

    if (sceneTokens.length == 0) return true;

    if (sceneTokens.length == 1) {
        await sceneTokens[0].updateSource({ name: token.name + " I" });
    }

    await token.updateSource({
        name: token.name + " " + intToRoman(sceneTokens.length + 1),
    });
});

Hooks.on("updateActor", async (actor, change, context, userId) => {
    if (change.name) {
        if (actor.prototypeToken)
            await actor.prototypeToken.update({ name: change.name });

        let tokens = game.scenes.active.tokens.filter(
            (x) => x.actor.name == change.name
        );

        for (let i = 0; i < tokens.length; i++) {
            await tokens[i].update({
                name:
                    change.name +
                    (tokens.length == 1 ? "" : " " + intToRoman(i + 1)),
            });
        }
    }
});

Hooks.on("createChatMessage", async (message, data, options, userId) => {
    if (message.type === "roll") {
        ui.combat.render();
    }

    if (game.user.isGM && message.flags.rerollConfig) {
        if (message.flags.rerollConfig.charAt(0) == ",")
            message.flags.rerollConfig = message.flags.rerollConfig.slice(1);

        await game.settings.set(
            "animaprime",
            "commitedRerolls",
            message.flags.rerollConfig
        );
    }

    if (game.user.isGM && !message.flags.enableReroll) {
        const item = message.flags.sourceItem;

        if (
            message.flags &&
            message.flags.sourceItem &&
            message.flags.sourceItem.targets
        ) {
            for (let i = 0; i < message.flags.sourceItem.targets.length; i++) {
                const resultData = message.flags.resultData[i];
                const dialogOptions = message.flags.dialogOptions[i];

                const token = game.scenes.active.tokens.get(
                    message.flags.sourceItem.targetIds[i]
                );

                let targetEntity = {};
                if (token.isLinked) {
                    targetEntity = game.actors.get(token.actor.id);
                } else {
                    targetEntity = token.actor ?? token.actorData;
                }

                let targetData = targetEntity.system;

                if (item.type == "strike") {
                    if (resultData.hit) {
                        targetData.health.value -= 1;
                        targetData.threatDice = 0;
                    } else {
                        targetData.threatDice =
                            targetData.threatDice -
                            dialogOptions.variableDice +
                            resultData.successes;
                    }

                    await targetEntity.update({
                        system: targetData,
                    });
                } else if (item.type == "achievement") {
                    if (!resultData.hit) {
                        targetData.progressDice =
                            targetData.progressDice -
                            dialogOptions.variableDice +
                            resultData.successes;
                    }

                    await targetEntity.update({
                        system: targetData,
                    });
                }
            }
        }
    }
});

Hooks.once("init", async () => {
    game.animaprime = {
        AnimaPrimeItem,
        AnimaPrimeCombat,
        AnimaPrimeCombatant,
    };

    CONFIG.Actor.documentClass = AnimaPrimeActor;
    CONFIG.Item.documentClass = AnimaPrimeItem;
    CONFIG.Combat.documentClass = AnimaPrimeCombat;
    CONFIG.Combatant.documentClass = AnimaPrimeCombatant;
    CONFIG.ui.combat = AnimaPrimeCombatTracker;

    preloadTemplates();
    HandlebarsHelpers.registerHandlebarsHelpers();
    registerSheets();
    configureStatusEffects();

    await game.settings.register("animaprime", "commitedRerolls", {
        name: "Reroll List",
        hint: "Comma-separated list for reroll control",
        scope: "world",
        config: true,
        type: String,
        default: "",
        onChange: (value) => {
            console.log("reroll added: " + value);
        },
    });

    await game.settings.register("animaprime", "primaryColor", {
        name: "Primary Color",
        hint: "Color used on Sheets",
        scope: "client",
        config: true,
        type: String,
        default: "#643b68",
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
            id: "slowed",
            label: "Slowed",
            icon: "systems/animaprime/assets/icons/turtle.svg",
        },
        {
            id: "weakened",
            label: "Weakened",
            icon: "systems/animaprime/assets/icons/breaking-chain.svg",
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
