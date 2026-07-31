/**
 * DEV TOOL — Generate Species items from game.wfrp4e.config.species*
 *
 * Not part of the built system (not imported by src/, not bundled). The real
 * Species-item pack will be shipped by wfrp4e-core; this just produces local
 * data for testing chargen against Species items. Do NOT commit the generated pack.
 *
 * Usage: run in Foundry as a GM (script macro or dev console) after the world
 * (and wfrp4e-core) has loaded. Re-running clears and regenerates.
 *
 * Output: Item documents of type "species" in the world, inside the folder
 * "Species (Generated)". Subspecies items reference their parent via subspeciesOf.
 */
(async () => {
  const config = game.wfrp4e.config;
  const folderName = "Species (Generated)";

  // --- helpers ---------------------------------------------------------------

  // "2d10+20" -> {dice:2, base:20};  "2d10" -> {dice:2, base:0}
  const parseChar = (formula) => {
    let [dicePart, bonus] = String(formula ?? "2d10+0").split("+").map(s => s.trim());
    let dice = Number((dicePart.match(/(\d+)\s*d\s*10/i) || [])[1] ?? 2);
    let base = Number(bonus ?? 0) || 0;
    return { dice, base };
  };

  const buildCharacteristics = (chars) =>
    Object.fromEntries(Object.entries(chars).map(([c, f]) => [c, parseChar(f)]));

  // Split the legacy talents array (+ random-table map) into the new structure
  const buildTalents = (talentsArr = [], randomTalentsMap = {}, replacementMap = {}) => {
    let mandatory = [];
    let choices = [];
    let random = [];

    for (let t of (talentsArr || [])) {
      if (typeof t === "number" || (typeof t === "string" && /^\d+$/.test(t.trim()))) {
        // Trailing number = count rolled from the default "talents" table
        random.push({ table: "talents", count: Number(t) });
      } else if (typeof t === "string" && t.includes(",")) {
        choices.push(t);
      } else if (t) {
        mandatory.push(t);
      }
    }

    // Additional / explicit random tables
    for (let [table, count] of Object.entries(randomTalentsMap || {})) {
      let existing = random.find(r => r.table === table);
      if (existing) existing.count = Number(count);
      else random.push({ table, count: Number(count) });
    }

    let replacement = Object.entries(replacementMap || {}).map(([from, to]) => ({ from, to }));

    return {
      mandatory: { list: mandatory },
      choices: { list: choices },
      random,
      replacement
    };
  };

  const buildHeight = (h) =>
    h ? { feet: h.feet ?? 0, inches: h.inches ?? 0, die: h.die ?? "" } : { feet: 0, inches: 0, die: "" };

  const buildCareerReplacement = (map = {}) =>
    Object.entries(map || {}).map(([from, to]) => ({ from, to: Array.isArray(to) ? to : [to] }));

  // --- idempotency: clear previous output ------------------------------------
  let folder = game.folders.find(f => f.name === folderName && f.type === "Item");
  if (folder) {
    await Item.implementation.deleteDocuments(folder.contents.map(i => i.id));
  } else {
    folder = await Folder.create({ name: folderName, type: "Item" });
  }

  // --- top-level species -----------------------------------------------------
  let speciesData = [];
  for (let key of Object.keys(config.species)) {
    let chars = config.speciesCharacteristics[key];
    if (!chars) continue; // species without stat data (e.g. label-only) are skipped

    speciesData.push({
      name: config.species[key],
      type: "species",
      img: "systems/wfrp4e/icons/blank.png",
      folder: folder.id,
      system: {
        characteristics: buildCharacteristics(chars),
        fate: config.speciesFate[key] ?? 0,
        resilience: config.speciesRes[key] ?? 0,
        extra: config.speciesExtra[key] ?? 0,
        movement: config.speciesMovement[key] ?? 4,
        skills: { list: config.speciesSkills[key] || [] },
        talents: buildTalents(config.speciesTalents[key], config.speciesRandomTalents[key], config.speciesTalentReplacement[key]),
        traits: { list: config.speciesTraits[key] || [] },
        careerTable: key,
        careerReplacement: buildCareerReplacement(config.speciesCareerReplacements[key]),
        age: config.speciesAge[key] || "",
        height: buildHeight(config.speciesHeight[key]),
        keys: [key]
      }
    });
  }

  let createdSpecies = await Item.implementation.createDocuments(speciesData);
  let parentByKey = {};
  for (let item of createdSpecies) parentByKey[item.system.keys[0]] = item;

  // --- subspecies (reference parent via subspeciesOf) ------------------------
  let subData = [];
  for (let [parentKey, subs] of Object.entries(config.subspecies || {})) {
    let parent = parentByKey[parentKey];
    for (let [subKey, sub] of Object.entries(subs || {})) {
      let chars = sub.characteristics || config.speciesCharacteristics[parentKey];
      if (!chars) continue;

      subData.push({
        name: sub.name || subKey,
        type: "species",
        img: "systems/wfrp4e/icons/blank.png",
        folder: folder.id,
        system: {
          characteristics: buildCharacteristics(chars),
          fate: sub.fate ?? config.speciesFate[parentKey] ?? 0,
          resilience: sub.resilience ?? config.speciesRes[parentKey] ?? 0,
          extra: sub.extra ?? config.speciesExtra[parentKey] ?? 0,
          movement: sub.movement ?? config.speciesMovement[parentKey] ?? 4,
          skills: { list: sub.skills || config.speciesSkills[parentKey] || [] },
          talents: buildTalents(
            sub.talents || config.speciesTalents[parentKey],
            sub.randomTalents || config.speciesRandomTalents[parentKey],
            sub.talentReplacement || config.speciesTalentReplacement[parentKey]
          ),
          traits: { list: sub.speciesTraits || config.speciesTraits[parentKey] || [] },
          careerTable: sub.careerTable || `${parentKey}-${subKey}`,
          careerReplacement: buildCareerReplacement(config.speciesCareerReplacements[`${parentKey}-${subKey}`]),
          age: config.speciesAge[parentKey] || "",
          height: buildHeight(config.speciesHeight[parentKey]),
          subspeciesOf: parent ? { uuid: parent.uuid, id: parent.id, name: parent.name } : { uuid: "", id: "", name: "" },
          keys: [subKey]
        }
      });
    }
  }

  let createdSubs = subData.length ? await Item.implementation.createDocuments(subData) : [];

  ui.notifications.info(`Generated ${createdSpecies.length} species + ${createdSubs.length} subspecies into folder "${folderName}".`);
  console.log("Generated species items:", createdSpecies, createdSubs);
})();
