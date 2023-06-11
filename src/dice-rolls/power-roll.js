export async function powerRoll(power) {
    const ownerChargeDice = power.owner.system.chargeDice;
    power.capitalizedType =
        power.type.charAt(0).toUpperCase() + power.type.slice(1);

    const isHexed = power.owner.checkCondition("hexed");
    if (isHexed) power.system.cost += 1;
    if (ownerChargeDice < power.system.cost) {
        ui.notifications.error(
            `Not enough available charge dice to cast this ${power.capitalizedType}.`
        );
        return;
    }

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

async function castPower(power) {
    var resultMessage = power.system.effect;

    if (power.system.cost) {
        const ownerChargeDice = power.owner.system.chargeDice;
        await power.owner.update({
            "system.chargeDice": ownerChargeDice - power.system.cost,
        });
    }

    const templateHtml = await renderTemplate(
        "systems/animaprime/templates/rolls/roll-power/roll-power.hbs",
        {
            ...power,
            message: resultMessage,
        }
    );

    return ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker({ alias: power.owner.name }),
        content: templateHtml,
        flags: {
            sourceItem: power,
        },
    });
}
