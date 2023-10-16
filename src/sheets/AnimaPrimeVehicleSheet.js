import AnimaPrimeActorSheet from "./AnimaPrimeActorSheet.js";

export default class AnimaPrimeVehicleSheet extends AnimaPrimeActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            width: 645,
            height: this.prototype.editUnlocked ? 745 : 310,
        });
    }

    async activateListeners(html) {
        await super.activateListeners(html);

        html.find(".type-select").change(async (ev) => {
            ev.preventDefault();

            let elem = ev.currentTarget;
            let field = elem.dataset.field;

            return await this.document.update({ [field]: elem.value });
        });
    }
}
