import * as SkillDiceRoll from "./dice-rolls/skill-roll.js";
import * as ManeuverDiceRoll from "./dice-rolls/maneuver-roll.js";
import * as AttackDiceRoll from "./dice-rolls/attack-roll.js";
import * as PowerRoll from "./dice-rolls/power-roll.js";

export default class AnimaPrimeItem extends Item {
    chatTemplate = {
        skill: "systems/animaprime/templates/rolls/roll-skill.hbs",
    };

    prepareData() {
        super.prepareData();

        // Get the Item's data
        const itemData = this.data;
        const actorData = this.actor ? this.actor.data : {};
        const data = itemData.data;
    }

    prepareBaseData() {
        // Data modifications in this step occur before processing embedded
        // documents or derived data.
    }

    _onCreate(data, options, userId) {
        super._onCreate(data, options, userId);

        switch (data.type) {
            case "skill":
                data.img =
                    "icons/skills/trades/academics-study-reading-book.webp";
                break;
            case "maneuver":
                data.img = "icons/magic/air/air-smoke-casting.webp";
                break;
            case "strike":
                data.img = "icons/weapons/swords/sword-guard-brown.webp";
                break;
            case "power":
                data.img = "icons/magic/light/projectile-smoke-blue.webp";
                break;
            case "boost":
                data.img = "icons/skills/movement/arrow-upward-yellow.webp";
                break;
            case "reaction":
                data.img =
                    "icons/skills/targeting/target-strike-triple-blue.webp";
                break;
            case "extra":
                data.img = "icons/commodities/materials/feather-orange.webp";
                break;
            case "achievement":
                data.img = "icons/sundries/books/book-red-exclamation.webp";
                break;
        }

        return data;
    }

    async roll(ctrl, shift, alt) {
        let targetActors = [];

        for (let tgt of game.user.targets) {
            targetActors.push(tgt.document.actor);
        }

        let itemData = {
            ...this.data,
            owner: this.actor,
            targets: targetActors,
        };

        switch (this.data.type) {
            case "skill":
                SkillDiceRoll.skillCheck(itemData, ctrl, shift);
                break;
            case "maneuver":
                ManeuverDiceRoll.maneuverRoll(itemData);
                break;
            case "strike":
            case "achievement":
                AttackDiceRoll.attackRoll(itemData);
                break;
            case "power":
            case "boost":
            case "reaction":
            case "extra":
                PowerRoll.powerRoll(itemData);
                break;
        }
    }
}
