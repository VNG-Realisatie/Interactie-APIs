# Definition of Done — MijnProducten

Dit document beschrijft de use-cases, observaties en eerste denkrichtingen voor **MijnProducten**:
een service waarmee een MijnOmgeving producten (zoals vergunningen) van een inwoner of ondernemer
kan tonen en waar mogelijk laat gebruiken.

Vincent heeft gevraagd om deze pagina op te zetten als startpunt voor de DoD.

## Status

Verkennend — er is nog geen OpenAPI specificatie in deze repo. Deze pagina verzamelt user stories,
observaties en denkrichtingen die de basis vormen voor een eerste contract.

## Handige links

- [Prototype op Figma](https://www.figma.com/proto/O3Wzm9ANIRHQTK98X0ljYs/VNG-mijn-services-prototype?page-id=9401%3A2538&node-id=9405-52956&viewport=1136%2C1210%2C0.27&t=AkzLJair0XmU3TlD-8&scaling=scale-down-width&content-scaling=fixed&starting-point-node-id=9448%3A758053&hide-ui=1)
- [MijnProducten OAS (Maykin — Open Product)](https://redocly.github.io/redoc/?url=https://raw.githubusercontent.com/maykinmedia/open-product/master/src/producten-openapi.yaml)
- [ProductTypen OAS (Maykin — Open Product)](https://redocly.github.io/redoc/?url=https://raw.githubusercontent.com/maykinmedia/open-product/master/src/producttypen-openapi.yaml)
- [UPL productenlijst (Standaarden Overheid)](https://standaarden.overheid.nl/upl)
- [Logius — Samenwerkende Catalogi](https://www.logius.nl/onze-dienstverlening/interactie/samenwerkende-catalogi)
- [Omgevingswet — ZTC en PDC (Pleio)](https://samenwerken.pleio.nl/groups/view/814f7141-86c7-4fad-963d-497f5551f489/omgevingswet-ztc-en-pdc)

## Use-cases

Drie user stories vormen het uitgangspunt. Per story staat een BPMN-collaboration met dezelfde
drie lanes als bij [[mijntaken]]: **Gebruiker**, **MijnOmgeving (portaal)** en **MijnProducten provider**.

> De API-paden in de message flows (bijv. `POST /producten/zoek`) zijn _illustratief_ — er is nog
> geen vastgesteld contract. Ze laten zien hoe de interactie zou kunnen verlopen.

### 1. Parkeervergunning aanvragen

Een burger wil een parkeervergunning aanvragen vanuit de MijnOmgeving. Het portaal haalt de
ProductType-definitie op (JSON Schema) en kiest tussen lokale rendering of redirect naar de provider.

<div class="bpmn-embed" data-bpmn-title="MijnProducten — Parkeervergunning aanvragen" data-bpmn-src="/bpmn/mijnproducten-aanvragen.bpmn"></div>

### 2. Looptijd van een vergunning inzien

Een burger wil zien wanneer de vergunning voor een container verloopt. Het portaal toont een
overzicht op basis van vaste attributen (naam, start, eind) en haalt bij selectie het detail op
inclusief type-specifieke velden.

<div class="bpmn-embed" data-bpmn-title="MijnProducten — Vergunning inzien (verloopdatum)" data-bpmn-src="/bpmn/mijnproducten-inzien.bpmn"></div>

### 3. Bezoekersregeling gebruiken (VerbruiksObject)

Een burger wil _op de bezoekersregeling_ van de parkeervergunning. Dit is een **VerbruiksObject** —
vergelijkbaar met een strippenkaart: een product met een tegoed dat per gebruik wordt afgeschreven.
Het portaal toont het saldo en stuurt een transactie naar de provider.

<div class="bpmn-embed" data-bpmn-title="MijnProducten — Bezoekersregeling (VerbruiksObject)" data-bpmn-src="/bpmn/mijnproducten-verbruiken.bpmn"></div>

Losse BPMN-bestanden:

- [mijnproducten-aanvragen.bpmn](/?file=bpmn/mijnproducten-aanvragen.bpmn)
- [mijnproducten-inzien.bpmn](/?file=bpmn/mijnproducten-inzien.bpmn)
- [mijnproducten-verbruiken.bpmn](/?file=bpmn/mijnproducten-verbruiken.bpmn)

## Observaties

- **Vaste attributen**: producten hebben een aantal gedeelde attributen, zoals `naam`, `startDatum`
  en `eindDatum`. Deze zijn nodig om _elk_ product op een uniforme manier in een overzicht te tonen.
- **Variabele attributen**: daarnaast hebben producten attributen die per **ProductType** verschillen
  (bijv. kenteken bij parkeervergunning, locatie en afmetingen bij containervergunning, saldo bij
  een verbruiksobject). Om deze velden correct te labelen en weer te geven, moet het portaal het
  ProductType kunnen ophalen.

## Denkrichtingen

- **ProductType als JSON Schema**: de definitie van een ProductType (welke variabele attributen,
  met welke typen en labels) past goed in JSON Schema. Voordelen:
  - Standaard en breed ondersteund (validatie, codegeneratie, UI-generatie).
  - Portaal kan generieke renderers bouwen die elk ProductType kunnen tonen zonder hardcoded kennis.
  - Forward compatible: nieuwe ProductTypen vereisen geen wijziging in portaalcode.
- **Twee-staps flow (vergelijkbaar met [[mijntaken]])**: lijst toont samenvattingen op basis van
  vaste attributen; detail wordt opgehaald vlak vóór gebruik, inclusief ProductType voor rendering.
- **Aansluiten op bestaande catalogi**: UPL voor productnamen, Samenwerkende Catalogi voor
  producteninformatie, en de Omgevingswet PDC voor zaaktypen kunnen als bron of als afstemming dienen
  voor de ProductType-definities.
- **VerbruiksObject als variant**: een product met een tegoed en transacties. Verdient mogelijk een
  eigen sub-model (of een ProductType-uitbreiding) waarin saldo en verbruiksgeschiedenis passen.

## Open vragen

- Hoe verhoudt MijnProducten zich tot bestaande Maykin Open Product API’s? Overnemen, profileren,
  of een dunner contract bovenop?
- Waar leeft het canonieke ProductType-register (catalogus)? Per gemeente of landelijk gedeeld?
- Welke acties horen bij een product in het portaal (aanvragen, wijzigen, opzeggen, verbruiken)
  en welke daarvan zijn _lokaal renderbaar_ vs _redirect naar provider_? Vergelijk patroon uit
  [[mijntaken]].
- Hoe wordt identiteit gekoppeld (BSN/eHerkenning) — buiten scope van dit contract, maar relevant
  voor het filteren van producten per klant.
