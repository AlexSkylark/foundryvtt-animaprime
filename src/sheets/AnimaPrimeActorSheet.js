import * as SkillsRoll from "../dice-rolls/skill-roll.js";

export default class AnimaPrimeActorSheet extends ActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["animaprime", "sheet", "actor"],
            width: 840,
            height: 798,
            tabs: [
                {
                    navSelector: ".sheet-tabs",
                    contentSelector: ".sheet-body",
                    initial: "features",
                },
            ],
            resizable: false,
        });
    }

    get template() {
        return `/systems/animaprime/templates/sheets/actor/actor-${this.actor.data.type}-sheet/actor-${this.actor.data.type}-sheet.hbs`;
    }

    get editUnlocked() {
        return data.enableEdit || game.user.isGM;
    }

    getData() {
        const context = super.getData();
        const actorData = context.actor.data;

        // Add the actor's data to context.data for easier access, as well as flags.
        context.data = actorData.data;
        context.flags = actorData.flags;

        this.prepareItemData(context);

        return context;
    }

    prepareItemData(context) {
        const skills = [];
        const basicActions = [];
        const actions = [];

        for (let i of context.items) {
            // Append to gear.
            if (i.type === "skill") skills.push(i);
            // Append to features.
            else if (i.data.basic) basicActions.push(i);
            else actions.push(i);
        }

        for (let maneuver of actions.filter((ac) => {
            return ac.type == "maneuver";
        })) {
            this.formatManeuverGains(maneuver);
        }

        context.data.skills = skills;
        context.data.basicActions = basicActions;
        context.data.actions = actions;

        context.editUnlocked = context.data.enableEdit || game.user.isGM;
    }

    formatManeuverGains(elem) {
        var text = "";
        let gain = [];
        gain.push(elem.data.gain.r1);
        gain.push(elem.data.gain.r2);
        gain.push(elem.data.gain.r3);
        gain.push(elem.data.gain.r4);
        gain.push(elem.data.gain.r5);
        gain.push(elem.data.gain.r6);

        for (var i = 0; i <= 2; i++) {
            const times = gain.filter((x) => x == i).length;
            text += " ";
            if (times < 2) {
                text += gain.indexOf(i.toString()) + 1;
            } else {
                text +=
                    gain.indexOf(i.toString()) +
                    1 +
                    "-" +
                    (gain.lastIndexOf(i.toString()) + 1);
            }

            if (i == 0) text += " fail,";
            else if (i == 1) text += " strike,";
            else if (i == 2) text += " charge,";
        }

        text = text.replace(/(^,)|(,$)/g, "");
        elem.data.gainText = text;
    }

    countValue(array, value) {
        return array.filter((v) => v === value).length;
    }

    async activateListeners(html) {
        await super.activateListeners(html);

        html.find(".button-changevalue").click(
            this._onPropertyIncrementValue.bind(this)
        );
        html.find(".item-create").click(this._onItemCreate.bind(this));
        html.find(".item-edit").click(this._onItemEdit.bind(this));
        html.find(".item-delete").click(this._onItemDelete.bind(this));
        html.find(".item-roll").click(this._onItemRoll.bind(this));
        html.find(".generic-skill-roll").click(
            this._onGenericSkillRoll.bind(this)
        );
        html.find(".lock-container").click(this._onToggleEditable.bind(this));
    }

    async _onToggleEditable(ev) {
        ev.preventDefault();

        await this.actor.update({
            "data.enableEdit": !this.actor.data.data.enableEdit,
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
            propertyValue = this.actor.data.data[resourceName][resourceProp];
        } else {
            propertyValue = this.actor.data.data[propertyName];
        }

        let operation = ev.currentTarget.dataset.operation;
        let newValue =
            operation == "plus" ? propertyValue + 1 : propertyValue - 1;
        newValue = Math.max(newValue, 0);
        if (isValue) {
            const maxValue = this.actor.data.data[resourceName].max;
            newValue = Math.min(newValue, maxValue);
        }

        let updateObject = { data: {} };
        if (isComplex) {
            updateObject.data[resourceName] = {};
            updateObject.data[resourceName][resourceProp] = newValue;

            if (isMax) {
                if (this.actor.data.data[resourceName].value > newValue)
                    updateObject.data[resourceName].value = newValue;
                else if (operation == "plus")
                    updateObject.data[resourceName].value =
                        this.actor.data.data[resourceName].value + 1;
            }
        } else {
            updateObject.data[propertyName] = newValue;
        }

        await this.actor.update(updateObject);
    }

    async _onItemCreate(event) {
        event.preventDefault();
        const header = event.currentTarget;
        const type = header.dataset.type;
        const data = duplicate(header.dataset);
        const name = `new ${type}`;

        // Prepare the item object.
        const itemData = {
            name: name,
            type: type,
            data: data,
        };

        delete itemData.data["type"];
        delete itemData.data["name"];

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

        const dialogTemplate =
            "systems/animaprime/templates/dialogs/dialog-confirmdelete/dialog-confirmdelete.hbs";

        Dialog.confirm({
            title: "Delete Item",
            content: await renderTemplate(dialogTemplate, item),
            yes: () => {
                this.actor.deleteEmbeddedDocuments("Item", [li.data("itemId")]);
                li.slideUp(400, () => this.render(false));
            },
            options: {
                width: 320,
                height: 150,
            },
            defaultYes: false,
        });
    }

    async _onItemRoll(ev) {
        ev.preventDefault();
        const item = this.actor.getEmbeddedDocument(
            "Item",
            $(ev.currentTarget).closest(".item").data("itemId")
        );

        await item.roll(ev.ctrlKey, ev.shiftKey);
    }

    async _onGenericSkillRoll(ev) {
        ev.preventDefault();

        let skill = {
            type: "skill",
            img: "icons/skills/trades/academics-study-reading-book.webp",
            name: "Generic attempt",
            owner: this.actor,
            generic: true,
        };

        await SkillsRoll.skillCheck(skill, ev.ctrlKey, ev.shiftKey);
    }
}
