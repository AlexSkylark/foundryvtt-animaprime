import * as PoisonRoll from "../dice-rolls/poison-roll.js";

export default class AnimaPrimeCombatTracker extends CombatTracker {
    turnTakable = true;

    constructor(options) {
        super(options);

        game.socket.on("system.animaprime", async (argument) => {
            if (game.user.isGM) {
                if (argument.operation == "takeTurn") {
                    if (this.turnTakable) {
                        this.turnTakable = false;
                        await this.updateRender(true);
                        await this.performTakeTurn(argument.id);
                        await this.updateRender(false);
                    }
                } else if (argument.operation == "endTurn") {
                    await this.updateRender(true);
                    await this.performEndTurn();
                    await this.updateRender(false);
                    this.turnTakable = true;
                } else if (argument.operation == "cancelTurn") {
                    await this.updateRender(true);
                    await this.performCancelTurn();
                    await this.updateRender(false);
                    this.turnTakable = true;
                } else if (argument.operation == "turnTakable") {
                    this.turnTakable = argument.takable;
                }
            } else {
                if (argument.operation == "refreshSidebar") {
                    await this.updateRender(argument.isUpdating);
                }
            }
        });
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: "/systems/animaprime/templates/sidebars/combat-tracker/combat-tracker.hbs",
        });
    }

    async getData() {
        var context = await super.getData();

        for (let t of context.turns) {
            const comb = await this.viewed.getEmbeddedDocument("Combatant", t.id);

            if (comb.actor.type == "goal") continue;

            t.name = comb.actor.name;
            t.faction = comb.faction;
            t.isAlly = comb.isAlly;
            t.healthValue = comb.healthValue;
            t.threatValue = comb.threatValue;
            t.threatStatus = comb.threatStatus;
            t.healthStatus = comb.healthStatus;
            t.displayName = comb.displayName;
            t.isOnTurn = comb.isOnTurn;
            t.initPlus10 = comb.initPlus10;
        }

        if (this.viewed) {
            if (this.viewed.combsWaitingTurn.length > 0) context.activeFaction = this.viewed.combsWaitingTurn[0].faction;
            else if (this.viewed.combsOnQueue.length > 0) context.activeFaction = this.viewed.getMinObject(this.viewed.combsOnQueue, "initiative").faction;
            else context.activeFaction = "friendly";
        }

        return context;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find(".combatant-take-turn").click(this._onCombatantTakeTurn.bind(this));

        html.find(".combat-custom-control").click(this._onCombatCustomControl.bind(this));
    }

    async _onCombatantTakeTurn(ev) {
        ev.preventDefault();

        const combatantId = $(ev.currentTarget).closest(".combatant").data("combatantId");

        if (game.user.isGM) {
            await this.updateRender(true);
            await this.performTakeTurn(combatantId);
            await this.updateRender(false);
        } else {
            game.socket.emit("system.animaprime", {
                operation: "takeTurn",
                id: combatantId,
            });
        }
    }

    async _onCombatCustomControl(ev) {
        ev.preventDefault();

        const combatantId = this.viewed.combatant.id;

        if (ev.currentTarget.dataset.control == "cancelTurn") {
            if (game.user.isGM) {
                await this.updateRender(true);
                await this.performCancelTurn();
                await this.updateRender(false);
                this.turnTakable = true;
            } else {
                game.socket.emit("system.animaprime", {
                    operation: "turnTakable",
                    takable: true,
                });

                game.socket.emit("system.animaprime", {
                    operation: "cancelTurn",
                    id: combatantId,
                });
            }
        } else if (ev.currentTarget.dataset.control == "endTurn") {
            if (game.user.isGM) {
                await this.updateRender(true);
                await this.performEndTurn();
                await this.updateRender(false);
                this.turnTakable = true;
            } else {
                game.socket.emit("system.animaprime", {
                    operation: "turnTakable",
                    takable: true,
                });

                game.socket.emit("system.animaprime", {
                    operation: "endTurn",
                    id: combatantId,
                });
            }
        }
    }

    async updateRender(updating) {
        if (updating == false) {
            this.pauseForRender(500).then(async () => {
                this.viewed.isUpdating = updating;
                await ui.combat.render();
                this.pauseForRender(1).then(async () => {
                    $(".main-queue").scrollTop($(".main-queue")[0].scrollHeight);
                });
            });
        } else {
            this.viewed.isUpdating = updating;
            await ui.combat.render();
        }

        if (game.user.isGM) {
            game.socket.emit("system.animaprime", {
                operation: "refreshSidebar",
                isUpdating: updating,
            });
        }
        await game.actionHud.render(true);
    }

    pauseForRender(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async performTakeTurn(combatantId) {
        if (!game.user.isGM) {
            ui.notifications.error("only a GM user can issue that command");
            return;
        }

        const lastComb = await this.viewed.getMinObject(this.viewed.combsOnQueue, "initiative");

        await this.viewed.setInitiative(combatantId, this.viewed.combsOnQueue.length == 0 ? 10000 : lastComb.initiative - 10);

        const takeTurnComb = this.viewed.turns.find((a) => {
            return a.id == combatantId;
        });

        await this.viewed.resetInitiative(this.viewed.combsOutofQueue, false);

        // set combatant as current turn
        let takenTurn = this.viewed.turns.indexOf(takeTurnComb)

        await this.viewed.update({ turn: takenTurn });

        // check doomed condition
        if (takeTurnComb.actor.checkCondition("doomed")) {
            const currentThreatDice = takeTurnComb.actor.system.threatDice;

            await takeTurnComb.actor.update({
                "system.threatDice": currentThreatDice + 2,
            });
        }

        // check poisoned condition
        if (takeTurnComb.actor.checkCondition("poisoned")) {
            const poisonItem = {
                name: "poisoned",
                owner: takeTurnComb.token,
                img: "icons/magic/death/skull-poison-green.webp",
            };

            PoisonRoll.poisonRoll(poisonItem);
        }

        // check burning condition
        if (takeTurnComb.actor.checkCondition("burning")) {
            const poisonItem = {
                name: "burning",
                owner: takeTurnComb.token,
                img: "icons/magic/fire/flame-burning-embers-orange.webp",
            };

            PoisonRoll.poisonRoll(poisonItem);
        }

        // check bleeding condition
        if (takeTurnComb.actor.checkCondition("bleeding")) {
            const poisonItem = {
                name: "bleeding",
                owner: takeTurnComb.token,
                img: "icons/skills/wounds/blood-drip-droplet-red.webp",
            };

            PoisonRoll.poisonRoll(poisonItem);
        }
        await game.actionHud.render(true);
    }

    async performCancelTurn() {
        if (!game.user.isGM) {
            ui.notifications.error("only a GM user can issue that command");
            return;
        }

        if (this.viewed.combsOnQueue.length == 0) {
            return;
        }

        let lastComb = await this.viewed.getMinObject(this.viewed.combsOnQueue, "initiative");

        let combsToReset = [];
        if (this.viewed.combsWaitingTurn.length == 0) {
            combsToReset.push(lastComb);
            combsToReset = combsToReset.concat(this.viewed.combsOnQueue.filter((x) => x.initiative % 10 != 0 && x.initiative > lastComb.initiative && x.initiative < lastComb.initiative + 10));
            combsToReset = combsToReset.concat(this.viewed.combsOutofQueue.filter((x) => x.faction == lastComb.faction && !x.isDefeated));
            await this.viewed.resetInitiative(combsToReset, true);
        } else {
            const nextFaction = lastComb ? this.getInverseFaction(lastComb.faction) : "friendly";
            combsToReset = combsToReset.concat(this.viewed.combsOnQueue.filter((x) => x.initiative % 10 != 0 && x.initiative > lastComb.initiative && x.initiative < lastComb.initiative + 10));
            combsToReset = combsToReset.concat(this.viewed.combsOutofQueue.filter((x) => x.faction == nextFaction && !x.isDefeated));
            await this.viewed.resetInitiative(this.viewed.combsOutofQueue, false);

            lastComb = await this.viewed.getMinObject(this.viewed.combsOnQueue, "initiative");
            await this.viewed.update({ turn: this.viewed.turns.indexOf(lastComb)});
        }

        /*
        if (this.viewed.combsOnQueue.length > 1 && this.viewed.combsWaitingTurn == 0 && this.viewed.getCurrentCombatant().id == this.viewed.current.combatantId) {
            this.viewed.previousTurn();
        }*/

        await game.actionHud.render(true);
    }

    async performEndTurn() {
        if (!game.user.isGM) {
            return;
        }

        if (this.viewed.combsWaitingTurn.length > 0) {
            ui.notifications.error("A unit needs to take this turn.");
            return;
        }

        if (this.viewed.combsOutofQueue.length == 0) {
            await this.viewed.nextRound();
            return;
        } else {
            if (
                this.viewed.combsOutofQueue.filter((t) => {
                    return t.isDefeated;
                }).length == this.viewed.combsOutofQueue.length
            ) {
                await this.viewed.nextRound();
                return;
            }
        }

        const lastComb = await this.viewed.getMinObject(this.viewed.combsOnQueue, "initiative");

        let combsToReset = [];
        let nextFaction = lastComb.faction;

        while (combsToReset.length == 0) {
            nextFaction = this.getInverseFaction(nextFaction);

            for (let t of this.viewed.turns) {
                if (t.faction == nextFaction && (t.initiative <= 1000 || t.initiative == null) && !t.isDefeated) combsToReset.push(t);
            }
        }

        await this.viewed.resetInitiative(combsToReset, true);
        await game.actionHud.render(true);
    }

    getInverseFaction(faction) {
        return faction == "friendly" ? "hostile" : "friendly";
    }

    getCurrentTurnToken() {
        return ui.combat.viewed.getEmbeddedDocument("Combatant", ui.combat.viewed.current.combatantId).token;
    }
}
