export default class AnimaPrimeCombatant extends Combatant {
    constructor(data, context) {
        super(data, context);

        this.flags = { isOnTurn: false };
    }

    get isOnTurn() {
        return this.flags.isOnTurn;
    }

    get faction() {
        return this.actor.type == "character" ? "friendly" : "hostile";
    }

    get healthValue() {
        return (
            this.actor.system.health.value + "/" + this.actor.system.health.max
        );
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
