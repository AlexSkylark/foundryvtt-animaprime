import AnimaPrimeActorSheet from "./AnimaPrimeActorSheet.js";

export default class AnimaPrimeAdversitySheet extends AnimaPrimeActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            width: 480,
            height: this.prototype.editUnlocked ? 600 : 310,
        });
    }
}
