export default class AnimaPrimeCombat extends Combat {
    prepareData() {
        super.prepareData();
    }

    prepareBaseData() {
        super.prepareBaseData();
    }

    async startCombat() {
        super.startCombat();

        await super.update({ sheet: "open" });

        await this.resetInitiative(this.combsFriendly, true);
        await this.resetInitiative(this.combsHostile, false);
    }

    async nextRound() {
        super.nextRound();

        await this.resetInitiative(this.combsFriendly, true);
        await this.resetInitiative(this.combsHostile, false);

        for (let token of game.scenes.active.tokens) {
            let data = token.actor.data.data;

            if (token.actor.type == "goal") {
                if (data.looming) {
                    const newValue = Math.max(data.loomingTurns - 1, 0);
                    await token.actor.update({ "data.loomingTurns": newValue });
                    if (newValue > 0)
                        ui.notifications.warn(
                            `Looming conflict goal "${
                                token.actor.name
                            }" will expire in ${newValue} ${
                                newValue > 1 ? "turns" : "turn"
                            }! Hurry up!`
                        );
                    else
                        ui.notifications.warn(
                            `Looming conflict goal "${token.actor.name} has EXPIRED!!!`
                        );
                }
            }
        }
    }

    async _onCreateEmbeddedDocuments(
        embeddedName,
        documents,
        result,
        options,
        userId
    ) {
        await super._onCreateEmbeddedDocuments(
            embeddedName,
            documents,
            result,
            options,
            userId
        );

        if (this.combsWaitingTurn.length) {
            let faction = this.combsWaitingTurn.find((a) => {
                return a.initiative == 1000;
            }).faction;
            for (let i = 0; i < documents.length; i++) {
                if (documents[i].faction == faction) {
                    let lastInitiative = this.getMinObject(
                        this.combsWaitingTurn,
                        "initiative"
                    ).initiative;
                    await this.setInitiative(
                        documents[i].id,
                        lastInitiative - 1
                    );
                }
            }
        }
    }

    async resetInitiative(combatants, takeTurn) {
        let startingNumber = takeTurn ? 1000 : 0;

        for (
            let i = startingNumber;
            Math.abs(i - startingNumber) < combatants.length;
            i--
        ) {
            await this.setInitiative(
                combatants[Math.abs(i - startingNumber)].id,
                i
            );
        }
    }

    get combsOnQueue() {
        return this.turns.filter((i) => {
            return i.initiative > 1000;
        });
    }

    get combsOutofQueue() {
        return this.turns.filter((i) => {
            return i.initiative <= 1000;
        });
    }

    get combsWaitingTurn() {
        return this.turns.filter((i) => {
            return i.initiative <= 1000 && i.initiative > 0;
        });
    }

    get combsNotWaitingTurn() {
        return this.turns.filter((i) => {
            return i.initiative <= 0;
        });
    }

    get combsFriendly() {
        return this.turns.filter((i) => {
            return i.faction == "friendly";
        });
    }

    get combsHostile() {
        return this.turns.filter((i) => {
            return i.faction == "hostile";
        });
    }

    getMinObject(array, attrib) {
        return (
            (array.length &&
                array.reduce(function (prev, curr) {
                    return prev[attrib] < curr[attrib] ? prev : curr;
                })) ||
            null
        );
    }
}
