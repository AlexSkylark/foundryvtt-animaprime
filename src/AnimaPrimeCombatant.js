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
        return " " + (Math.round((this.actor.system.health.value / this.actor.system.health.max) * 100) + "%");
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
