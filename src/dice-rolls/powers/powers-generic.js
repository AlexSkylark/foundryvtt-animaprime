export async function UseCatchYourBreath(powerData, ownerData, targetData) {
    let ownerDiceData = ownerData.data.data;

    const threatDiceToLose =
        ownerDiceData.threatDice - Math.max(ownerDiceData.threatDice - 2, 0);

    await ownerData.update({
        "data.threatDice": ownerDiceData.threatDice - threatDiceToLose,
        "data.actionDice": ownerDiceData.actionDice + 2,
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
