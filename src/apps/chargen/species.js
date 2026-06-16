import { ChargenStage } from "./stage";
import WFRP_Utility from "../../system/utility-wfrp4e.js";

export class SpeciesStage extends ChargenStage {

  journalId = "Compendium.wfrp4e-core.journals.JournalEntry.IQ0PgoJihQltCBUU.JournalEntryPage.l0f11ypRjH9sR48Q"

  static DEFAULT_OPTIONS = {
    classes: ["species"],
    position: {
      width: 340,
      height: 650
    },
    window: {
      title: "CHARGEN.StageSpecies"
    },
    actions: {
      rollSpecies: function (ev) { return this.onRollSpecies(ev); },
      selectSpecies: function (ev, target) {
        this.context.exp = 0;
        this.context.choose = target.dataset.species;
        this.updateMessage("Chosen", { chosen: game.wfrp4e.config.species[this.context.choose] });
        this.setSpecies(this.context.choose);
      },
      selectSubspecies: function (ev, target) {
        this.setSpecies(this.context.species, target.dataset.subspecies);
      }
    }
  };

  static PARTS = {
    form: {
      template: "systems/wfrp4e/templates/apps/chargen/species.hbs",
      scrollable: [".chargen-content"]
    }
  };

  static get title() { return game.i18n.localize("CHARGEN.StageSpecies"); }

  context = {
    species: "",
    subspecies: "",
    exp: 0
  };


  async _prepareContext(options) {
    let context = await super._prepareContext(options);

    let speciesTable = game.wfrp4e.tables.findTable("species");

    if (!speciesTable)
    {
      ui.notifications.error("CHARGEN.ERROR.SpeciesTable", {localize: true, permanent: true})
      throw new Error (game.i18n.localize("CHARGEN.ERROR.SpeciesTable"))
    }

    context.species = {}

    for (let result of speciesTable.results)
    {
      let speciesKey = warhammer.utility.findKey(result.name, game.wfrp4e.config.species)
      if (speciesKey)
      {
        context.species[speciesKey] = result.name
      }
    }

    context.speciesDisplay = game.wfrp4e.config.species[this.context.species];

    if (this.context.species && game.wfrp4e.config.subspecies[this.context.species]) {
      context.subspeciesChoices = game.wfrp4e.config.subspecies[this.context.species];
    }

    if (this.context.subspecies) {
      context.speciesDisplay += ` (${game.wfrp4e.config.subspecies[this.context.species][this.context.subspecies]?.name})`;
    }

    if (this.context.species) {
      context.preview = {
        characteristics: WFRP_Utility.speciesCharacteristicFormulae(this.context.species, this.context.subspecies),
        movement: WFRP_Utility.speciesMovement(this.context.species, this.context.subspecies),
        fate: WFRP_Utility.speciesFate(this.context.species, this.context.subspecies),
        resilience: WFRP_Utility.speciesResilience(this.context.species, this.context.subspecies),
        extra: WFRP_Utility.speciesExtra(this.context.species, this.context.subspecies),
        ...WFRP_Utility.speciesSkillsTalents(this.context.species, this.context.subspecies)
      }

      for (let i in context.preview.talents) {
        if (Number.isNumeric(context.preview.talents[i])) {
          context.preview.randomTalents.talents = Number(context.preview.talents[i]);
        }
      }

      const or = game.i18n.localize("SkillsOr");
      context.preview.talents = context.preview.talents.filter(t => !Number.isNumeric(t)).map(t => t.replace(', ', ` <em>${or}</em> `));
      context.preview.skills = context.preview.skills.map(t => t.replace(', ', ' <em>or</em> '));

      let talents = [];

      for (let [key, value] of Object.entries(context.preview.randomTalents)) {
        let table = game.wfrp4e.tables.findTable(key);

        talents.push({
          name: table.name,
          count: Number(value)
        });
      }

      context.preview.randomTalents = talents;
    }

    if (game.wfrp4e.config.extraSpecies.length)
    {
      context.extraSpecies = game.wfrp4e.config.extraSpecies.reduce((extra, species) => {
        extra[species] = game.wfrp4e.config.species[species];
        return extra;
      }, {})
    }

    return context;
  }


  async validate() {
    let valid = await super.validate();
    if (!this.context.species)
    {
      this.showError("SpeciesSubmit")
      valid = false
    }
    return valid;
  }


  // Set roll, unselect whatever user has chosen
  async onRollSpecies(event) {
    event.stopPropagation();
    this.context.exp = 20;
    this.context.roll = await game.wfrp4e.tables.rollTable("species");
    this.context.choose = false;
    this.updateMessage("Rolled", {rolled : this.context.roll.name})
    this.setSpecies(warhammer.utility.findKey(this.context.roll.name, game.wfrp4e.config.species));
  }


  async updateData(event, formData) {
    this.data.species = this.context.species;
    this.data.subspecies = this.context.subspecies;
    this.data.exp.species = this.context.exp;
  }


  setSpecies(species, subspecies) {
    this.context.species = species;
    if (subspecies) {
      this.context.subspecies = subspecies;
    }
    else {
      this.context.subspecies = "";
    }
    this.render(true);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    // Single Species column before selection; expand to four columns after.
    // The Characteristics column appears to the LEFT of the Species column, so
    // shift the window left by its width when expanding (and back on collapse)
    // to keep the Species column roughly in place.
    const expandedWidth = 1000;
    const collapsedWidth = 340;
    const leftShift = 216; // Characteristics column (200px) + padding
    let targetWidth = this.context.species ? expandedWidth : collapsedWidth;
    if (this.position.width !== targetWidth) {
      let left = this.position.left + (targetWidth === expandedWidth ? -leftShift : leftShift);
      this.setPosition({ width: targetWidth, left });
    }
  }
}
