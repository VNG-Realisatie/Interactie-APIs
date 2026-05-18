# Definition of Done — MijnTaken

Dit document beschrijft de functionele en technische specificaties van de **MijnTaken** service.
Het dient als “Definition of Done” voor implementatie en integratie van taken binnen een MijnOmgeving,
in lijn met de VNG MijnServices standaarden.

## Links

- API (interactief): [Open MijnTaken (Scalar)](/?url=/docs/bundled/apis_rest_taken_next.yaml)
- OpenAPI bron: [apis/rest/taken/next.yaml](/?file=apis/rest/taken/next.yaml)
- Gedeelde foutafhandeling (RFC 7807): [schemas/fout/v0.0.1.json](/?file=schemas/fout/v0.0.1.json)

## Inleiding

Voor veel gemeentelijke diensten ontstaat gedurende de dienstverlening “werk” voor de inwoner of ondernemer:
het aanleveren van bewijsstukken, het invullen van een formulier, het betalen van leges, of het uitvoeren van
een vervolgstap binnen een lopende context (bijv. een zaak).

**MijnTaken** is een service waarmee een MijnOmgeving taken kan tonen en een gebruiker kan begeleiden bij het
uitvoeren ervan — zonder dat de portaal-laag uitvoeringsdata hoeft op te slaan. Taken worden altijd **uitgevoerd
bij de provider**; het portaal kan, afhankelijk van taaktype, lokaal renderen of doorverwijzen.

## Uitgangspunten

- **Identiteit buiten scope van dit contract**: authenticatie/identificatie van de eindgebruiker verloopt via een
  externe IdP (bijv. DigiD/eHerkenning); de MijnTaken API beschrijft het **functionele contract** tussen portaal
  en provider.
- **Common Ground**: gegevens blijven bij de bron; het portaal is een weergave- en interactielaag, geen register.
- **Data-minimalisatie**: `POST /context/zoek` levert **samenvattingen**; detail wordt pas opgehaald vlak vóór uitvoering
  via `GET /taken/{uuid}`.
- **Extensibility / forward compatibility**: context is een kern met uitbreidingssets; het `include` mechanisme is
  een open lijst (unknown keys negeren).
- **Context via URN**: taken kunnen gekoppeld zijn aan een context (`context.urn`, optioneel `canonicalUrl`) zodat
  portalen context-navigatie kunnen bieden.
- **Privacy by design**: filtercriteria staan in request body (geen identificerende gegevens in querystring/URL-logs).

## Uitgangspunten voor “pilot / eerste implementaties”

- Portaal toont taken en kan (optioneel) lokale uitvoering aanbieden waar mogelijk.
- Taakuitvoering blijft bij provider; portaal houdt hooguit “returnUrl” (navigatiecontext) bij.
- Providers leveren minimaal een `uitvoering.canonicalUrl` als fallback.

## NL Design System

De presentatie en interactie in de MijnOmgeving volgt bij voorkeur de NL Design System richtlijnen.

## Use-cases

- **Takenoverzicht**: gebruiker opent MijnTaken; portaal haalt context op en toont takenlijst.
- **Taakdetail**: gebruiker kiest een taak; portaal haalt detail op vlak vóór uitvoering.
- **Taak uitvoeren**:
  - **Redirect** naar `uitvoering.canonicalUrl` (altijd mogelijk als fallback).
  - **Lokale uitvoering** (indien portaal type herkent en provider `uitvoering.definitie` levert): render + submit
    naar `definitie.endpoint`.

## Capabilities

| Capability | Toelichting |
|---|---|
| **Bieden van interactieve dienstverlening** | Portaal biedt een gepersonaliseerde ervaring op basis van ingelogde identiteit en context. |
| **Overzicht en inzage bieden van taken** | Portaal toont open/afgeronde taken met deadline/context en begeleidt uitvoering. |
| **Uitvoering bij de provider** | Provider is bronhouder van uitvoeringslogica en uitvoeringsdata; portaal faciliteert. |

## Bedrijfsobjectenmodel (conceptueel)

