export default class AnimaPrimeActor extends Actor {
    /**
     * @override
     * Augment the basic actor data with additional dynamic data. Typically,
     * you'll want to handle most of your calculated/derived data in this step.
     * Data calculated in this step should generally not exist in template.json
     * (such as ability modifiers rather than ability scores) and should be
     * available both inside and outside of character sheets (such as if an actor
     * is queried and has a roll executed directly from it).
     */
    prepareDerivedData() {
        const actorData = this.data;
        const data = actorData.data;
        const flags = actorData.flags.animaprime || {};
    }

    checkCondition(condition) {
        const effects = this.temporaryEffects.filter((temp) => {
            return temp.isTemporary == condition;
        });
        return effects.length > 0;
    }
}
