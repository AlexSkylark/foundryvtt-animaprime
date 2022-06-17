import * as PoisonRoll from "../dice-rolls/poison-roll.js";

export default class AnimaPrimeCombatTracker extends CombatTracker {
    constructor(options) {
        super(options);

        game.socket.on("system.animaprime", async (argument) => {
            if (argument.operation == "takeTurn") {
                await this.performTakeTurn(argument.id);
            } else if (argument.operation == "endTurn") {
                await this.performEndTurn();
            }
        });
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template:
                "/systems/animaprime/templates/sidebars/combat-tracker/combat-tracker.hbs",
        });
    }

    async getData() {
        var context = await super.getData();

        for (let t of context.turns) {
            const comb = await this.viewed.getEmbeddedDocument(
                "Combatant",
                t.id
            );

            t.faction = comb.faction;
        }

        if (this.viewed) {
            if (this.viewed.combsWaitingTurn.length > 0)
                context.activeFaction = this.viewed.combsWaitingTurn[0].faction;
            else if (this.viewed.combsOnQueue.length > 0)
                context.activeFaction = this.viewed.getMinObject(
                    this.viewed.combsOnQueue,
                    "initiative"
                ).faction;
            else context.activeFaction = "friendly";
        }

        return context;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find(".combatant-take-turn").click(
            this._onCombatantTakeTurn.bind(this)
        );

        html.find(".combat-custom-control").click(
            this._onCombatCustomControl.bind(this)
        );
    }

    async _onCombatantTakeTurn(ev) {
        ev.preventDefault();

        const combatantId = $(ev.currentTarget)
            .closest(".combatant")
            .data("combatantId");

        if (game.user.isGM) this.performTakeTurn(combatantId);
        else
            game.socket.emit("system.animaprime", {
                operation: "takeTurn",
                id: combatantId,
            });
    }

    async _onCombatCustomControl(ev) {
        ev.preventDefault();

        const combatantId = this.viewed.combatant.id;

        if (game.user.isGM) this.performEndTurn();
        else
            game.socket.emit("system.animaprime", {
                operation: "endTurn",
                id: combatantId,
            });
    }

    async performTakeTurn(combatantId) {
        if (!game.user.isGM) {
            ui.notifications.error("only a GM user can issue that command");
            return;
        }

        const lastComb = await this.viewed.getMinObject(
            this.viewed.combsOnQueue,
            "initiative"
        );

        await this.viewed.setInitiative(
            combatantId,
            this.viewed.combsOnQueue.length == 0
                ? 10000
                : lastComb.initiative - 1
        );

        const takeTurnComb = this.viewed.turns.find((a) => {
            return a.id == combatantId;
        });

        await this.viewed.resetInitiative(this.viewed.combsOutofQueue, false);

        while (takeTurnComb.id != this.viewed.combatant.id) {
            if (takeTurnComb.initiative >= this.viewed.combatant.initiative) {
                await this.viewed.previousTurn();
            } else {
                await this.viewed.nextTurn();
            }
        }

        const myComb = this.viewed.combatants.find((a) => {
            return a.id == combatantId;
        });

        // check doomed condition
        if (takeTurnComb.actor.checkCondition("doomed")) {
            const currentThreatDice = takeTurnComb.actor.data.data.threatDice;

            await takeTurnComb.actor.update({
                "data.threatDice": currentThreatDice + 2,
            });
        }

        // check poisoned condition
        if (takeTurnComb.actor.checkCondition("poisoned")) {
            const poisonItem = {
                name: "poison",
                owner: takeTurnComb.token,
                img: "icons/magic/death/skull-poison-green.webp",
            };

            PoisonRoll.poisonRoll(poisonItem);
        }
    }

    async performEndTurn() {
        if (!game.user.isGM) {
            ui.notifications.error("only a GM user can issue that command");
            return;
        }

        if (this.viewed.combsWaitingTurn.length > 0) {
            ui.notifications.error("A token needs to take this turn.");
            return;
        }

        if (this.viewed.combsOutofQueue.length == 0) {
            this.viewed.nextTurn();
            return;
        } else {
            if (
                this.viewed.combsOutofQueue.filter((t) => {
                    return t.isDefeated;
                }).length == this.viewed.combsOutofQueue.length
            ) {
                this.viewed.nextTurn();
                return;
            }
        }

        const lastComb = await this.viewed.getMinObject(
            this.viewed.combsOnQueue,
            "initiative"
        );

        let combsToReset = [];
        let nextFaction = lastComb.faction;

        while (combsToReset.length == 0) {
            nextFaction = this.getInverseFaction(nextFaction);

            for (let t of this.viewed.turns) {
                if (
                    t.faction == nextFaction &&
                    (t.initiative <= 1000 || t.initiative == null)
                )
                    combsToReset.push(t);
            }
        }

        this.viewed.resetInitiative(combsToReset, true);
    }

    getInverseFaction(faction) {
        return faction == "friendly" ? "hostile" : "friendly";
    }
}
