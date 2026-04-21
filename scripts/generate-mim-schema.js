const fs = require("fs");
const path = require("path");

const XML_PATH = path.join(__dirname, "../MijnAgenda.xml");
const OUTPUT_FILE = path.join(__dirname, "../schemas/mim/v1.0.0.json");

const MIM_DESCRIPTIONS = {
  Definitie:
    "De beschrijving van de betekenis van de construct zoals gespecificeerd in de catalogus van de desbetreffende (basis)registratie of informatiemodel.",
  Toelichting: "Een inhoudelijke toelichting op de definitie, ter verheldering of nadere duiding.",
  Herkomst:
    "De basisregistratie in wiens catalogus het objecttype is gespecificeerd (oftewel de basisregistratie waar het objecttype deel van uitmaakt).",
  Authentiek:
    "Aanduiding of het een authentiek gegeven (attribuutsoort) betreft. Authentieke gegevens zijn wettelijk verplicht te gebruiken zonder nader onderzoek naar de juistheid ervan.",
  Lengte: "De maximale lengte van de waarde in posities (bijv. '1-80' of '20').",
  "Formeel patroon":
    "Beschrijving van het gegevenspatroon in de vorm van een reguliere expressie (regex).",
  "Mogelijk geen waarde": "Indicatie of het gegeven ook geen waarde (null) kan hebben.",
  "Indicatie formele historie":
    "Indicatie of de formele historie van de attribuutsoort te bevragen is (registratie-momenten).",
  "Indicatie materiële historie":
    "Indicatie of de materiële historie van de attribuutsoort te bevragen is (gebeurtenis in de werkelijkheid).",
  Begrip:
    "Een referentie naar een begrip in een begrippenlijst of kennismodel middels een URI of naam.",
  Eigenaar: "De partij die verantwoordelijk is voor de definitie en het beheer van dit gegeven.",
  "Alternatieve naam": "De naam in natuurlijke of formele taal; een alias voor het element.",
  Positie: "De positie van de construct binnen de opeenvolging van elementen in een product.",
  Kwaliteitsbegrip:
    "Beschrijving van de kwaliteitseisen waaraan de waarden van de attribuutsoort moeten voldoen.",
  Populatie:
    "De verzameling van alle objecten van een bepaald type die op een bepaald moment aanwezig zijn.",
  "Indicatie afleidbaar":
    "Aanduiding dat het gegeven afleidbaar is uit andere attribuut- en/of relatiesoorten.",
  Regels: "Optionaliteitsregels of waardebeperkende regels die gelden voor dit element.",
  Locatie:
    "De verwijzing naar de plek waar de waarden beschikbaar worden gesteld (bijv. een URI naar een waardenlijst).",
  Patroon: "Korte beschrijving van de opbouw van de waarde.",
  "Indicatie classificerend":
    "Indicatie dat een attribuutsoort het objecttype waar het bijhoort classificeert in (sub)typen.",
  Code: "Een unieke korte code die een specifieke waarde in een enumeratie identificeert.",
};

const MIM_CONCEPT_DEFINITIONS = {
  Objecttype:
    "De typering van een groep objecten die binnen een domein relevant zijn en als gelijksoortig worden beschouwd. Een objecttype beschrijft 'dingen' uit de werkelijkheid (zoals een Pand, Persoon of Afspraak) die dezelfde eigenschappen delen.",
  Attribuutsoort:
    "De typering van een gelijksoortig kenmerk van een objecttype. Het legt vast welk type gegevens (zoals tekst of datum) voor dat kenmerk mag worden opgenomen.",
  Relatiesoort:
    "De typering van de relatie tussen twee objecttypen. Het geeft aan dat er een betekenisvolle verbinding bestaat tussen objecten (bijv. Persoon 'woont op' Adres).",
  Relatieklasse:
    "Een relatiesoort die zelf ook kenmerken (attribuutsoorten) heeft. Deze kenmerken horen bij de relatie zelf, en niet bij één van de twee gekoppelde objecten.",
  Enumeratie: "Een lijst van vaste mogelijke waarden (enumeratiewaarden) for een attribuut.",
  Enumeratiewaarde: "Een specifiek toegestane waarde binnen een enumeratie.",
  "Gestructureerd datatype":
    "Een samengesteld datatype dat bestaat uit meerdere elementen of andere datatypen.",
  "Primitief datatype":
    "Een enkelvoudig, niet verder op te splitsen datatype (zoals String, Integer, Boolean).",
  Gegevensgroeptype:
    "Een verzameling van attribuutsoorten die als één geheel bij een objecttype horen.",
};

function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/Description:\s*/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#xA;/g, "\n")
    .replace(/#NOTES#/g, "\n")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

function parseMimSchema() {
  console.log(`📖 Analyseren van MIM definities in ${XML_PATH}...`);
  const content = fs.readFileSync(XML_PATH, "latin1");

  const metaSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "MIM Meta-Schema",
    description:
      "Formele beschrijving van het Metamodel Informatie Modellering (MIM), inclusief alle metaklassen conform de Geonovum-standaard.",
    type: "object",
    $defs: {},
  };

  const stereotypeBlocks = content.split('<packagedElement xmi:type="uml:Stereotype"');

  for (let i = 1; i < stereotypeBlocks.length; i++) {
    const block = stereotypeBlocks[i].split("</packagedElement>")[0];
    const nameMatch = block.match(/name="([^"]+)"/);
    if (!nameMatch) continue;

    const stName = nameMatch[1];
    if (!MIM_CONCEPT_DEFINITIONS[stName]) continue;

    const properties = {};
    const propMatches = block.matchAll(/<ownedAttribute[^>]*name="([^"]+)"/g);
    for (const pm of propMatches) {
      const propName = pm[1];
      if (propName.startsWith("base_")) continue;

      properties[propName] = {
        type: "string",
        description: MIM_DESCRIPTIONS[propName] || `MIM eigenschap: ${propName}`,
      };
    }

    metaSchema.$defs[stName] = {
      type: "object",
      title: stName,
      description: MIM_CONCEPT_DEFINITIONS[stName],
      properties: properties,
      additionalProperties: true,
    };
  }

  metaSchema.properties = {
    "x-mim-metadata": {
      oneOf: Object.keys(metaSchema.$defs).map((name) => ({ $ref: `#/$defs/${name}` })),
    },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metaSchema, null, 2));
  console.log(`\n🎉 Volledig compliant MIM Meta-Schema gegenereerd: ${OUTPUT_FILE}`);
}

parseMimSchema();
