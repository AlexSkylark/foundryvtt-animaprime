import AnimaPrimeActorSheet from "./AnimaPrimeActorSheet.js";

export default class AnimaPrimeGoalSheet extends AnimaPrimeActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["animaprime", "sheet", "goal"],
            width: 480,
            height: 415,
            resizable: false,
            scale: 0.85,
        });
    }

    get template() {
        return `/systems/animaprime/templates/sheets/actor/actor-goal-sheet/actor-goal-sheet.hbs`;
    }

    async activateListeners(html) {
        await super.activateListeners(html);

        html.find(".header-name").on("focusout", async (ev) => {
            ev.preventDefault();
            const div = ev.currentTarget;

            if (div.innerText.length > 0) {
                await this.actor.update({ name: div.innerText });
                div.focus();
            }
        });
    }
}
