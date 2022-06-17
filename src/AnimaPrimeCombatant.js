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

    prepareBaseData() {
        super.prepareBaseData();
    }

    get controlling() {
        return this.players.includes(game.user);
    }
}
