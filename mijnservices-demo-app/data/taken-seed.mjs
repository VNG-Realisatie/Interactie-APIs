// GEGENEREERD door data/build-seed.mjs — niet handmatig bewerken.
// Bron: officiële OneGov #2 synthetische dataset, golden fixture Truus/Cees
// (github.com/govtechnl/onegov2-inwoner-centraal, laag "correspondentie").
// Casus verschoven met 426 dagen zodat het overlijden ~3 weken geleden valt.
// Elke brief uit de correspondentiestroom is hier een taak.

export const takenSeed = [
  {
    "uuid": "urn:brief:test:00000000-0000-4000-8000-000000000030",
    "organisatie": "rdw",
    "soort": "verplichting",
    "briefType": "informatiebrief",
    "briefCode": "RDW.S-0068",
    "ontvangen": "2026-05-22",
    "titel": {
      "nl": "Voertuig op naam van Cees — informatie"
    },
    "toelichting": {
      "nl": "Informatiebrief van RDW."
    },
    "aanhef": "Beste erven van Cees de Vries",
    "geadresseerde": "erven",
    "adres": {
      "straat": "Zorgcentrum De Wilg",
      "huisnummer": "1",
      "postcode": "3511 AB",
      "woonplaats": "Utrecht",
      "verzorgingstehuis": true
    },
    "actieNodig": false,
    "automatisch": false,
    "status": "open",
    "deadline": "",
    "leidtTotZaak": null,
    "uitvoering": {
      "canonicalUrl": "https://www.rdw.nl/particulier/voertuigen/auto/overlijden"
    }
  },
  {
    "uuid": "urn:brief:test:00000000-0000-4000-8000-000000000031",
    "organisatie": "svb",
    "soort": "verplichting",
    "briefType": "informatiebrief",
    "briefCode": "SVB.OVERLIJDENSUITKERING",
    "ontvangen": "2026-05-22",
    "titel": {
      "nl": "Overlijdensuitkering AOW"
    },
    "toelichting": {
      "nl": "Informatiebrief van SVB."
    },
    "aanhef": "Geachte mevrouw Truus de Vries-Bakker",
    "geadresseerde": "partner",
    "adres": {
      "straat": "Hoofdstraat",
      "huisnummer": "42",
      "postcode": "3512 CD",
      "woonplaats": "Utrecht",
      "verzorgingstehuis": false
    },
    "actieNodig": false,
    "automatisch": false,
    "status": "open",
    "deadline": "",
    "leidtTotZaak": null,
    "uitvoering": {
      "canonicalUrl": "https://www.svb.nl/nl/overlijden"
    }
  },
  {
    "uuid": "urn:brief:test:00000000-0000-4000-8000-000000000032",
    "organisatie": "cak",
    "soort": "verplichting",
    "briefType": "informatiebrief",
    "briefCode": "CAK.WLZ-CONDOLEANCE",
    "ontvangen": "2026-05-20",
    "titel": {
      "nl": "Condoleancebericht van het CAK"
    },
    "toelichting": {
      "nl": "Condoleancebrief van CAK."
    },
    "aanhef": "Aan de erven van meneer Cees de Vries",
    "geadresseerde": "erven",
    "adres": {
      "straat": "Zorgcentrum De Wilg",
      "huisnummer": "1",
      "postcode": "3511 AB",
      "woonplaats": "Utrecht",
      "verzorgingstehuis": true
    },
    "actieNodig": false,
    "automatisch": false,
    "status": "open",
    "deadline": "",
    "leidtTotZaak": null,
    "uitvoering": {
      "canonicalUrl": "https://www.hetcak.nl/"
    }
  },
  {
    "uuid": "urn:brief:test:00000000-0000-4000-8000-000000000033",
    "organisatie": "cak",
    "soort": "verplichting",
    "briefType": "factuur",
    "briefCode": "CAK.WLZ-FACTUUR",
    "ontvangen": "2026-06-10",
    "titel": {
      "nl": "Eindafrekening eigen bijdrage Wlz betalen"
    },
    "toelichting": {
      "nl": "Factuur betalen"
    },
    "aanhef": "Mevrouw Truus de Vries-Bakker inzake meneer Cees de Vries",
    "geadresseerde": "contactpersoon",
    "adres": {
      "straat": "Hoofdstraat",
      "huisnummer": "42",
      "postcode": "3512 CD",
      "woonplaats": "Utrecht",
      "verzorgingstehuis": false
    },
    "actieNodig": true,
    "automatisch": false,
    "status": "open",
    "deadline": "2026-07-10T23:59:59+01:00",
    "leidtTotZaak": "Factuur betalen",
    "uitvoering": {
      "canonicalUrl": "https://www.hetcak.nl/"
    }
  },
  {
    "uuid": "urn:brief:test:00000000-0000-4000-8000-000000000034",
    "organisatie": "toeslagen",
    "soort": "verplichting",
    "briefType": "informatiebrief",
    "briefCode": "TOESLAGEN.HERZIENE-BESCHIKKING-ZORG",
    "ontvangen": "2026-05-29",
    "titel": {
      "nl": "Zorgtoeslag herzien (beschikking)"
    },
    "toelichting": {
      "nl": "Beschikking van Toeslagen."
    },
    "aanhef": "Aan de erven van",
    "geadresseerde": "erven",
    "adres": {
      "straat": "Zorgcentrum De Wilg",
      "huisnummer": "1",
      "postcode": "3511 AB",
      "woonplaats": "Utrecht",
      "verzorgingstehuis": true
    },
    "actieNodig": false,
    "automatisch": true,
    "status": "open",
    "deadline": "",
    "leidtTotZaak": null,
    "uitvoering": {
      "canonicalUrl": "https://www.toeslagen.nl/"
    }
  },
  {
    "uuid": "urn:brief:test:00000000-0000-4000-8000-000000000035",
    "organisatie": "toeslagen",
    "soort": "verplichting",
    "briefType": "aanmaning",
    "briefCode": "TOESLAGEN.TERUGVORDERING-ZORG",
    "ontvangen": "2026-06-05",
    "titel": {
      "nl": "Terugvordering zorgtoeslag — betalen of bezwaar"
    },
    "toelichting": {
      "nl": "Bedrag terugbetalen of bezwaar maken"
    },
    "aanhef": "Aan de erven van",
    "geadresseerde": "erven",
    "adres": {
      "straat": "Zorgcentrum De Wilg",
      "huisnummer": "1",
      "postcode": "3511 AB",
      "woonplaats": "Utrecht",
      "verzorgingstehuis": true
    },
    "actieNodig": true,
    "automatisch": false,
    "status": "open",
    "deadline": "2026-07-17T23:59:59+01:00",
    "leidtTotZaak": "Bedrag terugbetalen of bezwaar maken",
    "uitvoering": {
      "canonicalUrl": "https://www.toeslagen.nl/"
    }
  },
  {
    "uuid": "urn:brief:test:00000000-0000-4000-8000-000000000036",
    "organisatie": "belastingdienst",
    "soort": "verplichting",
    "briefType": "actiebrief",
    "briefCode": "BD.ERVENBRIEF",
    "ontvangen": "2026-06-01",
    "titel": {
      "nl": "Contactpersoon doorgeven aan de Belastingdienst"
    },
    "toelichting": {
      "nl": "Contactpersoon doorgeven aan Belastingdienst"
    },
    "aanhef": "Aan de erven van",
    "geadresseerde": "erven",
    "adres": {
      "straat": "Zorgcentrum De Wilg",
      "huisnummer": "1",
      "postcode": "3511 AB",
      "woonplaats": "Utrecht",
      "verzorgingstehuis": true
    },
    "actieNodig": true,
    "automatisch": false,
    "status": "open",
    "deadline": "2026-07-01T23:59:59+01:00",
    "leidtTotZaak": "Contactpersoon doorgeven aan Belastingdienst",
    "uitvoering": {
      "canonicalUrl": "https://www.belastingdienst.nl/overlijden"
    }
  },
  {
    "uuid": "urn:brief:test:00000000-0000-4000-8000-000000000037",
    "organisatie": "belastingdienst",
    "soort": "verplichting",
    "briefType": "actiebrief",
    "briefCode": "BD.AANGIFTE-ERFBELASTING",
    "ontvangen": "2026-08-30",
    "titel": {
      "nl": "Aangifte erfbelasting indienen"
    },
    "toelichting": {
      "nl": "Aangifte erfbelasting binnen 8 maanden indienen"
    },
    "aanhef": "Aan de erven van",
    "geadresseerde": "erven",
    "adres": {
      "straat": "Hoofdstraat",
      "huisnummer": "42",
      "postcode": "3512 CD",
      "woonplaats": "Utrecht",
      "verzorgingstehuis": false
    },
    "actieNodig": true,
    "automatisch": false,
    "status": "open",
    "deadline": "2027-04-27T23:59:59+01:00",
    "leidtTotZaak": "Aangifte erfbelasting binnen 8 maanden indienen",
    "uitvoering": {
      "canonicalUrl": "https://www.belastingdienst.nl/overlijden"
    }
  },
  {
    "uuid": "urn:brief:test:00000000-0000-4000-8000-000000000038",
    "organisatie": "gemeente",
    "soort": "verplichting",
    "briefType": "informatiebrief",
    "briefCode": "GEMEENTE.CONDOLEANCE",
    "ontvangen": "2026-05-19",
    "titel": {
      "nl": "Condoleancebericht van de gemeente"
    },
    "toelichting": {
      "nl": "Condoleancebrief van Gemeente."
    },
    "aanhef": "Geachte mevrouw Truus de Vries-Bakker",
    "geadresseerde": "partner",
    "adres": {
      "straat": "Hoofdstraat",
      "huisnummer": "42",
      "postcode": "3512 CD",
      "woonplaats": "Utrecht",
      "verzorgingstehuis": false
    },
    "actieNodig": false,
    "automatisch": false,
    "status": "open",
    "deadline": "",
    "leidtTotZaak": null,
    "uitvoering": {
      "canonicalUrl": "https://www.rijksoverheid.nl/onderwerpen/overlijden"
    }
  },
  {
    "uuid": "urn:brief:test:00000000-0000-4000-8000-000000000039",
    "organisatie": "waterschap",
    "soort": "verplichting",
    "briefType": "factuur",
    "briefCode": "WS.AANSLAG",
    "ontvangen": "2026-06-25",
    "titel": {
      "nl": "Aanslag waterschapsbelasting betalen"
    },
    "toelichting": {
      "nl": "Aanslag betalen — als erfgenaam aansprakelijk"
    },
    "aanhef": "Aan Cees de Vries",
    "geadresseerde": "overledene",
    "adres": {
      "straat": "Zorgcentrum De Wilg",
      "huisnummer": "1",
      "postcode": "3511 AB",
      "woonplaats": "Utrecht",
      "verzorgingstehuis": true
    },
    "actieNodig": true,
    "automatisch": false,
    "status": "open",
    "deadline": "2026-08-06T23:59:59+01:00",
    "leidtTotZaak": "Aanslag betalen — als erfgenaam aansprakelijk",
    "uitvoering": {
      "canonicalUrl": "https://www.belastingsamenwerking.nl/"
    }
  }
];
