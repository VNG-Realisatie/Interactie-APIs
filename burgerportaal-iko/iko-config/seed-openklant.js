// Verrijkt de echte Open Klant met de demo-persona's van het burgerportaal.
// Elke persona krijgt een partij (gekoppeld op BSN), adres en digitale
// adressen, zodat "Mijn gegevens" per ingelogde burger verschilt.
// Idempotent: partijen worden op BSN gezocht en bijgewerkt, digitale
// adressen niet gedupliceerd.

const BASE = process.env.OPENKLANT_URL || 'http://localhost:8006/klantinteracties/api/v1';
// TokenAuth uit scratchpad/iko-src/imports/open-klanten/database/1-setup-klanten.sql
const TOKEN = process.env.OPENKLANT_TOKEN || 'Token 5bf819967d9fdd00d326ce20774768b4182285e5';

const HEADERS = {
  Authorization: TOKEN,
  'Content-Type': 'application/json',
};

// Zelfde BSN's als de users in deploy/keycloak/realm.json.
const PERSONAS = [
  {
    bsn: '569312863',
    contactnaam: { voorletters: 'J.', voornaam: 'Jeroen', voorvoegselAchternaam: 'van', achternaam: 'Drouwen' },
    adres: { straatnaam: 'Keukenlaan', huisnummer: 133, postcode: '1234 AB', stad: 'Voorbeeld' },
    digitaleAdressen: [
      { soortDigitaalAdres: 'email', adres: 'jeroen@example.test', omschrijving: 'E-mail', isStandaardAdres: true },
      { soortDigitaalAdres: 'telefoonnummer', adres: '0612345678', omschrijving: 'Mobiel', isStandaardAdres: false },
    ],
  },
  {
    bsn: '123456782',
    contactnaam: { voorletters: 'A.', voornaam: 'Anna', voorvoegselAchternaam: '', achternaam: 'Jansen' },
    adres: { straatnaam: 'Parkstraat', huisnummer: 42, postcode: '5678 CD', stad: 'Voorbeeld' },
    digitaleAdressen: [
      { soortDigitaalAdres: 'email', adres: 'anna@example.test', omschrijving: 'E-mail', isStandaardAdres: true },
      { soortDigitaalAdres: 'telefoonnummer', adres: '0687654321', omschrijving: 'Mobiel', isStandaardAdres: false },
    ],
  },
];

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS, ...options });
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

async function waitForApi() {
  for (let i = 0; i < 60; i++) {
    try {
      await api('/partijen');
      return;
    } catch {
      console.log('Open Klant nog niet bereikbaar, opnieuw proberen...');
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('Open Klant API niet bereikbaar');
}

async function upsertPartij(persona) {
  const partijBody = {
    // soortPartij moet mee, anders negeert Open Klant de partijIdentificatie
    soortPartij: 'persoon',
    partijIdentificatie: { contactnaam: persona.contactnaam },
    bezoekadres: persona.adres,
    correspondentieadres: persona.adres,
    indicatieActief: true,
    indicatieGeheimhouding: false,
    voorkeurstaal: 'nld',
  };

  const gevonden = await api(`/partijen?partijIdentificator__objectId=${persona.bsn}`);
  let partij = (gevonden.results || [])[0];

  if (partij) {
    await api(`/partijen/${partij.uuid}`, { method: 'PATCH', body: JSON.stringify(partijBody) });
    console.log(`Partij bijgewerkt (bsn ${persona.bsn}): ${persona.contactnaam.voornaam}`);
  } else {
    partij = await api('/partijen', {
      method: 'POST',
      body: JSON.stringify({
        ...partijBody,
        digitaleAdressen: [],
        voorkeursDigitaalAdres: null,
        vertegenwoordigden: [],
        rekeningnummers: [],
        voorkeursRekeningnummer: null,
      }),
    });
    await api('/partij-identificatoren', {
      method: 'POST',
      body: JSON.stringify({
        identificeerdePartij: { uuid: partij.uuid },
        partijIdentificator: {
          codeObjecttype: 'natuurlijk_persoon',
          codeSoortObjectId: 'bsn',
          objectId: persona.bsn,
          codeRegister: 'brp',
        },
      }),
    });
    console.log(`Partij aangemaakt (bsn ${persona.bsn}): ${persona.contactnaam.voornaam}`);
  }

  const bestaand = await api(`/digitaleadressen?verstrektDoorPartij__uuid=${partij.uuid}`);
  const bestaandeAdressen = new Set((bestaand.results || []).map((d) => d.adres));

  for (const da of persona.digitaleAdressen) {
    if (bestaandeAdressen.has(da.adres)) {
      console.log(`  Digitaal adres bestaat al: ${da.adres}`);
      continue;
    }
    await api('/digitaleadressen', {
      method: 'POST',
      body: JSON.stringify({
        ...da,
        verstrektDoorPartij: { uuid: partij.uuid },
        verstrektDoorBetrokkene: null,
      }),
    });
    console.log(`  Digitaal adres toegevoegd: ${da.soortDigitaalAdres} ${da.adres}`);
  }
}

async function main() {
  await waitForApi();
  for (const persona of PERSONAS) {
    await upsertPartij(persona);
  }
  console.log('Open Klant demo-data compleet.');
}

main().catch((err) => {
  console.error('Seeding Open Klant mislukt:', err.message);
  process.exit(1);
});
