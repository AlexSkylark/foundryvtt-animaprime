import AnimaPrimeActor from "./AnimaPrimeActor.js";
import AnimaPrimeItem from "./AnimaPrimeItem.js";

export default class AnimaPrimeGamemasterHUD extends Application {
    renderHud = false;

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: "/systems/animaprime/templates/huds/gm-hud.hbs",
            id: "gm-hud",
            classes: [],
            width: 200,
            height: 20,
            left: 150,
            top: 380,
            scale: 1,
            background: "none",
            popOut: false,
            minimizable: false,
            resizable: false,
            title: "gm-hud",
            dragDrop: [],
            tabs: [],
            scrollY: [],
        });
    }

    async getData(options = {}) {
        let data = super.getData();

        data.isGM = game.user.isGM;
        data.renderHud = this.renderHud;

        return data;
    }

    async activateListeners(html) {
        await super.activateListeners(html);
        html.find(".hud-roll").click(this._onHudRoll.bind(this));
    }

    async _onHudRoll(ev) {
        ev.preventDefault();
        ev.stopPropagation();

        const actorName = $("#gm-customskill-actor").val();
        const skillName = $("#gm-customskill-skill").val();
        const skillLevel = $("#gm-customskill-level").val();

        if (!actorName || !skillName || !skillLevel) {
            ui.notifications.error("Please fill in the data for a custom ability roll");
            return;
        }

        let skillActor = await AnimaPrimeActor.create({
            name: actorName,
            type: "adversity",
        });

        let item = await AnimaPrimeItem.create(
            {
                name: skillName,
                type: "skill",
            },
            { parent: skillActor }
        );

        item.system.name = skillName;
        item.system.rating = skillLevel;

        await item.roll(ev.ctrlKey, ev.shiftKey);

        await skillActor.delete();

        $(".gm-hud-container").hide();
    }
}
