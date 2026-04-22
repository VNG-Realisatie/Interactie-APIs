/**
 * Gedeelde logica voor MIM-data verwerking
 */

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
    .replace(/&#xA;/gi, "\n")
    .replace(/&#x9;/gi, "\t")
    .replace(/#NOTES#/g, "\n")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  if (isBoilerplate(cleaned)) return "";
  return cleaned;
}

function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");
}

module.exports = {
  cleanText,
  isBoilerplate,
  toCamelCase,
};
