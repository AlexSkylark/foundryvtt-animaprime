export default class AnimaPrimeCombatant extends Combatant {
    constructor(data, context) {
        super(data, context);

        this.flags = { isOnTurn: false };
    }

    get isOnTurn() {
        const combat = game.combats.active;

        if (!combat || !combat.getCurrentCombatant()) return false;

        return (
            combat.getCurrentCombatant().id == this.id &&
            combat.combsWaitingTurn.length == 0
        );
    }

    get faction() {
        return this.actor.type == "character" ? "friendly" : "hostile";
    }

    get healthValue() {
        return (
            this.actor.system.health.value + "/" + this.actor.system.health.max
        );
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
