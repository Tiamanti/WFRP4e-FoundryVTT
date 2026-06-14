import { BaseItemModel } from "./components/base";

export class SpeciesModel extends BaseItemModel
{
  static LOCALIZATION_PREFIXES = ["WH.Models.species"];
  static defineSchema()
  {
        let fields = foundry.data.fields;
        let schema = super.defineSchema();


        schema.characteristics = new fields.SchemaField({
          ws: new SpeciesCharacteristic(),
          bs: new SpeciesCharacteristic(),
          s: new SpeciesCharacteristic(),
          t: new SpeciesCharacteristic(),
          i: new SpeciesCharacteristic(),
          ag: new SpeciesCharacteristic(),
          dex: new SpeciesCharacteristic(),
          int: new SpeciesCharacteristic(),
          wp: new SpeciesCharacteristic(),
          fel: new SpeciesCharacteristic()
        })

        schema.fate = new fields.NumberField({min: 0, initial: 0});
        schema.resilience = new fields.NumberField({min: 0, initial: 0});
        schema.extra = new fields.NumberField({min: 0, initial: 0});

        schema.movement = new fields.NumberField({min: 0, initial: 4});

        schema.size = new fields.StringField({choices: game.wfrp4e.config.actorSizes, initial: "avg"})

        // Skills granted/advanced by the species (names)
        schema.skills = ListModel.createListModel(new fields.StringField());

        schema.talents = new fields.SchemaField({
          // Mandatory talents granted by the species (names), e.g. "Doomed"
          mandatory : ListModel.createListModel(new fields.StringField()),
          // Talent choices: each entry is a comma-separated "Savvy, Suave" list to pick one from
          choices : ListModel.createListModel(new fields.StringField()),
          // Random talents rolled from tables: [{table: "talents", count: 3}]
          random : new fields.ArrayField(new fields.SchemaField({
            table : new fields.StringField({initial: "talents"}),
            count : new fields.NumberField({integer: true, min: 0, initial: 0})
          })),
          // Optional talent swaps offered on roll: [{from: "X", to: "Y"}]
          replacement : new fields.ArrayField(new fields.SchemaField({
            from : new fields.StringField(),
            to : new fields.StringField()
          }))
        })

        // Traits granted by the species (names)
        schema.traits = ListModel.createListModel(new fields.StringField());

        // Key used to roll this species' career table (defaults to the species key)
        schema.careerTable = new fields.StringField();
        // Career swaps: [{from: "Soldier", to: ["Ironbreaker"]}]
        schema.careerReplacement = new fields.ArrayField(new fields.SchemaField({
          from : new fields.StringField(),
          to : new fields.ArrayField(new fields.StringField())
        }));

        // Details rolled in the details stage
        schema.age = new fields.StringField();
        schema.height = new fields.SchemaField({
          feet : new fields.NumberField({integer: true, min: 0, initial: 0}),
          inches : new fields.NumberField({integer: true, min: 0, initial: 0}),
          die : new fields.StringField()
        });

        // If this item is a subspecies, reference its parent species item
        schema.subspeciesOf = new fields.EmbeddedDataField(DocumentReferenceModel);

        // Config keys this item represents (e.g. ["human"] or ["reiklander"])
        schema.keys = new fields.ArrayField(new fields.StringField());

        return schema;
    }
}


class SpeciesCharacteristic extends foundry.data.fields.SchemaField
{
  constructor() {
    super({
      base: new foundry.data.fields.NumberField({min: 0, initial: 20}),
      dice: new foundry.data.fields.NumberField({min: 0, initial: 2})
    })
  }

}
