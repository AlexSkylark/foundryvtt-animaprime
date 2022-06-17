export default class AnimaPrimeGoalSheet extends ActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["animaprime", "sheet", "goal"],
            width: 470,
            height: 430,
            resizable: false,
            scale: 0.85,
        });
    }

    get template() {
        return `/systems/animaprime/templates/sheets/actor/actor-goal-sheet/actor-goal-sheet.hbs`;
    }

    getData() {
        const context = super.getData();
        const actorData = context.actor.data;

        // Add the actor's data to context.data for easier access, as well as flags.
        context.data = actorData.data;
        context.flags = actorData.flags;

        return context;
    }

    activateListeners(html) {
        html.find(".button-changevalue").click(
            this._onPropertyIncrementValue.bind(this)
        );
    }

    async _onPropertyIncrementValue(ev) {
        ev.preventDefault();

        let propertyName = ev.currentTarget.dataset.property;
        let propertyValue = this.actor.data.data[propertyName];

        let operation = ev.currentTarget.dataset.operation;
        let newValue =
            operation == "plus" ? propertyValue + 1 : propertyValue - 1;
        newValue = Math.max(newValue, 0);

        let updateObject = { data: {} };
        updateObject.data[propertyName] = newValue;

        await this.actor.update(updateObject);
    }
}
