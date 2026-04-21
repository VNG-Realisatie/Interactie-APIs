const fs = require("fs");
const path = require("path");

const XML_PATH = path.join(__dirname, "../MijnAgenda.xml");
const OUTPUT_FILE = path.join(__dirname, "../schemas/afspraken/v1.0.0.json");

const BOILERPLATE_TEXTS = [
  "De beschrijving van de betekenis van de construct zoals gespecificeerd in de catalogus van de desbetreffende (basis)registratie of informatiemodel.",
  "Aanvullende beschrijving van het construct met de bedoeling dat te verduidelijken.",
  "De naam in natuurlijke of formele taal; afhankelijk van gekozen aanpak. Een alternatieve naam.",
  "Een referentie naar een begrip in een begrippenlijst/kennismodel middels een URI, of de naam van een begrip, welke kan worden afgebeeld op een URI.",
  "De datum waarop de constructie is opgenomen in het informatiemodel.",
  "De basisregistratie in wiens catalogus het objecttype is gespecificeerd",
  "De basisregistratie of het informatiemodel waaruit de definitie is overgenomen",
  "Aanduiding dat gegeven afleidbaar is uit andere attribuut- en/of relatiesoorten.",
  "Indicatie dat een attribuutsoort het objecttype waar het bijhoort classificeert",
  "Indicatie of de formele historie van de attribuutsoort te bevragen is.",
  "De indicatie of te bevragen is dat er twijfel is of is geweest",
  "Indicatie of de materiële historie van de attribuutsoort te bevragen is.",
  "Lengte van de waarde in posities.",
  "De locatie waar informatie over de gegevens van een construct te vinden zijn.",
  "Indicatie waarmee wordt aangegeven dat het gegeven ook geen waarde kan hebben.",
  "Beschrijving van het gegevenspatroon van dit element.",
  "De positie van de construct binnen producten",
  "Optionaliteitsregels of waardebeperkende regels.",
  "TODO",
];

function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");
}

function isBoilerplate(text) {
  if (!text) return true;
  return BOILERPLATE_TEXTS.some((b) => text.includes(b));
}

