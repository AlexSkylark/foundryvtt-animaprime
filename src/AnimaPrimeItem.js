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
        const itemData = this;
        const actorData = this.actor ? this.actor : {};
        const data = itemData;
    }

    prepareBaseData() {
        // Data modifications in this step occur before processing embedded
        // documents or derived data.
    }

    async _preCreate(data, options, user) {
        await super._preCreate(data, options, user);

        if (!data.img) {
            let image = "";
            switch (data.type) {
                case "skill":
                    image = "icons/skills/trades/academics-study-reading-book.webp";
                    break;
                case "maneuver":
                    image = "icons/magic/air/air-smoke-casting.webp";
                    break;
                case "strike":
                    image = "icons/weapons/swords/sword-guard-brown.webp";
                    break;
                case "power":
                    image = "icons/magic/light/projectile-smoke-blue.webp";
                    break;
                case "boost":
                    image = "icons/skills/movement/arrow-upward-yellow.webp";
                    break;
                case "reaction":
                    image = "icons/skills/targeting/target-strike-triple-blue.webp";
                    break;
                case "extra":
                    image = "icons/commodities/materials/feather-orange.webp";
                    break;
                case "achievement":
                    image = "icons/sundries/books/book-red-exclamation.webp";
                    break;
            }

            this.img = image;
            this._source.img = image;
            await this.updateSource();
        }
    }

    async roll(ctrl, shift, alt) {
        // validations
        if (this.type != "skill") {
            if (!game.combats.active) {
                ui.notifications.error("There is no active combat.");
                return;
            } else {
                if (game.combats.active.combsWaitingTurn.length > 0) {
                    ui.notifications.error("A unit needs to take this turn.");
                    return;
                }
                const currentCombatActor = game.combats.active.getCurrentActor();

                if (this.type != "reaction" && currentCombatActor.id != this.actor.id) {
                    ui.notifications.error("It's somebody else's turn now!");
                    return;
                }
            }
        }

        let itemData = {
            ...this,
            owner: this.actor,
        };

        switch (this.type) {
            case "skill":
                SkillDiceRoll.skillCheck(itemData, ctrl, shift);
                break;
            case "maneuver":
                ManeuverDiceRoll.maneuverRoll(itemData);
                break;
            case "strike":
            case "achievement":
                itemData.targets = [];
                itemData.targetIds = [];
                await game.user.targets.forEach((element) => {
                    itemData.targets.push(element.document.actor);
                    itemData.targetIds.push(element._id ?? element.id);
                });

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
