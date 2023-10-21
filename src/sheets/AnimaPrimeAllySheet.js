import AnimaPrimeActorSheet from "./AnimaPrimeActorSheet.js";

export default class AnimaPrimeAllySheet extends AnimaPrimeActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            width: 480,
            height: 340,
        });
    }

    get widthUnlocked() {
        return 645;
    }

    get heightUnlocked() {
        return 745;
    }
}
