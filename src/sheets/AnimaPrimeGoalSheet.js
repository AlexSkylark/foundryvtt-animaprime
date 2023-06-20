import AnimaPrimeActorSheet from "./AnimaPrimeActorSheet.js";

export default class AnimaPrimeGoalSheet extends AnimaPrimeActorSheet {
    static get defaultOptions() {
        let windowHeight = 487;

        return mergeObject(super.defaultOptions, {
            classes: ["animaprime", "sheet", "goal"],
            width: 480,
            height: windowHeight,
            resizable: false,
        });
    }

    get template() {
        return `/systems/animaprime/templates/sheets/actor/actor-goal-sheet/actor-goal-sheet.hbs`;
    }

    async activateListeners(html) {
        await super.activateListeners(html);

        var windowRoot = html
            .find(".goal-sheet-" + this.actor.id)
            .parents("#" + this.id)[0];

        if (!game.user.isGM) {
            let newHeight = 487;
            if (this.actor.system.type == "1") {
                newHeight -= 200;
            } else {
                newHeight -= 132;
            }

            if (this.actor.system.loomingTurns) {
                newHeight += 69;
            }

            windowRoot.style.height = newHeight + "px";
        }

        html.find(".header-name").on("focusout", async (ev) => {
            ev.preventDefault();
            const div = ev.currentTarget;

            if (div.innerText.length > 0) {
                await this.actor.update({ name: div.innerText });
                div.focus();
            }
        });

        html.find(".type-select").change(async (ev) => {
            ev.preventDefault();

            let elem = ev.currentTarget;
            let field = elem.dataset.field;

            return await this.document.update({ [field]: elem.value });
        });
    }
}
