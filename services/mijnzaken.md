# Service beschrijving — MijnZaken

Dit document beschrijft de functionele en technische richting van **MijnZaken**: het tonen van
persoonsgebonden zaakinformatie binnen een MijnOmgeving. Het dient als servicebeschrijving in
lijn met de VNG MijnServices standaarden, en is bedoeld voor publicatie op Developer.overheid.nl.

## Status

Verkennend — dit document beschrijft de **huidige stand van zaken** en de ontwerprichting.

Op dit moment wordt voor zaakinformatie in de MijnOmgeving de bestaande **ZGW API's 1.6**
gebruikt. Een dedicated **MijnZaken proces-API** is voorzien — afgeleid van ZGW 1.6, maar
toegespitst op de informatiebehoefte van de MijnOmgeving — en is nog niet ontwikkeld. Dit
document beschrijft beide: wat er nu is, en waar het naartoe gaat.

## Links

- ZGW API's 1.6 (huidige basis): [GEMMA Zaakgericht werken — standaard](https://vng-realisatie.github.io/gemma-zaken/standaard/)
- Gedeelde foutafhandeling (RFC 7807): [schemas/fout/v0.0.1.json](/?file=schemas/fout/v0.0.1.json)
- [Figma prototype](https://www.figma.com/proto/O3Wzm9ANIRHQTK98X0ljYs/VNG-mijn-services-prototype?node-id=9427-21196&starting-point-node-id=9448%3A758053)

## Inleiding

Een **zaak** is een lopend proces of dossier van een inwoner of ondernemer bij een organisatie:
een vergunningaanvraag, een bezwaar, een melding. Voor de eindgebruiker draait het om enkele
kernvragen: _welke zaken heb ik lopen, wat is de status, welke documenten horen erbij, en wat is
de volgende stap?_

**ZGW API's 1.6** is de bestaande systeem-standaard voor zaakgericht werken. Die API's zijn
ontworpen voor systeem-tot-systeem-integratie binnen het gemeentelijke landschap — registratie,
koppeling en beheer van zaken. Ze zijn niet specifiek ontworpen voor de informatiebehoefte van
een burgerportaal.

**MijnZaken** wordt een **proces-API**: een laag die zaakinformatie ontsluit zoals een
MijnOmgeving die nodig heeft. Het is geen vervanging van ZGW 1.6, maar een burger-gerichte
weergavelaag erbovenop. Voorlopig consumeert de MijnOmgeving ZGW 1.6 rechtstreeks; de dedicated
MijnZaken-API volgt later.

MijnZaken sluit nauw aan op [[mijntaken]]: een taak heeft vaak een zaak als context
(`context.urn`, bijv. `urn:nl:gemeenten:zaak:2026-00042`). MijnZaken levert die zaak-context.

## Uitgangspunten

### Ontwerpaspecten voor de MijnZaken proces-API

Drie aspecten zijn leidend bij het ontwerp van de toekomstige API:

- **Eenvoud van implementatie**. Voorkom dat leveranciers veel logica of boilerplate moeten
  schrijven. Het contract is dun en samengesteld: een portaal kan een scherm vullen met zo min
  mogelijk calls, en een leverancier kan een endpoint implementeren zonder complexe filter- of
  orkestratielogica.
- **Performance / efficiency**. Eindgebruikers moeten snel door de app kunnen navigeren. Het
  contract is daarop ingericht: samengestelde overzichts-responses, een twee-staps flow
  (lijst → detail) en caching-vriendelijke, idempotente leesoperaties.
- **Aansluiting bij andere patronen**. Hoe meer MijnZaken aansluit op de manier waarop andere
  MijnServices en apps werken, hoe eenvoudiger het is om erop aan te sluiten. Denk aan het
  context-/`include`-model van [[mijntaken]], RFC 7807-foutafhandeling en de Nederlandse API
  Strategie.

### Algemene uitgangspunten

- **Voorlopig ZGW 1.6**: zolang de proces-API er niet is, consumeert de MijnOmgeving ZGW 1.6
  rechtstreeks.
- **Common Ground**: gegevens blijven bij de bron; het portaal is een weergavelaag, geen register.
- **Identiteit buiten scope**: authenticatie/identificatie van de eindgebruiker verloopt via een
  externe IdP (DigiD/eHerkenning).
- **Inkijk-gericht**: MijnZaken richt zich op het _raadplegen_ van zaakinformatie. Mutaties
  (acties binnen een zaak) verlopen via [[mijntaken]] of bij de bron.

## Uitgangspunten voor "pilot / eerste implementaties"

- In de pilot wordt ZGW 1.6 gebruikt; de MijnZaken proces-API wordt parallel ontworpen op basis
  van de ervaringen uit die pilot.
- Het portaal toont minimaal: een zakenoverzicht en een zaakdetail met status en documenten.
- Leveranciers die al ZGW 1.6 aanbieden moeten met minimale inspanning kunnen aansluiten op de
  toekomstige MijnZaken-API.

## NL Design System

De presentatie en interactie in de MijnOmgeving volgt bij voorkeur de NL Design System richtlijnen.

## Use-cases

De volgende user stories vormen het uitgangspunt. Ze zijn _voorgesteld_ en worden in de
werkgroep aangescherpt; BPMN-flows volgen zodra de stories zijn vastgesteld.

### 1. Zakenoverzicht raadplegen

Een burger opent de MijnOmgeving en wil zien welke zaken hij heeft lopen. Het portaal toont een
overzicht met per zaak een titel, het zaaktype, de actuele status en de datum van de laatste
wijziging.

### 2. Zaakstatus en voortgang inzien

Een burger kiest een zaak en wil weten hoe ver die is: de actuele status, de doorlopen stappen
en — indien beschikbaar — de verwachte doorlooptijd of volgende stap.

### 3. Zaakdocumenten inzien

Een burger wil de documenten bij een zaak raadplegen: ingediende stukken, ontvangen brieven en
besluiten.

## Capabilities

| Capability | Toelichting |
|---|---|
| **Zakenoverzicht bieden** | Portaal toont de lopende en afgeronde zaken van de ingelogde gebruiker. |
| **Inzage in status en voortgang** | Portaal toont de actuele status, doorlopen stappen en (indien bekend) de volgende stap. |
| **Inzage in zaakdocumenten** | Portaal toont de documenten die bij een zaak horen. |
| **Context bieden voor taken** | Een zaak vormt de context waarbinnen taken ([[mijntaken]]) worden getoond en uitgevoerd. |

## Bedrijfsobjectenmodel (conceptueel)

| Bedrijfsobject | Definitie |
|---|---|
| **ZAAK** | Een lopend proces of dossier van een inwoner/ondernemer bij een organisatie. |
| **ZAAKTYPE** | De definitie van een soort zaak (doorlooptijd, fasen, verwachte documenten). |
| **STATUS** | De actuele fase van een zaak binnen het zaaktype. |
| **ZAAKDOCUMENT** | Een document dat bij een zaak hoort (ingediend stuk, brief, besluit). |
| **RESULTAAT** | De uitkomst van een afgeronde zaak. |

## Informatiearchitectuur (hoog niveau)

- **MijnOmgeving (portaal)**: presenteert zaken, status en documenten aan de eindgebruiker.
- **MijnZaken provider** _(toekomstig)_: levert zaakinformatie toegespitst op de MijnOmgeving.
  Tot die er is, consumeert het portaal ZGW 1.6 rechtstreeks.
- **ZGW-bron (zaaksysteem)**: het systeem waar zaken worden geregistreerd en beheerd, ontsloten
  via de ZGW API's 1.6.
- **Identity provider (IdP)**: levert geverifieerde identiteit aan het portaal (buiten scope van
  dit contract).

## Standaarden

- [ZGW API's 1.6](https://vng-realisatie.github.io/gemma-zaken/standaard/) — de systeem-standaard
  voor zaakgericht werken; huidige basis en uitgangspunt voor de MijnZaken proces-API
- Nederlandse API Strategie / REST API Design Rules (repo-linting via Spectral)
- OAuth 2.0 / Bearer tokens (deployment-specifiek)
- OpenAPI 3.1 (voor de toekomstige MijnZaken-API)
- Foutafhandeling: RFC 7807 via [schemas/fout/v0.0.1.json](/?file=schemas/fout/v0.0.1.json)
- Afstemming met [[mijntaken]] — gedeeld context-/`include`-model (een zaak als context-URN)

## API's & patronen

### Verhouding tot ZGW 1.6

ZGW 1.6 is een systeem-API: genormaliseerd, fijnmazig, ontworpen voor integratie. Een portaal
dat ZGW 1.6 rechtstreeks consumeert moet relatief veel calls orkestreren (zaken, statussen,
documenten, zaaktypen apart) en zelf samenstellen. De MijnZaken proces-API wil dat wegnemen.

### Samengestelde responses (eenvoud + performance)

Het patroon: één endpoint levert een **samengestelde** response die een scherm direct kan vullen
— bijvoorbeeld een zaakdetail inclusief status, zaaktype-labels en documentverwijzingen. Dit
beperkt het aantal calls (performance) en de orkestratielogica bij portaal én leverancier
(eenvoud).

### Twee-staps flow (lijst → detail)

1. **Overzicht**: een lijst van zaaksamenvattingen voor het zakenoverzicht.
2. **Detail**: het volledige zaakbeeld, opgehaald bij het openen van één zaak.

### Aansluiting op MijnTaken

MijnZaken volgt waar mogelijk de patronen van [[mijntaken]]: `POST .../zoek` als query (privacy),
het `include`-mechanisme voor uitbreidbare samengestelde responses, en de URN als
portaal-agnostische identifier voor een zaak.

## Informatiebeveiliging en privacy (richtinggevend)

- **Doelbinding**: zaakinformatie wordt getoond voor dienstverlening aan de gebruiker zelf; geen
  hergebruik voor andere doelen.
- **Dataminimalisatie**: het overzicht bevat samenvattingen; detailgegevens volgen pas bij het
  openen van één zaak.
- **Geen identificerende gegevens in URL's**: het opvragen van zaken van een klant gaat via een
  request body, niet via querystrings.
- **Logging**: voorkom het loggen van request bodies met identificerende gegevens; log minimaal
  en doelgericht.

## Beheer

- **Eigenaarschap**: de bron (zaaksysteem) is bronhouder van zaken; het portaal beheert
  presentatie en UX. De MijnZaken-API wordt door VNG Realisatie beheerd.
- **Lifecycle**: zaken ontstaan, doorlopen statussen en worden afgerond op basis van
  bronprocessen; het portaal hoort robuust om te gaan met ontbrekende of nieuwe velden.

## Openstaande punten

- Welke informatie uit ZGW 1.6 is nodig voor de MijnOmgeving, en welke niet? Dit bepaalt de
  scope van de proces-API.
- Wordt MijnZaken een profiel op ZGW 1.6, een samenstellende laag ervoor, of een zelfstandig
  contract dat erop mapt?
- Hoe verhoudt het zakenoverzicht zich tot het context-model van [[mijntaken]] — één gedeeld
  `/context/zoek`-endpoint of aparte endpoints?
- Hoe wordt de verwachte doorlooptijd / volgende stap bepaald — uit het zaaktype, of per zaak?
- Hoe wordt identiteit gekoppeld (BSN/eHerkenning) voor het filteren van zaken per klant?
