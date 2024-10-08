import * as SkillsRoll from "../dice-rolls/skill-roll.js";

export default class AnimaPrimeActorSheet extends ActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["animaprime", "sheet", "actor", "actor-sheet-layout"],
            width: 940,
            height: 790,
            tabs: [
                {
                    navSelector: ".sheet-tabs",
                    contentSelector: ".sheet-body",
                    initial: "features",
                },
            ],
            resizable: false,
            minimizable: false
        });
    }

    get template() {
        return `/systems/animaprime/templates/sheets/actor/actor-${this.actor.type}-sheet/actor-${this.actor.type}-sheet.hbs`;
    }

    get editUnlocked() {
        return (this.actor && this.actor.system.enableEdit) || game.user.isGM;
    }

    get isDead() {
        if (!this.actor.system.health) return false;
        return this.actor.system.health.value >= this.actor.system.health.max;
    }

    get wounds() {
        if (!this.actor.system.health) return 0;

        let wounds = this.actor.system.health.value;
        let woundsMax = this.actor.system.health.max;

        let returnArray = [];

        for (let i = 0; i < woundsMax; i++) {
            if (wounds > i) returnArray.push({ wound: true });
            else returnArray.push({ wound: false });
        }

        return returnArray.reverse();
    }

    getData() {
        const context = super.getData();
        const actorData = context.actor.system;

        // Add the actor's data to context.system for easier access, as well as flags.
        context.system = actorData;
        context.flags = actorData.flags;

        this.prepareItemData(context);

        context.isGM = game.user.isGM;

        return context;
    }

    prepareItemData(context) {
        const skills = [];
        const resistances = [];
        const basicActions = [];
        const actions = [];

        for (let i of context.items) {
            // Append to gear.
            if (i.type === "skill") skills.push(i);
            else if (i.type === "resistance") resistances.push(i);
            // Append to features.
            else if (i.system.basic) basicActions.push(i);
            else actions.push(i);
        }

        for (let maneuver of actions.filter((ac) => {
            return ac.type == "maneuver";
        })) {
            this.formatManeuverGains(maneuver);
        }

        for (let maneuver of basicActions.filter((ac) => {
            return ac.type == "maneuver";
        })) {
            this.formatManeuverGains(maneuver);
        }

        context.skills = skills;
        context.resistances = resistances;

        context.basicActions1 = [];
        context.basicActions2 = [];
        context.actions1 = [];
        context.actions2 = [];

        for (let i = 0; i < basicActions.length; i++) {
            if (i % 2 != 0 || i == 6) context.basicActions2.push(basicActions[i]);
            else context.basicActions1.push(basicActions[i]);
        }

        for (let i = 0; i < actions.length; i++) {
            if (i % 2 != 0) context.actions2.push(actions[i]);
            else context.actions1.push(actions[i]);
        }

        context.actions = actions;
        context.basicActions = basicActions;

        context.editUnlocked = context.system.enableEdit || game.user.isGM;
        context.editName = context.options.token == null;
        context.actorName = context.options.token ? context.options.token.name : context.actor.name;
        context.wounds = this.wounds;
        context.isDead = this.isDead;

        context.reroll = context.system.reroll ?? 0;
    }

    formatManeuverGains(elem) {
        var text = "";
        let gain = [];

        if (elem.system.gain.r1 == "fail") elem.system.gain.r1 = "0";
        if (elem.system.gain.r2 == "fail") elem.system.gain.r2 = "0";
        if (elem.system.gain.r3 == "fail") elem.system.gain.r3 = "0";
        if (elem.system.gain.r4 == "fail") elem.system.gain.r4 = "0";
        if (elem.system.gain.r5 == "fail") elem.system.gain.r5 = "0";
        if (elem.system.gain.r6 == "fail") elem.system.gain.r6 = "0";

        gain.push(elem.system.gain.r1);
        gain.push(elem.system.gain.r2);
        gain.push(elem.system.gain.r3);
        gain.push(elem.system.gain.r4);
        gain.push(elem.system.gain.r5);
        gain.push(elem.system.gain.r6);

        for (var i = 0; i <= 2; i++) {
            const times = gain.filter((x) => x == i).length;
            if (times == 0) continue;
            text += " ";
            if (times < 2) {
                text += gain.indexOf(i.toString()) + 1;
            } else {
                text += gain.indexOf(i.toString()) + 1 + "-" + (gain.lastIndexOf(i.toString()) + 1);
            }

            if (i == 0) text += " fail,";
            else if (i == 1) text += " strike,";
            else if (i == 2) text += " charge,";
        }

        text = text.replace(/(^,)|(,$)/g, "");
        elem.system.gainText = text;
    }

    countValue(array, value) {
        return array.filter((v) => v === value).length;
    }

    async activateListeners(html) {
        await super.activateListeners(html);

        html.find(".button-changevalue").click(this._onPropertyIncrementValue.bind(this));

        html.find(".item-create").click(this._onItemCreate.bind(this));
        html.find(".item-edit").click(this._onItemEdit.bind(this));
        html.find(".item-delete").click(this._onItemDelete.bind(this));
        html.find(".item-roll").click(this._onItemRoll.bind(this));
        html.find(".generic-skill-roll").click(this._onGenericSkillRoll.bind(this));
        html.find(".item-value").click(this._onItemValueChange.bind(this));

        if (game.user.isGM) {
            html.find(".lock-container").click(this._onToggleEditable.bind(this));
        }

        html.find(".button-reform-basicactions").click(this._onReformBasicActions.bind(this));

        if (game.user.isGM || this.actor.isOwner) {
            let handler = (ev) => this._onDragStart(ev);
            // Find all items on the character sheet.
            html.find(".item-card").each((i, li) => {
                // Add draggable attribute and dragstart listener.
                li.setAttribute("draggable", true);
                li.addEventListener("dragstart", handler, false);
            });
        }
    }

    async _onToggleEditable(ev) {
        ev.preventDefault();

        await this.actor.update({
            "system.enableEdit": !this.actor.system.enableEdit,
        });
    }

    async _onPropertyIncrementValue(ev) {
        ev.preventDefault();

        let propertyName = ev.currentTarget.dataset.property;
        let propertyValue = "";
        let resourceName = "";
        let resourceProp = "";

        let isValue = propertyName.indexOf(".value") >= 0;
        let isMax = propertyName.indexOf(".max") >= 0;
        let isComplex = isValue || isMax;

        if (isComplex) {
            resourceName = propertyName.split(".")[0];
            resourceProp = propertyName.split(".")[1];
            propertyValue = this.actor.system[resourceName][resourceProp];
        } else {
            propertyValue = this.actor.system[propertyName];
        }

        let operation = ev.currentTarget.dataset.operation;
        let newValue = operation == "plus" ? propertyValue + 1 : propertyValue - 1;
        newValue = Math.max(newValue, 0);
        if (isValue) {
            const maxValue = this.actor.system[resourceName].max;
            newValue = Math.min(newValue, maxValue);
        }

        // special treatment for focus dice
        if (propertyName == "actionDice" && newValue > this.actor.system.actionDiceMax) newValue--;

        let updateObject = {};
        if (isComplex) {
            updateObject[`system.${resourceName}.${resourceProp}`] = newValue;
        } else {
            updateObject[`system.${propertyName}`] = newValue;
        }

        if (propertyValue != newValue) {
            const chatMsg = (operation == "plus" ? "added" : "subtracted") + " 1 " + propertyName.replace("Dice", " die").replace(".value", " point").replace(".max", " max point") + (operation == "plus" ? " to " : " from ") + this.actor.name;

            if (!game.user.isGM) {
                ChatMessage.create({
                    user: game.user._id,
                    speaker: ChatMessage.getSpeaker({ alias: this.actor.name }),
                    content: '<span class="result-message' + (operation == "plus" ? " success" : " partial") + '">' + chatMsg + "</span>",
                });
            }

            await this.actor.update(updateObject);
        }
    }

    async _onItemCreate(event) {
        event.preventDefault();
        const header = event.currentTarget;
        const type = header.dataset.type;
        const data = duplicate(header.dataset);

        const name = `- new -`;

        // Prepare the item object.
        const itemData = {
            name: name,
            type: type,
            system: data,
        };

        delete itemData.system["type"];
        delete itemData.system["name"];

        return await Item.create(itemData, { parent: this.actor });
    }

    async _onItemEdit(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        const li = $(ev.currentTarget).parents(".item");
        const item = this.actor.getEmbeddedDocument("Item", li.data("itemId"));

        item.sheet.render(true);
    }

    async _onItemDelete(ev) {
        ev.preventDefault();
        ev.stopPropagation();

        const li = $(ev.currentTarget).parents(".item");
        const item = this.actor.getEmbeddedDocument("Item", li.data("itemId"));

        const dialogTemplate = "systems/animaprime/templates/dialogs/dialog-confirmdelete/dialog-confirmdelete.hbs";

        Dialog.confirm({
            title: "Delete Item",
            content: await renderTemplate(dialogTemplate, item),
            yes: () => {
                this.actor.deleteEmbeddedDocuments("Item", [li.data("itemId")]);
                li.slideUp(400, () => this.render(false));
            },
            options: {
                width: 320,
                height: 220,
                classes: ["window-dialog"],
            },
            defaultYes: false,
        });
    }

    async _onItemRoll(ev) {
        ev.preventDefault();
        ev.stopPropagation();

        const item = this.actor.getEmbeddedDocument("Item", $(ev.currentTarget).closest(".item").data("itemId"));

        await item.roll(ev.ctrlKey, ev.shiftKey);
    }

    async _onGenericSkillRoll(ev) {
        ev.preventDefault();
        ev.stopPropagation();

        let skill = {
            type: "skill",
            img: "icons/skills/trades/academics-study-reading-book.webp",
            name: "Generic Roll",
            owner: this.actor,
            generic: true,
        };

        await SkillsRoll.skillCheck(skill, ev.ctrlKey, ev.shiftKey);
    }

    async _onReformBasicActions(ev) {
        ev.preventDefault();
        ev.stopPropagation();

        let basicActions = [];
        for (const item of this.actor.getEmbeddedCollection("Item").values()) {
            if (item.system.basic) {
                basicActions.push(item.id);
            }
        }

        this.actor.deleteEmbeddedDocuments("Item", basicActions);

        let items = [];
        if (this.actor.type == "vehicle") {
            items = await game.packs.get("animaprime.basic-vehicle-actions").getDocuments();
        } else {
            items = await game.packs.get("animaprime.basic-actions").getDocuments();
        }

        items = items.sort((a, b) => a.name.localeCompare(b.name));

        const BasicManeuver = items[1];
        const BasicStrike = items[0];

        items[0] = BasicManeuver;
        items[1] = BasicStrike;

        await this.actor.createEmbeddedDocuments("Item", items);
    }

    async _onItemValueChange(ev) {

        if ((!ev.ctrlKey && !ev.altKey) || !game.user.isGM)
            return;

        ev.preventDefault();
        ev.stopPropagation();

        let updateObject = {};

        const propName = ev.currentTarget.dataset.property;
        const li = $(ev.currentTarget).parents(".item");
        const item = this.actor.getEmbeddedDocument("Item", li.data("itemId"));
        let propValue = parseInt(item.system[propName]);

        if (ev.altKey) {
            if (propValue > 0) propValue -= 1;
        }
        else if (ev.ctrlKey) {
            propValue += 1;
        }

        updateObject[`system.${propName}`] = propValue;

        if (!item.system.originalValues) {
            updateObject["system.originalValues"] = item.system;
        }

        //debugger;
        await item.update(updateObject);
        li.focus();
    }
}
