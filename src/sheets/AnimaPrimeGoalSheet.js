import AnimaPrimeActorSheet from "./AnimaPrimeActorSheet.js";

export default class AnimaPrimeGoalSheet extends AnimaPrimeActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["animaprime", "sheet", "goal"],
            width: 470,
            height: 403,
            resizable: false,
            scale: 0.85,
        });
    }

    get template() {
        return `/systems/animaprime/templates/sheets/actor/actor-goal-sheet/actor-goal-sheet.hbs`;
    }
}
