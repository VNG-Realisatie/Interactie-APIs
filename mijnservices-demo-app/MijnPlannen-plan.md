# MijnPlannen — Plan & voortgang

Feature voor de MijnServices demo app, gericht op de hackathon-challenge
**OneGov #2 — "Inwoner Centraal: Nabestaanden"** (ICTU, 4–5 juni 2026).

Doel uit de brief: help de **officiële partner** van een overledene snel **grip en een volledig
beeld** te krijgen van **rechten én verplichtingen** bij de overheid, via een **proactieve,
gepersonaliseerde** aanpak waarbij de overheid zoveel mogelijk zelf voorsorteert.

- Challenge-data & bronnen: https://github.com/govtechnl/onegov2-inwoner-centraal
- Brief: `OneGov#2_Challenge_Brief_Inwoner_Centraal_Nabestaanden_ICTU_def.docx` (Downloads)
- Persona's: Truus (62, partner Cees), Marcus (48, geen toegang dossiers), Anneke (71, laag
  digivaardig), ondernemer-nabestaande (optioneel: KVK/btw).

---

## 0. Onze focus & scope

**Kernidee:** de **correspondentiestroom** is ons vertrekpunt. Elke brief die een overheids-
organisatie stuurt is in principe een **taak**, die kan leiden tot een **zaak-aanvraag**.
Wij bouwen het deel dat van die losse brievenstroom **één samenhangend, voorspelbaar
takenoverzicht** maakt voor de nabestaande.

```
Brief (correspondentiestroom)  →  Taak (MijnTaken)  →  [Zaak-aanvraag]  →  Afhandeling
└─────────────── ONZE SCOPE ───────────────┘                          └── andere teams ──┘
```

**Wel voor ons (in scope):**
- Correspondentiestroom-data inlezen en normaliseren naar taken (afzender, type, timing, actie j/n).
- Eén overzicht per organisatie, met **voorspelbaarheid** (wat komt er nog, wanneer) en prioriteit.
- Per taak een **handoff** naar waar de afhandeling gebeurt (`uitvoering.canonicalUrl` — wallet/portaal/loket).
- Status tonen (open / actie nodig / automatisch geregeld / afgerond) — als spiegel van de bron.

**Niet voor ons (uit scope — andere teams):**
- De daadwerkelijke **afhandeling**: data ophalen, invullen, indienen, oplossen via Wallet of loket.
- Het bouwen van de onderliggende zaak-/uitvoeringssystemen per organisatie.

> Dit sluit naadloos aan op het MijnTaken-contract: het portaal **toont** taken en **verwijst**
> naar uitvoering bij de provider; muteren/afhandelen gebeurt buiten het portaal.

---

## 1. Concrete wensen vanuit de challenge-brief

Afgeleid uit de brief. Tag: 🔴 Moet · 🟡 Zou moeten · 🔵 Kan/bonus.

### Inhoud & informatie
- **W1** 🔴 Eén overzicht van wat er openstaat, samengesteld uit **meerdere organisaties** (≥2),
  met data **bij de bron**.
- **W2** 🔴 Toon zowel **verplichtingen** (BSN overledene) als **rechten** (BSN nabestaande):
  ANW-uitkering, nabestaandenpensioen, toeslagherberekening, recht op bijstand/inkomensondersteuning.
- **W3** 🔴 Maak onderscheid in **informeren / toegang geven / handelen namens** de overledene.
- **W4** 🟡 Laat zien **wat automatisch al geregeld is** (bv. stopzetten toeslagen) — geruststelling.
- **W5** 🟡 Per item duidelijk: **actie nodig (ja/nee) en wie die actie doet** (overheid vs nabestaande).
  Onderscheid brief-types: informatiebrief / actiebrief / factuur / aanmaning.
- **W6** 🟡 **Voorspelbaarheid**: wat komt er nog aan en **wanneer** (tijdlijn van verwachte
  brieven/handelingen per organisatie, incl. wettelijke termijnen).
- **W7** 🟡 **Volledigheid** nuanceren: niet alles is te overzien op moment van overlijden
  (bv. erfbelasting komt later).

