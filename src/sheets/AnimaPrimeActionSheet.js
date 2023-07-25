export default class AnimaPrimeActionSheet extends ItemSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["animaprime", "sheet", "item", "skill-sheet"],
            width: 500,
            height: 305,
            resizable: false,
        });
    }

    get template() {
        return `systems/animaprime/templates/sheets/item/item-action-sheet/item-action-sheet.hbs`;
    }

    getData() {
        const context = super.getData();
        const itemData = context.item.system;

        // Add the actor's data to context.system for easier access, as well as flags.
        context.system = itemData;

        return context;
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html.find(".gain-select").change(async (ev) => {
            ev.preventDefault();

            let elem = ev.currentTarget;
            let field = elem.dataset.field;

            return await super.getData().item.update({ [field]: elem.value });
        });
    }
}
