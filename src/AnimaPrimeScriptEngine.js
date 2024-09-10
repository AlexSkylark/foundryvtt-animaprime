const AsyncFunction = async function () {}.constructor;

export async function executeResolveScript(item, scriptBody) {
    let action = item.system;
    let actionName = item.name;
    let self = item.owner.system;
    let target = [];
    let targetName = "";
    let targetId = "";

    if (item.targets[0]) {
        target = item.targets[0].system
        targetName = item.targets[0].name
        targetId = item.targets[0]._id;
    }

    let executionScript = initializeScriptBody(scriptBody);

    const scriptFunction = new AsyncFunction("action", "actionName", "self", "target", "targetName", "targetId", executionScript);

    await scriptFunction(action, actionName, self, target, targetName, targetId);

    await game.actors.get(item.owner._id).update({ "system": self });
    await game.actors.get(targetId).update({ system: target })
}

export async function executeValidations(item) {

    const validationBody = initializeValidationBody(item.system.scriptValidations);
    if (validationBody.validations && validationBody.validations.length > 0) {

        let action = item.system;
        let actionName = item.name;
        let self = item.owner.system;
        let target = null;
        let targetName = "";
        let targetId = "";

        if (game.user.targets.first()) {
            target = game.user.targets.first().document.actor.system
            targetName = game.user.targets.first().document.name
            targetId = game.user.targets.first().document.id;
        }

        for(let validation of validationBody.validations) {

            let validationScript = validationBody.scriptBody + "return " + JSON.parse(JSON.stringify(validation.script));

            let validationFunction = new Function("action", "actionName", "self", "target", "targetName", "targetId", validationScript);

            let valResult = await validationFunction(action, actionName, self, target, targetName, targetId);
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
        originalScript = originalScript.replaceAll("addCondition(target", "await addCondition(targetId")
    }

    if (originalScript.indexOf('checkCondition') >= 0) {
        scriptBody += checkCondition.toString() + "\n\n";
    }

    scriptBody += JSON.parse(JSON.stringify(originalScript));

    return scriptBody;
}

function initializeValidationBody(originalValidations) {

    let scriptBody = "";
    if (originalValidations.indexOf('checkCondition') >= 0) {
        scriptBody += checkCondition.toString() + "\n\n";
        originalValidations = originalValidations.replace("checkCondition(target", "checkCondition(targetId")
    }

    return {
        scriptBody: scriptBody,
        validations: JSON.parse("[" + originalValidations.replaceAll("\n", "").replaceAll("\t", "") + "]")
    }
}

function checkCondition(entity, condition) {
    const effects = game.scenes.active.tokens.get(entity).actor.temporaryEffects.filter((temp) => {
        return temp.name.toUpperCase() == condition.toUpperCase();
    });
    return (effects.length > 0);
}

async function addCondition(tokenId, conditionId) {

    const targetActor = game.actors.get(tokenId);
    const effects = targetActor.temporaryEffects.filter((temp) => {
        return temp.name.toUpperCase() == conditionId.toUpperCase();
    });

    if (effects.length > 0) return;

    const activeEffectConf = CONFIG.statusEffects.find((se) => se.id == conditionId);
    const targetToken = targetActor.getActiveTokens()[0].document;
    await targetToken.toggleActiveEffect(activeEffectConf, { active: true });
}
