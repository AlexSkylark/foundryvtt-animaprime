const AsyncFunction = async function () {}.constructor;

export async function executeResolveScript(item, targets, scriptBody) {

    let action = item.system;
    let self = item.owner.system;

    action.name = item.name;

    let targetsObject = [];
    let targetTokens = [];
    if (targets) {
        for (let tga = 0; tga < targets.length; tga++) {

            let target = targets[tga];

            targetTokens.push(game.scenes.viewed.tokens.get(item.targets[tga].tokenId))

            let newTargetObject = JSON.parse(JSON.stringify(targetTokens[tga].actor.system));
            newTargetObject.name = targetTokens[tga].name
            if (!newTargetObject.id)
                newTargetObject.id = target.tokenId;
            targetsObject.push(newTargetObject);
        }
    }

    let executionScript = initializeScriptBody(scriptBody);

    const scriptFunction = new AsyncFunction("action", "self", "targets", executionScript);

    const scriptResult = await scriptFunction(action, self, targetsObject);

    if (targets && game.user.isGM) {
        for (let tgi = 0; tgi < targets.length; tgi++) {
            await targetTokens[tgi].actor.update({ system: targetsObject[tgi] })
        }
    }

    await item.owner.update({ system: self });

    return scriptResult;
}

export async function executeValidations(item) {

    const validationBody = initializeValidationBody(item.system.scriptValidations);
    if (validationBody.validations && validationBody.validations.length > 0) {

        let action = item.system;
        let self = item.owner.system;
        let targets = [];

        action.name = item.name;

        for (let target of game.user.targets) {
            let targetObj = target.document.actor.system
            targetObj.name = target.document.name
            targetObj.id = target.document.id;
            targets.push(targetObj);
        }

        for(let validation of validationBody.validations) {

            let validationScript = validationBody.scriptBody + "return " + JSON.parse(JSON.stringify(validation.script));

            let validationFunction = new Function("action", "self", "targets", validationScript);

            let valResult = await validationFunction(action, self, targets);
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

    scriptBody += "let target = targets[0];\nlet dialogOptions = [];\n\n" + JSON.parse(JSON.stringify(originalScript)) + "\n\nreturn { dialogOptions: dialogOptions };";

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

    const targetToken = game.scenes.active.tokens.get(token.id);
    const targetActor = targetToken.actor;
    const effects = targetActor.temporaryEffects.filter((temp) => {
        return temp.name.toUpperCase() == conditionId.toUpperCase();
    });

    if (effects.length > 0) return;

    const activeEffectConf = CONFIG.statusEffects.find((se) => se.id == conditionId);

    await targetToken.toggleActiveEffect(activeEffectConf, { active: true });
}
