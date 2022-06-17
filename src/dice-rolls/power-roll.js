export async function powerRoll(power) {
    const ownerChargeDice = power.owner.data.data.chargeDice;
    power.capitalizedType =
        power.type.charAt(0).toUpperCase() + power.type.slice(1);

    const isHexed = power.owner.checkCondition("hexed");
    if (isHexed) power.data.cost += 1;
    if (ownerChargeDice < power.data.cost) {
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
            height: 150,
        },
        defaultYes: false,
    });
}

async function castPower(power) {
    var resultMessage = power.data.effect;

    if (power.data.cost) {
        const ownerChargeDice = power.owner.data.data.chargeDice;
        await power.owner.update({
            "data.chargeDice": ownerChargeDice - power.data.cost,
        });
    }

    return ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker(),
        content: await renderTemplate(
            "systems/animaprime/templates/rolls/roll-power/roll-power.hbs",
            {
                ...power,
                message: resultMessage,
            }
        ),
        roll: true,
    });
}
