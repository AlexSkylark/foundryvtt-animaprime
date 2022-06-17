export default class AnimaPrimeActionSheet extends ItemSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["animaprime", "sheet", "item", "skill-sheet"],
            width: 500,
            height: 268,
            resizable: false,
        });
    }

    get template() {
        return `systems/animaprime/templates/sheets/item/item-action-sheet/item-action-sheet.hbs`;
    }

    getData() {
        const context = super.getData();
        const itemData = context.item.data;

        // Add the actor's data to context.data for easier access, as well as flags.
        context.data = itemData.data;
        context.flags = itemData.flags;

        return context;
    }

    async activateListeners(html) {
        html.find(".gain-select").change(async (ev) => {
            ev.preventDefault();

            let elem = ev.currentTarget;
            let field = elem.dataset.field;

            return await super.getData().item.update({ [field]: elem.value });
        });
    }
}