### Interactie & regie
- **W8** 🟡 Mogelijkheid om te **corrigeren of uitstel te vragen** van verplichtingen.
- **W9** 🟡 Manier om te **reageren** op openstaande punten; één plek voor vragen.
- **W10** 🟡 **Transparantie**: op welke basis/bron een item of beslissing is gebaseerd.
- **W11** 🔴 **Stappenplan** met volgordelijkheid en samenhang (roadmap), incl. voortgang/notificatie.

### Doelgroep & toon
- **W12** 🟡 Rekening houden met **laag digitaal doenvermogen / taalvaardigheid**: heldere taal,
  rustige toon, duidelijke prioriteit, niet overweldigen.
- **W13** 🔴 Ontworpen voor de **partner** van de overledene (persona Truus/Cees), persoonlijke aanhef.

### Techniek & aansluiting
- **W14** 🔴 Werkt aantoonbaar met de **aangeleverde (synthetische) data** of een eigen variant.
- **W15** 🔵 Aansluiten op/bekend bij **MijnOverheid, Berichtenbox, MijnServices, Wallet**,
  NL Design System, Common Ground, NL API Strategie.
- **W16** 🔵 **Modulair/schaalbaar** naar andere levensgebeurtenissen (scheiding, pensionering).
- **W17** 🔵 Optioneel: **ondernemer-nabestaande** (KVK beëindigen, btw-aangifte, RVO-subsidie).

---

## 2. Actieplan (features + voortgang)

### Reeds gebouwd (basis)
- [x] MijnPlannen-pagina + route `#plannen` + navigatie-item
- [x] Takenlijst **gegroepeerd per organisatie** (W1)
- [x] **Filter op organisatie** (dropdown) + **sorteren op urgentie**
- [x] **Afvinken** met voortgangsbalk (localStorage in statisch, `PATCH` in API-modus)
- [x] Hergebruik van het bestaande **`task-list-row`-component** (consistent met "Mijn taken")
- [x] Data gemodelleerd op **MijnTaken `TaakSamenvatting`** (`apis/rest/taken/next.yaml`)
- [x] **Stateful demo-server** (MijnTaken-lezen + demo-mutaties), combined app+API op één URL
- [x] **Tunnel** getest: meerdere gebruikers kunnen lezen/schrijven (W14, deels)
- [x] **Demo-seed als gedeeld bestand** `data/taken-seed.mjs` (app + server delen één bron)
- [x] **Read-only**: geen afvink-checkboxes meer (afronden gebeurt bij de afhandelaar, niet in het portaal)
- [x] **Briefdetailpagina** (`#plannen/<id>`): afzender, aanhef, gericht-aan, bezorgadres, wat er gevraagd
      wordt + handoff-knop. Signaleert de adresserings-pijnpunten ('de erven' / verzorgingstehuis-adres).
- [x] **Naam:** tab heet nu **"Nabestaande dossier"** (route blijft `#plannen`).
- [x] **Twee secties** "Nog te doen" / "Geen actie nodig" (automatisch geregeld + afgerond + ter info),
      gedempt gestyled; elke rij in de tweede sectie heeft een badge (✓ Geregeld / ✓ Afgerond / Ter info)
      zodat de status consistent is. Geen toggle-suggererende checkbox.
- [x] **Default sortering = urgentie**; in die platte weergave staat de organisatie klein onder de titel.
- [x] **Unificatie:** open acties uit het dossier verschijnen ook in **"Mijn taken"** en op de **home**.
- [x] **Live updates (SSE):** `GET /events` pusht naar alle clients — bij taakmutaties ververst ieders
      lijst vanzelf; bij code-wijziging (app.js/styles.css/index.html) herladen alle tabs (dev-live-reload).
- [x] **JSON-persistentie:** live state wordt weggeschreven naar `backend/taken-state.json` (gitignored)
      en bij opstart ingeladen → overleeft een serverherstart. Reset = bestand verwijderen.
- [x] **Versimpeld:** "Sorteren"- en "Organisatie"-filters verwijderd (altijd platte urgentie-lijst);
      "Vernieuwen"-knop weg (auto-refresh via SSE). Ongebruikte grouping-code + CSS opgeruimd.
