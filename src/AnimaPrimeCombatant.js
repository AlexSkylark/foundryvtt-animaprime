export default class AnimaPrimeCombatant extends Combatant {
    constructor(data, context) {
        super(data, context);

        this.flags = { isOnTurn: false };
    }

    get initPlus10() {
        return this.initiative + 10;
    }

    get isOnTurn() {
        const combat = game.combats.active;

        if (!combat || !combat.getCurrentCombatant()) return false;

        return combat.getCurrentCombatant().id == this.id && combat.combsWaitingTurn.length == 0;
    }

    get isAlly() {
        return this.actor.type == "ally";
    }

    get faction() {
        if (this.actor.type == "character" || this.actor.type == "ally") {
            return "friendly";
        } else if (this.actor.type == "vehicle") {
            return this.actor.system.type == "0" ? "friendly" : "hostile";
        } else {
            return "hostile";
        }
    }

    get healthValue() {
        return " " + this.actor.system.health.value + "/" + this.actor.system.health.max + " (" + (Math.round((this.actor.system.health.value / this.actor.system.health.max) * 100) + "%)");
    }

    get threatStatus() {
        const percent = this.actor.system.threatDice / this.actor.system.defense;

        if (percent == 0) {
            return { status: "Guarded", level: 0 };
        } else if (percent <= 0.15) {
            return { status: "Cautious", level: 1 };
        } else if (percent <= 0.5) {
            return { status: "Exposed", level: 2 };
        } else if (percent <= 0.75) {
            return { status: "Vulnerable", level: 3 };
        } else if (percent <= 1.1) {
            return { status: "Defenseless", level: 4 };
        } else {
            return { status: "Fatal Opening", level: 5 };
        }
    }

    get healthStatus() {
        const wounds = this.actor.system.health.value;
        const maxWounds = this.actor.system.health.max;
        const remainingWounds = this.actor.system.health.max - this.actor.system.health.value;

        if (wounds == 0) {
            return { status: "Untouched", level: 0 };
        } else if (maxWounds == 2) {
            if (remainingWounds > 0) {
                return { status: "Wounded", level: 3 };
            }
        } else if (maxWounds == 3) {
            if (remainingWounds == 2) {
                return { status: "Injured", level: 2 };
            } else if (remainingWounds == 1) {
                return { status: "Wounded", level: 3 };
            }
        } else {
            if (remainingWounds == 3) {
                return { status: "Injured", level: 2 };
            } else if (remainingWounds == 2) {
                return { status: "Wounded", level: 3 };
            } else if (remainingWounds == 1) {
                return { status: "Critical Condition", level: 4 };
            } else if (remainingWounds > 0) {
                return { status: "Grazed", level: 1 };
            }
        }
    }

    get displayName() {
        return this.name;
    }

    get threatValue() {
        return this.actor.system.threatDice;
    }

    prepareBaseData() {
        super.prepareBaseData();
    }

    get controlling() {
        return this.players.includes(game.user);
    }
}
