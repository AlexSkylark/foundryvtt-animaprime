const AsyncFunction = async function () {}.constructor;

export async function executeResolveScript(item, target, scriptBody) {

    let action = item.system;
    let self = item.owner.system;

    action.name = item.name;

    let targetObject = null;
    if (target) {
        targetObject = target
        targetObject.name = target.name
        if (!targetObject.id)
            targetObject.id = target._id;
    }

    let executionScript = initializeScriptBody(scriptBody);

    const scriptFunction = new AsyncFunction("action", "self", "target", executionScript);

    const scriptResult = await scriptFunction(action, self, targetObject);

    if (target && game.user.isGM)
        await game.actors.get(targetObject.id).update({ system: targetObject })
    await game.actors.get(item.owner._id).update({ system: self });

    return scriptResult;
}

export async function executeValidations(item) {

    const validationBody = initializeValidationBody(item.system.scriptValidations);
    if (validationBody.validations && validationBody.validations.length > 0) {

        let action = item.system;
        let self = item.owner.system;
        let target = [];

        action.name = item.name;

        if (game.user.targets.first()) {
            target = game.user.targets.first().document.actor.system
            target.name = game.user.targets.first().document.name
            target.id = game.user.targets.first().document.id;
        }

        for(let validation of validationBody.validations) {

            let validationScript = validationBody.scriptBody + "return " + JSON.parse(JSON.stringify(validation.script));

            let validationFunction = new Function("action", "self", "target", validationScript);

            let valResult = await validationFunction(action, self, target);
            if (!valResult) {
                ui.notifications.error(validation.message);
                return false;
            }
        }

        return true;
    }
}

function initializeScriptBody(originalScript) {

    let scriptBody = "";
    if (originalScript.indexOf('addCondition') >= 0) {
        scriptBody += addCondition.toString() + "\n\n";
    }

    if (originalScript.indexOf('checkCondition') >= 0) {
        scriptBody += checkCondition.toString() + "\n\n";
    }

    scriptBody += "let dialogOptions = {};\n\n" + JSON.parse(JSON.stringify(originalScript)) + "\n\nreturn { dialogOptions: dialogOptions };";

    return scriptBody;
}

function initializeValidationBody(originalValidations) {

    let scriptBody = "";
    if (originalValidations.indexOf('checkCondition') >= 0) {
        scriptBody += checkCondition.toString() + "\n\n";
    }

    return {
        scriptBody: scriptBody,
        validations: JSON.parse("[" + originalValidations.replaceAll("\n", "").replaceAll("\t", "") + "]")
    }
}

function checkCondition(entity, condition) {
    const effects = game.scenes.active.tokens.get(entity.id).actor.temporaryEffects.filter((temp) => {
        return temp.name.toUpperCase() == condition.toUpperCase();
    });
    return (effects.length > 0);
}

async function addCondition(token, conditionId) {

    const targetActor = game.actors.get(token.id);
    const effects = targetActor.temporaryEffects.filter((temp) => {
        return temp.name.toUpperCase() == conditionId.toUpperCase();
    });

    if (effects.length > 0) return;

    const activeEffectConf = CONFIG.statusEffects.find((se) => se.id == conditionId);
    const targetToken = targetActor.getActiveTokens()[0].document;
    await targetToken.toggleActiveEffect(activeEffectConf, { active: true });
}
