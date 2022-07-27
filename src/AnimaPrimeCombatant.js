export default class AnimaPrimeCombatant extends Combatant {
    constructor(data, context) {
        super(data, context);

        this.data.flags = { isOnTurn: false };
    }

    get isOnTurn() {
        return this.data.flags.isOnTurn;
    }

    get faction() {
        return this.actor.type == "character" ? "friendly" : "hostile";
    }

    get healthValue() {
        return (
            this.actor.data.data.health.value +
            "/" +
            this.actor.data.data.health.max
        );
    }

    get threatValue() {
        return this.actor.data.data.threatDice;
    }

    prepareBaseData() {
        super.prepareBaseData();
    }

    get controlling() {
        return this.players.includes(game.user);
    }
}