- [x] **Mijn berichten:** de correspondentiestroom uit het dossier verschijnt ook hier (afzender ·
      onderwerp · ontvangen, nieuwste eerst). Actie-brieven = "ongelezen" (vet + stip); klik = briefdetail.
      Sidebar-badge toont het aantal actie-brieven.

### Te doen — kern (correspondentiestroom → taken)
- [x] **Datamodel `brief → taak`**: brief-type (informatiebrief/actiebrief/factuur/aanmaning),
      ontvangstdatum, actie-nodig, automatisch-geregeld, soort (recht/verplichting), leidtTotZaak
- [x] **W1** **12 organisaties** gedefinieerd (Gemeente, Belastingdienst, Toeslagen, SVB, CAK, UWV,
      RDW, Waterschap, CJIB, DUO, RVO, KVK); seed dekt er nu 10 (RVO/KVK = ondernemer-bonus)
- [x] **W4+W5** Statusonderscheid **Automatisch geregeld / Actie nodig / Te betalen / Urgent / Ter info**
      (badge + ✓/checkbox links); progress telt alleen acties + "X automatisch geregeld"
- [x] **Handoff per taak**: `uitvoering.canonicalUrl` → naar wáár de afhandeling gebeurt (handoff-pijl)
- [x] **W14** **Officiële synthetische dataset** geladen: golden fixture Truus/Cees uit
      github.com/govtechnl/onegov2-inwoner-centraal (laag correspondentie, 10 brieven). Bron vendored in
      `data/onegov2-truus-cees.json`; converter `data/build-seed.mjs` genereert `data/taken-seed.mjs`
      (casus verschoven zodat deadlines actueel zijn). Tijdlijn-laag nog niet gebruikt (zie W6).
- [ ] **W6** Voorspelbaarheid: aparte weergave **"Wat komt er nog aan"** (tijdlijn per organisatie)
      — _nu: ontvangstdatum + deadline per item; nog géén losse tijdlijn-/komende-brieven-weergave_

### Te doen — verrijking
- [x] **W13** Gepersonaliseerd naar de partner (Cees), intro herkaderd naar grip + geruststelling
- [x] **W12** Plain-language statusbadges + "moet ik iets doen?" meteen zichtbaar (basis gelegd)
- [x] **W2** Rechten als correspondentie in het datamodel (`soort: recht`), bijv. SVB/Anw
- [ ] **W11** Stappenplan/volgordelijkheid (roadmap): samenhang `brief → taak → zaak`
- [ ] **W10** Transparantie: bron/onderbouwing per taak tonen
- [ ] **W3** Onderscheid **informeren / toegang / handelen** expliciet zichtbaar maken

### Buiten onze scope (andere teams)
- ~~Afhandelen van taken: data ophalen, invullen, indienen, oplossen via Wallet/loket~~
- ~~Onderliggende zaak- en uitvoeringssystemen per organisatie~~
- **W8/W9** "Uitstel vragen" / "Corrigeren" / "Vraag stellen": hooguit als **handoff-knop** in onze UI,
  niet de daadwerkelijke afhandeling

### Bonus (optioneel)
- [ ] **W17** Ondernemer-nabestaande uitbreiding (KVK/btw/RVO)
- [ ] **W16** Modulariteit aanstippen (herbruikbaar voor andere levensgebeurtenissen)
- [ ] **W15** Expliciete aansluiting Berichtenbox/MijnOverheid/Wallet benoemen in de demo

---

## 3. Besluiten
- ✅ **Focus = correspondentiestroom → taken** (overzicht + voorspelbaarheid). Afhandeling is uit scope.

### Nog te besluiten met Joep
- Eerst de **officiële dataset** inlezen (brievenstroom + tijdlijn), of eerst het **datamodel/UX**
  (`brief → taak`, brief-type, status) neerzetten met eigen data?
- Eén scherp persona (Truus) als verhaallijn, of generiek?
- Tonen we de **zaak-aanvraag** expliciet als tussenstap (`brief → taak → zaak`), of houden we het op taken?
