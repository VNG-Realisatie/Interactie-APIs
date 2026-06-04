// Converter: officiële OneGov #2 synthetische dataset -> MijnPlannen `takenSeed`.
//
// Bron: data/onegov2-truus-cees.json (golden fixture uit
// github.com/govtechnl/onegov2-inwoner-centraal, laag "correspondentie").
// Idee: elke brief uit de correspondentiestroom is een taak.
//
// Draaien:  node data/build-seed.mjs   (schrijft data/taken-seed.mjs)
//
// De casus is in de bron geankerd op overlijden 2025-03-15. We verschuiven alle
// briefdatums met OFFSET_DAGEN zodat het overlijden ~3 weken geleden valt en de
// deadlines ("Nog X dagen") realistisch zijn voor een live demo.

import { readFile, writeFile } from "node:fs/promises";

const OFFSET_DAGEN = 426; // 2025-03-15 -> 2026-05-15

// Officiële organisatienaam -> onze organisatie-id.
const ORG = {
  gemeente: "gemeente",
  belastingdienst: "belastingdienst",
  toeslagen: "toeslagen",
  svb: "svb",
  cak: "cak",
  uwv: "uwv",
  rdw: "rdw",
  waterschap: "waterschap",
  cjib: "cjib",
  duo: "duo",
  rvo: "rvo",
  kvk: "kvk",
};

// Officieel brief-type -> ons vereenvoudigde brief-type.
const BRIEF = {
  informatiebrief: "informatiebrief",
  condoleance: "informatiebrief",
  beschikking: "informatiebrief",
  factuur: "factuur",
  terugvordering: "aanmaning",
  actiebrief: "actiebrief",
};

// Handoff-URL per organisatie (waar de afhandeling gebeurt; niet in de bron).
const URL_BY_ORG = {
  gemeente: "https://www.rijksoverheid.nl/onderwerpen/overlijden",
  belastingdienst: "https://www.belastingdienst.nl/overlijden",
  toeslagen: "https://www.toeslagen.nl/",
  svb: "https://www.svb.nl/nl/overlijden",
  cak: "https://www.hetcak.nl/",
  uwv: "https://www.uwv.nl/",
  rdw: "https://www.rdw.nl/particulier/voertuigen/auto/overlijden",
  waterschap: "https://www.belastingsamenwerking.nl/",
  cjib: "https://www.cjib.nl/",
  duo: "https://duo.nl/",
  rvo: "https://www.rvo.nl/",
  kvk: "https://www.kvk.nl/",
};

// Leesbare titel per brief_code (verrijking voor de demo-casus). Onbekende codes
// vallen terug op de actie-omschrijving of een generieke "type — organisatie".
const TITLES = {
  "RDW.S-0068": "Voertuig op naam van Cees — informatie",
  "SVB.OVERLIJDENSUITKERING": "Overlijdensuitkering AOW",
  "CAK.WLZ-CONDOLEANCE": "Condoleancebericht van het CAK",
  "CAK.WLZ-FACTUUR": "Eindafrekening eigen bijdrage Wlz betalen",
  "TOESLAGEN.HERZIENE-BESCHIKKING-ZORG": "Zorgtoeslag herzien (beschikking)",
  "TOESLAGEN.TERUGVORDERING-ZORG": "Terugvordering zorgtoeslag — betalen of bezwaar",
  "BD.ERVENBRIEF": "Contactpersoon doorgeven aan de Belastingdienst",
  "BD.AANGIFTE-ERFBELASTING": "Aangifte erfbelasting indienen",
  "GEMEENTE.CONDOLEANCE": "Condoleancebericht van de gemeente",
  "WS.AANSLAG": "Aanslag waterschapsbelasting betalen",
};

const TYPE_LABEL = {
  informatiebrief: "Informatiebrief",
  condoleance: "Condoleancebrief",
  beschikking: "Beschikking",
  factuur: "Factuur",
  terugvordering: "Terugvordering",
  actiebrief: "Actiebrief",
};

function shiftDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function orgId(name) {
  const key = String(name).toLowerCase().replace(/\s+/g, "");
  return ORG[key] ?? key.replace(/[^a-z0-9]/g, "");
}

const src = JSON.parse(await readFile(new URL("./onegov2-truus-cees.json", import.meta.url)));

const taken = src.correspondentie.map((c) => {
  const org = orgId(c.organisatie);
  const ontvangen = shiftDays(c.verzonden_op, OFFSET_DAGEN);
  let deadline = "";
  if (c.actie_vereist && c.wettelijke_reactietermijn_dagen) {
    deadline = `${shiftDays(c.verzonden_op, OFFSET_DAGEN + c.wettelijke_reactietermijn_dagen)}T23:59:59+01:00`;
  }
  const titel = TITLES[c.brief_code] ?? cap(c.actie_omschrijving) ?? `${TYPE_LABEL[c.type] ?? "Brief"} — ${c.organisatie}`;
  return {
    uuid: c.id,
    organisatie: org,
    soort: "verplichting",
    briefType: BRIEF[c.type] ?? "actiebrief",
    briefCode: c.brief_code ?? "",
    ontvangen,
    titel: { nl: titel },
    toelichting: { nl: c.actie_omschrijving ?? `${TYPE_LABEL[c.type] ?? "Bericht"} van ${c.organisatie}.` },
    aanhef: c.aanhef ?? "",
    geadresseerde: c.geadresseerde ?? "",
    adres: c.adres ?? null,
    actieNodig: c.actie_vereist === true,
    automatisch: c.actie_vereist === false && c.type === "beschikking",
    status: "open",
    deadline,
    leidtTotZaak: c.actie_vereist ? cap(c.actie_omschrijving) : null,
    uitvoering: { canonicalUrl: URL_BY_ORG[org] ?? "" },
  };
});

const header = `// GEGENEREERD door data/build-seed.mjs — niet handmatig bewerken.
// Bron: officiële OneGov #2 synthetische dataset, golden fixture Truus/Cees
// (github.com/govtechnl/onegov2-inwoner-centraal, laag "correspondentie").
// Casus verschoven met ${OFFSET_DAGEN} dagen zodat het overlijden ~3 weken geleden valt.
// Elke brief uit de correspondentiestroom is hier een taak.
`;

await writeFile(
  new URL("./taken-seed.mjs", import.meta.url),
  `${header}\nexport const takenSeed = ${JSON.stringify(taken, null, 2)};\n`,
);

console.log(`taken-seed.mjs geschreven: ${taken.length} taken uit de correspondentiestroom`);
