export class PursuitMessageModel extends WarhammerMessageModel {
    static defineSchema()
    {
        let schema = {};// headStart, skill, fallback

        // Distance between groups i.e. "4"
        schema.distance = new foundry.data.fields.NumberField({});
        //Pursuit type i.e. "Simple" or "Complex"
        schema.type = new foundry.data.fields.StringField();
        // What skill to use
        schema.skill = new foundry.data.fields.StringField();
        // Should use fallback if no skill is available
        schema.fallback = new foundry.data.fields.BooleanField();
        // Round number
        schema.round =  new foundry.data.fields.NumberField({initial: 1});
        // Track quarry roll results
        schema.quarry = new foundry.data.fields.ArrayField(new foundry.data.fields.ObjectField());
        // Track pursuers roll results
        schema.pursuers = new foundry.data.fields.ArrayField(new foundry.data.fields.ObjectField());
        return schema;
    }

    static handlePursuitCommand(distance, initType, initSkill, initFallback)
    {
        const type = initType || "Simple";
        const skill = initSkill || "Athletics";
        const fallback = initFallback || true;
        //If the user isn't a GM, do nothing
        if (!game.user.isGM)
            return ui.notifications.error("MARKET.GMOnlyCommand", {localize : true});
        if (isNaN(distance) || distance == null || distance <= 0 || distance >= 10)
            return ui.notifications.error(game.i18n.localize("ERROR.Distance"))

        if (type === "Complex") {
            // TODO Complex Pursuits
        } else {
            this.createSimplePursuitMessage(distance, {type, skill, fallback,  round: 1});
        }
    }

    static createSimplePursuitMessage(distance, {type, skill, fallback, round}={}, chatData={})
    {
        this._renderMessage(
            distance,
            type,
            skill?.capitalize(),
            fallback,
            round,
            [],
            []
        ).then(html => {
            const owners = {};
            game.users.forEach(user => {
                owners[user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
            });
            ChatMessage.create(foundry.utils.mergeObject({
                type : "pursuit",
                content: html,
                speaker : {
                    alias  : "Pursuit",
                },
                system : {
                    distance,
                    type,
                    skill,
                    fallback,
                    round,
                    quarry: [],
                    pursuers: []
                }}, chatData));
        })
    }

    executeOnTargets(data, callback) {
        let actors = warhammer.utility.targetsWithFallback();
        if (!actors.length)
        {
            return ui.notifications.warn("PURSUIT.NoTarget", {localize : true});
        }
        actors.forEach(actor =>
        {
            callback(actor, data);
        });
        if (canvas.scene)
            game.canvas.tokens.setTargets([]);
    }

    async _rollTest(actor, skill, fallback) {
        // TODO Implement skill picking and fallback
        let test = await actor.setupCharacteristic("ag", {skipTargets: true, appendTitle :  " - Pursuit"});
        await test.roll();
        return test;
    }

    static get actions() {
        return foundry.utils.mergeObject(super.actions, {
            calculateChase: this._onCalculateChase,
            quarry : this._onQuarry,
            pursuers: this._onPursuers,
        });
    }

    static async _onQuarry(ev, target) {
        console.log('Quarry', ev, target);
        this.executeOnTargets(this.quarry, async (actor, data) => {
            // TODO Make work on ReRoll
            const roll = await this._rollTest(actor, this.skill, this.fallback);
            console.log('Roll', roll);
            const alreadyRolled = data.find(r => r.id === actor.id);
            let newQuarry;
            if (alreadyRolled) {
                newQuarry = data.map(r => r.id === actor.id ? {
                    id: actor.id,
                    name: actor.name,
                    sl: roll.data.result.SL,
                } : r);
            }  else {
                newQuarry = data.concat({
                    id: actor.id,
                    name: actor.name,
                    sl: roll.data.result.SL,
                });
            }
            let content = await this.constructor._renderMessage(
                this.distance,
                this.type,
                this.skill,
                this.fallback,
                this.round,
                newQuarry,
                this.pursuers
            );
            if (game.user.isGM) {
                this.parent.update({content, "system.quarry": newQuarry});
            } else {
                await SocketHandlers.executeOnUserAndWait("GM", "updateMessage", { id: this.parent.id, updateData: {content, "system.quarry": newQuarry} });}
        });
    }

    static async _onPursuers(ev, target) {
        console.log('Pursuers', ev, target);
        this.executeOnTargets(this.pursuers, async (actor, data) => {
            // TODO Make work on ReRoll
            const roll = await this._rollTest(actor, this.skill, this.fallback);
            console.log('Roll', roll);
            const alreadyRolled = data.find(r => r.id === actor.id);
            let newPursuers;
            if (alreadyRolled) {
                newPursuers = data.map(r => r.id === actor.id ? {
                    id: actor.id,
                    name: actor.name,
                    sl: roll.data.result.SL,
                } : r);
            }  else {
                newPursuers = data.concat({
                    id: actor.id,
                    name: actor.name,
                    sl: roll.data.result.SL,
                });
            }
            let content = await this.constructor._renderMessage(
                this.distance,
                this.type,
                this.skill,
                this.fallback,
                this.round,
                this.quarry,
                newPursuers
            );
            if (game.user.isGM) {
                this.parent.update({content, "system.pursuers": newPursuers});
            } else {
                await SocketHandlers.executeOnUserAndWait("GM", "updateMessage", { id: this.parent.id, updateData: {content, "system.pursuers": newPursuers} });}
        });
    }

    static async _onCalculateChase(ev, target) {
        console.log('Calculate', ev, target);
        if (!game.user.isGM)
            return ui.notifications.error("MARKET.GMOnlyCommand", {localize : true});
        const lowestQuarry = this.quarry.reduce((a, b) => a.sl < b.sl ? a : b).sl;
        const highestPursuers = this.pursuers.reduce((a, b) => a.sl > b.sl ? a : b).sl;
        const newDistance = this.distance - (highestPursuers -  lowestQuarry);
        PursuitMessageModel.createSimplePursuitMessage(newDistance, {type: this.type, skill: this.skill, fallback: this.fallback, round: this.round + 1});
    }

    static async _renderMessage(distance,  type, skill, fallback, round, quarry, pursuers) {
        return await renderTemplate("systems/wfrp4e/templates/chat/pursuit.hbs", {
            distance,
            type,
            skill,
            fallback,
            round,
            quarry,
            pursuers
        });
    }
}