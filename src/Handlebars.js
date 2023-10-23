export function registerHandlebarsHelpers() {
    Handlebars.registerHelper("is0", function (value) {
        return value == "0";
    });

    Handlebars.registerHelper("is1", function (value) {
        return value == "1";
    });

    Handlebars.registerHelper("is2", function (value) {
        return value == "2";
    });

    Handlebars.registerHelper("isPositiveGoal", function (value1, value2) {
        const systemData = game.scenes.active.tokens.get(value1).actorData.system ?? game.scenes.active.tokens.get(value1).actor.system;

        const targetType = systemData.type;
        const ownerType = value2 == "character" || value2 == "ally" ? 0 : 1;

        return !targetType || targetType == ownerType;
    });

    Handlebars.registerHelper("canTakeTurn", function (value) {
        return value <= 1000 && value > 0;
    });

    Handlebars.registerHelper("cannotTakeTurn", function (value) {
        return value <= 0;
    });

    Handlebars.registerHelper("isOnQueue", function (value) {
        return value > 1000;
    });

    Handlebars.registerHelper("isOutOfQueue", function (value) {
        return value <= 1000;
    });

    Handlebars.registerHelper("isMinus1", function (value) {
        return value == -1;
    });

    Handlebars.registerHelper("isOpen", function (value) {
        return value == "open";
    });

    Handlebars.registerHelper("isTotal", function (value) {
        return value == "total";
    });

    Handlebars.registerHelper("isPartial", function (value) {
        return value == "partial";
    });

    Handlebars.registerHelper("isFailure", function (value) {
        return value == "failure";
    });

    Handlebars.registerHelper("isSuccess", function (value) {
        return value >= 3;
    });

    Handlebars.registerHelper("isSkillSuccess", function (value) {
        return value == 2 || value == 3;
    });

    Handlebars.registerHelper("isSkillCriticalSuccess", function (value) {
        return value >= 4;
    });

    Handlebars.registerHelper("isAchievement", function (value) {
        return value.toUpperCase() == "ACHIEVEMENT";
    });

    Handlebars.registerHelper("isCharacter", function (value) {
        return value.toUpperCase() == "CHARACTER";
    });

    Handlebars.registerHelper("isGoal", function (value) {
        return value.name.toUpperCase().indexOf("GOAL") >= 0;
    });

    Handlebars.registerHelper("isFriendly", function (value) {
        return value.toUpperCase() == "FRIENDLY";
    });

    Handlebars.registerHelper("isHostile", function (value) {
        return value.toUpperCase() == "HOSTILE";
    });

    Handlebars.registerHelper("isOnQueue", function (value) {
        return value.initiative > 1000;
    });

    Handlebars.registerHelper("isControlling", function (value) {
        return value.players?.includes(game.user);
    });

    Handlebars.registerHelper("isSpeaker", function (value) {
        let actor = game.actors.get(value);
        return actor.isOwner;
    });

    Handlebars.registerHelper("debug", function (value) {
        debugger;
        return true;
    });

    Handlebars.registerHelper("itemOwnerHasCondition", function (value, condition) {
        return value.owner.checkCondition("condition");
        return true;
    });

    Handlebars.registerHelper("isMultiple10", function (value) {
        return value % 10 == 0;
    });

    Handlebars.registerHelper({
        not: (v1) => !v1,
        eq: (v1, v2) => v1 == v2,
        ne: (v1, v2) => v1 != v2,
        lt: (v1, v2) => parseInt(v1) < parseInt(v2),
        gt: (v1, v2) => parseInt(v1) > parseInt(v2),
        lte: (v1, v2) => parseInt(v1) <= parseInt(v2),
        gte: (v1, v2) => parseInt(v1) >= parseInt(v2),
        and() {
            return Array.prototype.every.call(arguments, Boolean);
        },
        or() {
            return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
        },
    });
}
