export async function powerRoll(power) {
    power.capitalizedType =
        power.type.charAt(0).toUpperCase() + power.type.slice(1);

    const dialogTemplate =
        "systems/animaprime/templates/dialogs/dialog-usepower/dialog-usepower.hbs";

    Dialog.confirm({
        title: `Use ${power.capitalizedType}`,
        content: await renderTemplate(dialogTemplate, power),
        yes: () => {
            castPower(power);
        },
        options: {
            width: 320,
            height: 252,
            classes: ["window-dialog", "window-dialog-usepower"],
        },
        defaultYes: false,
    });
}

async function castPower(item) {
    var resultMessage = item.system.effect;

    const templateHtml = await renderTemplate(
        "systems/animaprime/templates/rolls/roll-power/roll-power.hbs",
        {
            ...item,
            message: resultMessage,
        }
    );

    if (item.system.cost) {
        const isHexed = item.owner.checkCondition(item.owner, "hexed");
        await item.owner.update({
            "system.chargeDice": item.owner.system.chargeDice - (item.system.cost + (isHexed ? 1 : 0)),
        });
    }

    game.user.updateTokenTargets([]);

    return ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ alias: item.owner.name }),
        content: templateHtml,
        flags: {
            sourceItem: item,
            cancelled: false
        },
    });
}



