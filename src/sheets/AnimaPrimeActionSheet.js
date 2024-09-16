import AnimaPrimeScriptEditor from "./AnimaPrimeScriptEditor.js";

export default class AnimaPrimeActionSheet extends ItemSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["animaprime", "sheet", "item", "skill-sheet"],
            width: 500,
            height: 320,
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

            return await this.item.update({ [field]: elem.value });
        });

        html.find(".textarea-event").change(async (ev) => {
            ev.preventDefault();

            const elem = ev.currentTarget;
            const prop = ev.currentTarget.dataset.event;

            return await this.item.update({ [prop]: ev.detail?.scriptValue ?? elem.value });
        });


        html.find(".script-button").click(this._openScriptEditor.bind(this));
    }

    _openScriptEditor(event) {
        const $this = $(this);
        const target = $(event.currentTarget).siblings()
        if (!target) { return; }
        const te = new AnimaPrimeScriptEditor({ target });
        te.render(true);
    }
}
