import * as SkillDiceRoll from "./dice-rolls/skill-roll.js";
import * as ManeuverDiceRoll from "./dice-rolls/maneuver-roll.js";
import * as AttackDiceRoll from "./dice-rolls/attack-roll.js";
import * as PowerRoll from "./dice-rolls/power-roll.js";
import * as ScriptEngine from "./AnimaPrimeScriptEngine.js";

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
            owner: this.parent,
            originalItem: this
        };

        // validate boost action type
        if (game.combats.active && game.combats.active.flags.actionBoost?.validActions) {
            const boostedActionValid = game.combats.active.flags.actionBoost.validActions.indexOf(this.type) >= 0;
            if (!boostedActionValid) {
                ui.notifications.error("The current active boost can only enhance these action types: " + game.combats.active.flags.actionBoost.validActions.replace(",", ", ").toUpperCase());
                return;
            }
        }

        // execute validations as defined in script
        if (itemData.system.scriptValidations?.trim()) {
            let valid = await ScriptEngine.executeValidations(itemData);
            if (!valid) return;
        }

        // check if unit has enough charge to cast action
        itemData.capitalizedType = itemData.type.charAt(0).toUpperCase() + itemData.type.slice(1);
        const ownerChargeDice = itemData.owner.system.chargeDice;
        const isHexed = itemData.owner.checkCondition("hexed");
        if (isHexed) itemData.system.cost += 1;
        if (ownerChargeDice < itemData.system.cost) {
            ui.notifications.error(
                `Not enough available charge dice to cast this ${itemData.capitalizedType}.`
            );
            return;
        }

        itemData.targets = [];
        itemData.targetIds = [];

        for (let element of game.user.targets) {
            itemData.targets.push(element.document.actor);
            itemData.targetIds.push(element._id ?? element.id);
            itemData.targets[itemData.targets.length - 1].tokenId = element.document.id;
        }

        switch (this.type) {
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
