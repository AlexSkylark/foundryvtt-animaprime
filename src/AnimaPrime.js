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

Hooks.once("init", () => {
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
});

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
