import { ChargenStage } from "./stage";

export class StarSignStage extends ChargenStage {
    journalId = "JournalEntry.rwldURPIV6B6iNBT.JournalEntryPage.fznKbHtkiCXchcDg"

    static signIds = [
        'piUKD8eK4NDX2XIh', 'XW2NvNanJFFm25kn', '3EtMk8Gu9Qu6Gm0Q', 'tQBZbnYky5Y3gRVa',
        'N30wojpqngD5fh8j', '1zd9fisOIIHQc8EG', 'vaYrY4LZL0VcYwh9', 'ZVCxV4ZCFR0uKhCd',
        '0zR4ad8MoQMSJ99y', 'Hsc3Z7zkvLdUoSC5', 'CQgyORymDpWMnMpg', 'iProkviesGNgdJoA',
        'v6aCGTymcoYctvK4', 'CfkoFKpzq1JSJtM3', 'bzkfIM0QME7r5dVA', 'Our332eto9iQSogf',
        'TU2lsmbtj5VbtUjC', '41kyo3HcglJVr2vE', 'IuHhCdjjx9hphJlI', 'xjFhIjFcu1i373L1'
    ];

    static DEFAULT_OPTIONS = {
        classes: ["star-sign"],
        position: {
            width: 600,
            height: "auto"
        },
        window: {
            title: "CHARGEN.StageStarSigns"
        },
        actions: {
            rollStarSign: async function () {
                this.context.step++;
                let roll = await game.wfrp4e.tables.rollTable("star-sign");
                this.context.exp = 25;
                this.updateMessage("Rolled", { rolled: roll.text });
                await this._selectSign(roll.object.documentId);
            }
        }
    };

    static PARTS = {
        form: {
            template: "systems/wfrp4e/templates/apps/chargen/star-sign.hbs",
            scrollable: [".chargen-content"]
        }
    };

    static get title() { return game.i18n.localize("CHARGEN.StageStarSigns"); }

    context = {
        step: 0,
        sign: null,
        exp: 0,
        signs: []
    };

    async _prepareContext(options) {
        let context = await super._prepareContext(options);
        if (!this.context.signs.length) {
            this.context.signs = (await Promise.all(
                StarSignStage.signIds.map(id => warhammer.utility.findItemId(id, "trait"))
            )).filter(Boolean);
        }
        if (this.context.sign) {
            context.signDescription = await TextEditor.enrichHTML(this.context.sign.system.description.value);
        }
        return context;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        this.element.querySelector(".choose-sign")?.addEventListener("change", ev => {
            this._chooseSign(ev.currentTarget.value);
        });
    }

    async updateData(ev, formData) {
        this.data.items.sign = this.context.sign.toObject();
        this.data.exp.sign = this.context.exp;
        this.data.misc["system.details.starsign.value"] = this.context.sign.name;
    }

    async validate() {
        if (!this.context.sign) {
            this.showError("StarSign");
            return false;
        }
        return true;
    }

    async _chooseSign(id) {
        this.context.step++;
        this.context.exp = 0;
        let item = await warhammer.utility.findItemId(id);
        this.updateMessage("Chosen", { chosen: item?.name });
        await this._selectSign(id);
    }

    async _selectSign(id) {
        this.context.sign = await warhammer.utility.findItemId(id);
        this.render(true);
    }

    async addToDisplay() {
        return `<div class="chargen-details"><label>${game.i18n.localize("CHARGEN.StageStarSigns")}</label><span>${this.context.sign?.name || ""}</span></div>`;
    }

    static stageData() {
        let data = super.stageData();
        data.class = this;
        data.key = "star-sign";
        data.dependantOn = ["attributes"];
        return data;
    }
}