| Bedrijfsobject | Definitie |
|---|---|
| **TAAK** | Afgebakend stuk werk dat iemand moet/kan doen, vaak gekoppeld aan een context (zaak/product/dossier). |
| **CONTEXT** | Het onderwerp/anker waarbinnen taken bestaan (bijv. ZAAK, PRODUCT), geïdentificeerd met een URN. |
| **UITVOERING** | Informatie die bepaalt hoe een taak uitgevoerd wordt (type + canonicalUrl + optionele definitie). |

## Informatiearchitectuur (hoog niveau)

- **MijnOmgeving (portaal)**: presenteert taken, kiest tussen redirect of lokale uitvoering, beheert return-navigatie.
- **MijnTaken provider**: levert contextresultaat (samenvattingen), taakdetail en uitvoeringsinformatie.
- **Identity provider (IdP)**: levert geverifieerde identiteit aan portaal (buiten scope van dit contract).

## Standaarden

- Nederlandse API Strategie / REST design rules (repo-linting via Spectral)
- OAuth 2.0 / Bearer tokens (deployment-specifiek; contract beschrijft het functionele model)
- OpenAPI specificatie: zie [apis/rest/taken/next.yaml](/?file=apis/rest/taken/next.yaml)
- Foutafhandeling: RFC 7807 via [schemas/fout/v0.0.1.json](/?file=schemas/fout/v0.0.1.json)

## API’s & patronen

### POST als query (privacy + ergonomie)

Het portaal gebruikt **`POST /context/zoek`** als “query” zodat filtercriteria in de body zitten.
Dit voorkomt lekken van (mogelijk) identificerende gegevens via URL’s, querystrings, browserhistory en access logs.

### Context-zoek

- Endpoint: **`POST /context/zoek`**
- Belangrijkste input:
  - `klantId` (verplicht)
  - `contextId` (optioneel; URN)
  - `include` (optioneel; bijv. `["taken"]`)
- Output:
  - `ContextResultaat` met optioneel `taken[]` (samenvattingen)

### Twee-staps flow (lijst → detail)

1. **Zoek/overzicht**: `POST /context/zoek` (samenvattingen)
2. **Detail vlak vóór uitvoering**: `GET /taken/{uuid}` (volledige taak incl. type-specifieke uitvoeringsvelden)

### Uitvoering: lokaal vs redirect

- Redirectpad: portaal gebruikt `uitvoering.canonicalUrl` en voegt een `returnUrl` toe.
- Lokaal pad: portaal rendert op basis van `uitvoering.type` en `uitvoering.definitie` (indien aanwezig) en submit
  naar `definitie.endpoint`.

## BPMN user flows

Overzicht laden (context zoeken)

<div class="bpmn-embed" data-bpmn-title="MijnTaken — Overzicht laden (context zoeken)" data-bpmn-src="/bpmn/mijntaken-overzicht.bpmn"></div>

Taak uitvoeren (detail + lokaal vs redirect)

<div class="bpmn-embed" data-bpmn-title="MijnTaken — Taak uitvoeren (detail + lokaal vs redirect)" data-bpmn-src="/bpmn/mijntaken-uitvoeren.bpmn"></div>

Losse bestanden:

- [mijntaken-overzicht.bpmn](/?file=bpmn/mijntaken-overzicht.bpmn)
- [mijntaken-uitvoeren.bpmn](/?file=bpmn/mijntaken-uitvoeren.bpmn)

## Informatiebeveiliging en privacy (richtinggevend)

- **Doelbinding**: taken worden getoond/uitgevoerd voor dienstverlening; geen hergebruik voor andere doelen.
- **Dataminimalisatie**: lijstrespons bevat samenvattingen; detail alleen bij uitvoering.
- **Logging**: voorkom het loggen van request bodies met identificerende gegevens; log minimaal en doelgericht.
- **Vertrouwensrelatie**: portaal en provider moeten afspraken hebben over autorisatie, audit en misbruikpreventie
  (deployment/implementatieprofiel naast dit contract).

## Beheer

- **Eigenaarschap**: provider is bronhouder van taken en uitvoering; portaal beheert presentatie/UX.
- **Lifecycle**: taken kunnen ontstaan/verdwijnen op basis van bronprocessen; portaal hoort robuust om te gaan met
  ontbrekende/nieuwe velden (forward compatible).

