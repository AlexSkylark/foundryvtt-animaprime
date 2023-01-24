export async function UseCatchYourBreath(powerData, ownerData, targetData) {
    let ownerDiceData = ownerData.system;

    const threatDiceToLose =
        ownerDiceData.threatDice - Math.max(ownerDiceData.threatDice - 2, 0);

    await ownerData.update({
        "system.threatDice": ownerDiceData.threatDice - threatDiceToLose,
        "system.actionDice": ownerDiceData.actionDice + 2,
    });

    let threatDiceMessage =
        threatDiceToLose > 0
            ? `Lost ${threatDiceToLose} threat ${
                  threatDiceToLose > 1 ? "dice" : "die"
              }, `
            : "";

    let returnMessage = threatDiceMessage + "gained 2 action dice";
    return returnMessage.charAt(0).toUpperCase() + returnMessage.slice(1);
}
