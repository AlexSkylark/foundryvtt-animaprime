export default class AnimaPrimeCombat extends Combat {
    isUpdating = false;

    prepareData() {
        super.prepareData();
    }

    async startCombat() {
        ui.combat.updateRender(true);

        super.startCombat();

        await super.update({ sheet: "open" });

        this.turns.forEach(async (combatant) => {
            let actorData = combatant.actor.system;

            if (combatant.actor.type == "character") actorData.actionDice = actorData.actionDiceMax;
            if (combatant.actor.type == "vehicle") actorData.chargeDice = parseInt(actorData.chargeDiceMax);

            actorData.strikeDice = 0;
            actorData.threatDice = 0;

            await combatant.actor.update({ system: actorData });
        });

        await this.resetInitiative(this.combsFriendly, true);
        await this.resetInitiative(this.combsHostile, false);

        ui.combat.updateRender(false);
    }

    async nextRound() {
        await super.nextRound();

        await this.resetInitiative(this.combsFriendly, true);
        await this.resetInitiative(this.combsHostile, false);

        for (let token of game.scenes.active.tokens) {
            let data = token.actor.system;

            if (token.actor.type == "goal") {
                if (data.loomingTurns > 0) {
                    const newValue = Math.max(data.loomingTurns - 1, 0);
                    await token.actor.update({
                        "system.loomingTurns": newValue,
                    });
                    if (newValue > 0) ui.notifications.warn(`Looming conflict goal "${token.actor.name}" will expire in ${newValue} ${newValue > 1 ? "turns" : "turn"}! Hurry up!`);
                    else ui.notifications.warn(`Looming conflict goal "${token.actor.name} has EXPIRED!!!`);
                }
            }
        }
    }

    async endCombat() {
        const end = await super.endCombat();

        if (end) {
            this.turns.forEach(async (combatant) => {
                let actorData = combatant.actor.system;

                actorData.actionDice = 0;
                actorData.chargeDice = 0;
                actorData.strikeDice = 0;
                actorData.threatDice = 0;

                await game.combats.active.update({ "flags.commitedRerolls": "" });
                await game.combats.active.update({ "flags.actionBoost": null });

                await combatant.actor.deleteEmbeddedDocuments("ActiveEffect", combatant.actor.temporaryEffects.map(e => e.id))
                await combatant.actor.update({ system: actorData }, { render: false });
            });
        }

        await game.actionHud.render(true);
    }

    async _onCreate(data, options, userId) {
        if (!this.collection.viewed) ui.combat.initialize({ combat: this, render: false });
    }

    async _onCreateEmbeddedDocuments(embeddedName, documents, result, options, userId) {
        await super._onCreateEmbeddedDocuments(embeddedName, documents, result, options, userId);

        if (this.combsWaitingTurn.length) {
            let faction = this.combsWaitingTurn.find((a) => {
                return a.initiative == 1000;
            }).faction;
            for (let i = 0; i < documents.length; i++) {
                if (documents[i].faction == faction) {
                    let lastInitiative = this.getMinObject(this.combsWaitingTurn, "initiative").initiative;
                    await this.setInitiative(documents[i].id, lastInitiative - 1);
                }
            }
        }
    }

    async resetInitiative(combatants, takeTurn) {
        let startingNumber = takeTurn ? 1000 : 0;

        for (let i = startingNumber; Math.abs(i - startingNumber) < combatants.length; i--) {
            await this.setInitiative(combatants[Math.abs(i - startingNumber)].id, i);
        }
    }

    async setInitiative(id, value) {
        const combatant = this.combatants.get(id, { strict: true });
        await combatant.update({ initiative: value }, { render: false });
    }

    async handleDispositionChange(disposition, tokenId) {
        ui.combat.updateRender(true);

        const dispositionChangeComb = this.combatants.find((tk) => tk.tokenId == tokenId);

        if (dispositionChangeComb.initiative <= 1000) {

            await this.setInitiative(dispositionChangeComb.id, 9999);
            await this.setInitiative(dispositionChangeComb.id, this.getMinObject(disposition == 1 ? this.combsFriendly : this.combsHostile, "initiative").initiative - 1)

            await this.resetInitiative(this.combsWaitingTurn, true)
            await this.resetInitiative(this.combsNotWaitingTurn, false)
        }

        ui.combat.updateRender(false);
    }

    get combsOnQueue() {
        return this.turns.filter((i) => {
            return i.initiative > 1000 && i.hidden == false;
        });
    }

    get combsOutofQueue() {
        return this.turns.filter((i) => {
            return i.initiative <= 1000 && i.hidden == false;
        });
    }

    get combsWaitingTurn() {
        return this.turns.filter((i) => {
            return i.initiative <= 1000 && i.initiative > 0 && i.hidden == false;
        });
    }

    get combsNotWaitingTurn() {
        return this.turns.filter((i) => {
            return i.initiative <= 0 && i.hidden == false;
        });
    }

    get combsFriendly() {
        return this.turns.filter((i) => {
            return i.faction == "friendly" && i.hidden == false;
        });
    }

    get combsFriendlyWaitingTurn() {
        const friendlies = this.turns.filter((i) => {
            return i.faction == "friendly" && i.actor.type != "ally" && i.hidden == false;
        });

        return friendlies.filter((i) => {
            return i.initiative <= 1000 && i.initiative > 0;
        });
    }

    get combsHostile() {
        return this.turns.filter((i) => {
            return i.faction == "hostile" && i.hidden == false;
        });
    }

    get isOwnerOfCurrentComb() {
        const comb = this.getCurrentCombatant();
        if (comb) return comb.isOwner;
        else return false;
    }

    get currentFaction() {
        const comb = this.getCurrentCombatant();
        return comb ? this.getCurrentCombatant().faction : "";
    }

    getCurrentActor() {
        const currentComb = this.getCurrentCombatant();
        if (!currentComb) return null;
        const token = game.scenes.active.tokens.get(currentComb.token.id);
        if (token.isLinked) {
            return game.actors.get(token.actor.id);
        } else {
            return token.actor ?? token.actorData;
        }
    }

    getActorFromCombatant(comb) {
        const token = comb.token;
        if (token.isLinked) {
            return game.actors.get(token.actor.id);
        } else {
            return token.actor ?? token.actorData;
        }
    }

    getCurrentCombatant() {
        if (this.combsOnQueue.length == 0) return null;
        return this.getMinObject(this.combsOnQueue, "initiative");
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