function cleanText(text) {
  if (!text) return "";
  let cleaned = text
    .replace(/Description:\s*/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#xA;/g, "\n")
    .replace(/#NOTES#/g, "\n")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  if (isBoilerplate(cleaned)) return "";
  return cleaned;
}
function parseXmi() {
  console.log(`📖 Inlezen van ${XML_PATH}...`);
  // Enterprise Architect exports are often windows-1252 / latin1
  const content = fs.readFileSync(XML_PATH, "latin1");

  const elements = {};
  const associations = [];

  // 1. Extraheer alle elementen (Classes/Objecttypes)
  // We gebruiken een meer specifieke splitsing om te voorkomen dat attributen van klasse A bij klasse B terecht komen.
  const elementBlocks = content.split("</element>");

  for (const block of elementBlocks) {
    const match = block.match(/<element xmi:idref="([^"]+)"[^>]*name="([^"]+)"/);
    if (!match) continue;

    const id = match[1];
    const name = match[2];

    const propsMatch = block.match(/<properties [^>]*stereotype="([^"]+)"/);
    const stereotype = propsMatch ? propsMatch[1] : null;

    // Pak alleen de tags die DIRECT onder het element staan (niet in attributen)
    const elementTagsPart = block.split("<attributes>")[0];
    const tags = {};
    const tagMatches = elementTagsPart.matchAll(
      /<tag [^>]*name="([^"]+)" (?:value|notes)="([^"]*)"/g,
    );
    for (const tagMatch of tagMatches) {
      const cleaned = cleanText(tagMatch[2]);
      if (cleaned) tags[tagMatch[1]] = cleaned;
    }

    const attributes = [];
    const attributesPartMatch = block.match(/<attributes>([\s\S]*?)<\/attributes>/);
    if (attributesPartMatch) {
      const attrBlocks = attributesPartMatch[1].split("</attribute>");
      for (const attrBlock of attrBlocks) {
        const am = attrBlock.match(/<attribute xmi:idref="([^"]+)" name="([^"]+)"/);
        if (!am) continue;

        const typeMatch = attrBlock.match(/<properties type="([^"]+)"/);
        const boundsMatch = attrBlock.match(/<bounds lower="([^"]+)" upper="([^"]+)"/);

        const attrTags = {};
        const attrTagMatches = attrBlock.matchAll(
          /<tag [^>]*name="([^"]+)" (?:value|notes)="([^"]*)"/g,
        );
        for (const atm of attrTagMatches) {
          const cleaned = cleanText(atm[2]);
          if (cleaned) attrTags[atm[1]] = cleaned;
        }

        attributes.push({
          name: am[2],
          type: typeMatch ? typeMatch[1] : "string",
          required: boundsMatch ? boundsMatch[1] !== "0" : true,
          multiple: boundsMatch ? boundsMatch[2] !== "1" : false,
          tags: attrTags,
        });
      }
    }

    elements[id] = { id, name, stereotype, tags, attributes };
  }

  // 2. Extraheer Associaties
  const assocMatches = content.matchAll(
    /<connector [^>]*>[\s\S]*?<model [^>]*name="([^"]+)"[\s\S]*?<source xmi:idref="([^"]+)"[\s\S]*?<target xmi:idref="([^"]+)"[\s\S]*?<\/connector>/g,
  );
  for (const match of assocMatches) {
    associations.push({
      name: match[1],
      source: match[2],
      target: match[3],
    });
  }

  // 3. Bouw het gebundelde JSON Schema
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "MijnAgenda",
    description:
      "Conceptueel informatiemodel voor agenda-afspraken, automatisch gegenereerd vanuit Enterprise Architect.",
    type: "object",
    $defs: {},
  };

  const objectTypes = Object.values(elements).filter(
    (e) => e.stereotype === "Objecttype" || e.stereotype === "Relatieklasse",
  );

  for (const obj of objectTypes) {
    const technicalName = toCamelCase(obj.name);
    const def = {
      type: "object",
      title: obj.name,
      description: obj.tags["Definitie"] || obj.tags["Toelichting"] || undefined,
      "x-mim-metadata":
        Object.keys(obj.tags).length > 0
          ? { ...obj.tags, id: obj.id, stereotype: obj.stereotype }
          : undefined,
      properties: {},
      required: [],
    };

    if (!def["x-mim-metadata"]) delete def["x-mim-metadata"];

    for (const attr of obj.attributes) {
      const attrTechName = toCamelCase(attr.name);
      let jsonType = "string";
      let jsonFormat = undefined;

      if (attr.type === "Integer") jsonType = "integer";
      if (attr.type === "DateTime") {
        jsonType = "string";
        jsonFormat = "date-time";
      }
      if (attr.type === "Date") {
        jsonType = "string";
        jsonFormat = "date";
      }
      if (attr.type === "URI") {
        jsonType = "string";
        jsonFormat = "uri";
      }

      const prop = {
        type: jsonType,
        description: attr.tags["Definitie"] || attr.tags["Toelichting"] || undefined,
        "x-mim-metadata":
          Object.keys(attr.tags).length > 0
            ? { ...attr.tags, type: attr.type, naam: attr.name }
            : undefined,
      };
      if (jsonFormat) prop.format = jsonFormat;
      if (!prop["x-mim-metadata"]) delete prop["x-mim-metadata"];

      def.properties[attrTechName] = attr.multiple ? { type: "array", items: prop } : prop;
      if (attr.required) def.required.push(attrTechName);
    }

    // Voeg associaties toe
    const outgoing = associations.filter((a) => a.source === obj.id);
    for (const assoc of outgoing) {
      const targetObj = elements[assoc.target];
      if (targetObj) {
        const assocName = toCamelCase(assoc.name || targetObj.name);
        def.properties[assocName] = {
          $ref: `#/$defs/${toCamelCase(targetObj.name)}`,
          description: assoc.name ? `Relatie: ${assoc.name}` : undefined,
        };
      }
    }

    if (def.required.length === 0) delete def.required;
    schema.$defs[technicalName] = def;
  }

  schema["$ref"] = "#/$defs/agendaAfspraak";

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(schema, null, 2));
  console.log(`\n🎉 Succes! Schema hersteld en opgeschoond: ${OUTPUT_FILE}`);
}

parseXmi();
