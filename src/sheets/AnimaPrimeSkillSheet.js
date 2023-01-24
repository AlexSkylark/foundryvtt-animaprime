export default class AnimaPrimeSkillSheet extends ItemSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["animaprime", "sheet", "item", "skill-sheet"],
            template:
                "systems/animaprime/templates/sheets/item/item-skill-sheet/item-skill-sheet.hbs",
            width: 300,
            height: 103,
            resizable: false,
        });
    }

    getData() {
        const context = super.getData();
        const itemData = context.item.system;

        // Add the actor's data to context.system for easier access, as well as flags.
        context.system = itemData.system;
        context.img = context.flags = itemData.flags;

        return context;
    }
}
