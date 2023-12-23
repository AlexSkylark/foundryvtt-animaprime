export default class AnimaPrimeActionHUD extends Application {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "/systems/animaprime/templates/huds/action-hud.hbs",
            id: "action-hud",
            classes: [],
            width: 200,
            height: 20,
            left: 150,
            top: 80,
            scale: 1,
            background: "none",
            popOut: false,
            minimizable: false,
            resizable: false,
            title: "action-hud",
            dragDrop: [],
            tabs: [],
            scrollY: [],
        });
    }

    async getData(options = {}) {
        let data = super.getData();

        let combatant = game.combats.active.getCurrentCombatant();

        if (combatant && combatant.isOnTurn) {
            let actor = game.combats.active.getActorFromCombatant(combatant);

            if (actor.isOwner) {
                const actionsCollection = actor.getEmbeddedCollection("Item").filter((i) => i.type != "skill");

                data.basicActions = actionsCollection.filter((i) => i.system.basic == true);
                data.mainActions = actionsCollection.filter((i) => i.system.basic == false);

                return data;
            }
        }

        return [];
    }

    async activateListeners(html) {
        await super.activateListeners(html);
        html.find(".item-roll").click(this._onItemRoll.bind(this));
    }

    async _onItemRoll(ev) {
        ev.preventDefault();
        ev.stopPropagation();

        const item = game.combats.active.getCurrentActor().getEmbeddedDocument("Item", $(ev.currentTarget).closest(".item").data("itemId"));

        await item.roll(ev.ctrlKey, ev.shiftKey);
    }
}
