import WFRP_Utility from "../../system/utility-wfrp4e.js";

/**
 * Base class for an individual character generation stage (species, career, etc.)
 * Migrated from V1 FormApplication to ApplicationV2.
 */
export class ChargenStage extends HandlebarsApplicationMixin(ApplicationV2) {

  // Stages that may only be submitted once (e.g. skills & talents). Subclass overrides.
  static cannotResubmit = false;

  journalId = "";
  context = {};

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["wfrp4e", "chargen"],
    window: {
      resizable: true,
      minimizable: true,
      title: "CHARGEN.Title",
      controls: [
        {
          icon: "fa-solid fa-circle-question",
          label: "CHARGEN.Help",
          action: "chargenHelp"
        }
      ]
    },
    position: {
      width: 1000,
      height: 600
    },
    form: {
      handler: this._onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: false
    },
    actions: {
      chargenHelp: function () { return this.renderJournalPage(); },
      itemLookup: this._onItemLookup
    }
  };

  /**
   * @param {object} data    Shared CharGen data object (this.data of the orchestrator)
   * @param {object} options Application options. Custom keys: complete (callback), index, message
   */
  constructor(data, options = {}) {
    super(options);
    this.data = data;
    this.completeCallback = options.complete;
    this.stageIndex = options.index;
    this.message = options.message;
  }

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    context.data = this.data;
    context.context = this.context;
    return context;
  }

  /**
   * Form submission. Validates, lets the subclass write its data into the shared
   * object, marks the stage complete, and closes the stage window.
   */
  static async _onSubmitForm(event, form, formData) {
    if (!(await this.validate())) {
      return;
    }
    this.isCompleted = true;
    await this.updateData(event, formData.object);
    this.completeCallback?.(this.stageIndex);
    this.close();
  }

  /**
   * @abstract Subclasses write their results into the shared CharGen data object here.
   */
  async updateData(event, formData) { }

  async validate() {
    let valid = !this.constructor.cannotResubmit || !this.isCompleted;
    if (!valid) {
      this.showError("StageAlreadySubmitted");
    }
    return valid;
  }

  showError(key, args) {
    ui.notifications.error(game.i18n.format("CHARGEN.ERROR." + key, args));
  }

  updateMessage(key, args = {}, string = null) {
    args.user = game.user.name;
    if (this.message) {
      let content = this.message.content;

      if (string)
        content += string;
      else
        content += game.i18n.format("CHARGEN.Message." + key, args);

      return this.message.update({ content });
    }
  }

  // HTML to add to the char gen application summary
  async addToDisplay() {
    return null;
  }

  static stageData() {
    return {
      class: this,
      key: "stage",
      title: null,
      dependantOn: [],
      app: null,
      complete: false
    };
  }

  async renderJournalPage() {
    let journalPage = await fromUuid(this.journalId);

    if (journalPage) {
      await journalPage.parent.sheet.render(true);
      journalPage.parent.sheet.goToPage(journalPage.id);
    }
  }

  static async _onItemLookup(ev, target) {
    let itemType = target.dataset.type;
    let openMethod = target.dataset.open || "sheet"; // post or sheet
    let name = target.dataset.name || target.textContent.trim(); // Use name attribute if available, otherwise use text clicked.
    let item;
    if (name)
      item = await WFRP_Utility.find(name, itemType);

    if (item) {
      if (openMethod == "sheet")
        item.sheet.render(true);
      else
        item.postItem();
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    // Autoselect entire text when focusing an input
    this.element.querySelectorAll("input").forEach(el => {
      el.addEventListener("focusin", ev => ev.target.select());
    });
  }
}
