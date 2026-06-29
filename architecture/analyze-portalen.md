**Analyse: hoe bestaande burgerportalen werken**

_Joep Meindertsma, 25 juni 2026 — achtergronddocument bij [referentie-architectuur.md](./referentie-architectuur.md) en [generieke-api-strategie.md](./generieke-api-strategie.md)_

# Waarom dit document

Wie een burgerportaal ("MijnOmgeving", "Mijn Gemeente") bouwt binnen het Nederlandse gemeentelijke API-ecosysteem (VNG / Common Ground / Haal Centraal / Zaakgericht Werken) moet veel van de losse API's bij elkaar brengen. Voordat we beslissen wát VNGR daarin zou moeten leveren — een SDK, een type-pakket, een gedeelde aggregatielaag — moeten we eerst feitelijk vaststellen **hoe de bestaande portalen werken, welke stack ze draaien, en waar de complexiteit zit**.

Dit document is een momentopname (juni 2026) van drie portalen plus één aggregatielaag waarvoor primair, verifieerbaar bewijs beschikbaar is:

- **NL Portal** — open source, React-frontend + Kotlin BFF (Dimpact / Gemeente Den Haag-ecosysteem, gebouwd op Valtimo/GZAC)
- **Open Inwoner Platform** — open source, Python/Django server-rendered (Maykin Media)
- **iBurgerzaken / Mijn Loket** — proprietary, Angular + Java/Spring Boot (PinkRoccade Local Government)
- **IKO (Integraal Klant- en Objectbeeld)** — open source, Kotlin/Spring + Apache Camel (Ritense). Géén portaal maar de **server-side aggregatielaag** eronder; opgenomen omdat die precies het ontbrekende stuk in het kernpatroon vormt.

Versienummers en byte-tellingen zijn momentopnames; ze verschuiven. De *architectuurpatronen* eronder zijn stabieler en vormen de kern van deze analyse.

# Het kernpatroon: niemand consumeert de REST-API's in de browser

De belangrijkste bevinding overstijgt de individuele portalen. **Geen van de onderzochte producten consumeert de gemeentelijke ZGW-REST-API's (Zaken, Klantinteracties/OpenKlant, Producten, Taken, Documenten) direct vanuit de browser.** Alle drie zetten er bewust een **server-side laag** tussen:

| Portaal | Front-end | API-consumptie gebeurt in… | Koppeling front↔back |
|---|---|---|---|
| iBurgerzaken (PinkRoccade) | Angular / TypeScript | Java / Spring Boot backend | eigen backend-API |
| NL Portal | React 19 / TypeScript | Kotlin BFF (Valtimo) | **GraphQL** (Apollo) |
| Open Inwoner | Django SSR + Preact-eilandjes | Python (`zgw-consumers`) | server-rendered HTML + HTMX |

Dat is geen toeval. De ZGW-API's zijn talrijk, granulair en versiegevoelig; identiteit (DigiD/eHerkenning), machtigingen, aggregatie over bronnen en compliance-eisen horen niet thuis in een browser-bundle. Elke serieuze bouwer komt onafhankelijk tot dezelfde conclusie: **de REST-consumptie verhuist naar een server-side laag, en de front-end praat met een vereenvoudigd, op de UI toegesneden contract** (GraphQL, een eigen backend-API, of server-rendered HTML).

De consequentie voor de front-end is dat die relatief **dun** is: presentatie, routing, formulieren-rendering, i18n. De moeilijke logica zit in de laag eronder.

# Portaal 1 — NL Portal (React + Kotlin BFF)

NL Portal is gesplitst in twee repositories: een React-frontend en een Kotlin-backend. Dat is meteen de belangrijkste observatie — het zwaartepunt ligt in de tweede.

## Front-end (`nl-portal-frontend-libraries`)

- **React 19 + TypeScript** (≈96% TS), monorepo met Lerna + pnpm workspaces, gebouwd met Vite, gedistribueerd als `@nl-portal/*` npm-packages. Licentie EUPL-1.2 (© Ritense BV).
- Data-laag: **Apollo Client 4** tegen één **GraphQL-endpoint**. De front-end kent geen REST-clients naar Zaken/OpenKlant.
- Type-generatie: **GraphQL Code Generator** (`graphql-codegen`) genereert getypeerde hooks (`useGetZakenQuery`) uit het GraphQL-schema. Dit is géén OpenAPI-gebaseerde generatie — de codegen-bron is `…/graphql`, niet `/openapi.json`.
- UI: NL Design System via `@gemeente-denhaag/*` + `@utrecht/*`; formulieren via Form.io (`@formio/js`, `@formio/react`) met ~15 custom templates die velden naar NLDS herschilderen.
- Authenticatie: een dunne wrapper (~12 KB) rond `react-oidc-context` / `oidc-client-ts` (Keycloak-stijl). DigiD/eHerkenning zitten **niet** in deze code — dat zijn identity-brokers, geconfigureerd bij de OIDC-provider.
- Geen client-side full-text search-library aangetroffen.

Netto, na aftrek van de ~183 KB gegenereerde GraphQL-types en de i18n-stringtabellen, is de handgeschreven applicatielogica in de orde van **~350–400 KB TypeScript**: een nette middelgrote SPA, geen kolos. Machtigingen/vertegenwoordiging zijn in de front-end letterlijk één GraphQL-query (`getGemachtigdeV2`); de echte logica zit achter de gateway.

_Versies en byte-tellingen in deze sectie geverifieerd: juni 2026._

## Backend / BFF (`nl-portal-backend-libraries`)

- **Kotlin (≈99,9%)** op Spring Boot 3.5.9 / Java 21 — ongeveer **1,5 MB broncode**, ~2,5× de front-end.
- Het is expliciet een **Backend-for-Frontend (BFF)**: het aggregeert de gemeentelijke ZGW-REST-API's en ontsluit ze via één **GraphQL-gateway** aan de front-end.
- Domeinmodules: `case`, `zgw` (Open Zaak / Objects API / Objecttypen), `form`, `messaging`, `payment` (+ `payment-direct`), `product`, `haalcentraal2` + `haalcentraal-hr` (BRP/HR), `openklant`, `documenten`, `portal-authentication`, `graphql`.
- Gebouwd op **Valtimo/GZAC**, het low-code zaakgericht-werken-platform van Ritense (bevestigd via codereferenties). De org levert ook `nl-portal-backend-template`, een configuration-panel, Helm-charts en docker-compose — een compleet inzetbaar product, niet alleen een bibliotheek.

**Waar de complexiteit zit:** vrijwel volledig in de Kotlin-BFF. Zaakgericht werken (ZGW-orchestratie), BRP/HR-integratie (Haal Centraal), de forms-task-lifecycle, messaging, payments en de autorisatie/machtigingen-logica leven hier. De React-front-end is een competente maar grotendeels happy-path-presentatielaag.

# Portaal 2 — Open Inwoner Platform (Django, server-side)

Open Inwoner is architectonisch het tegenovergestelde van NL Portal: geen SPA met een aparte BFF, maar één **server-rendered Python/Django-applicatie** waarin de hele logica zit.

- **Django 5.2 / Python 3.13**, ≈80,6% Python. Front-end is ~6% HTML, ~5% TS, ~4,5% SCSS, ~2,5% JS. Licentie EUPL.
- De browser-laag is **Django-templates met progressive enhancement**: **Preact** web-components (TypeScript, Vite-build, Storybook) + **HTMX** voor server-rendered partials. Géén React/Angular/Vue als SPA-framework. NLDS via `@gemeente-denhaag/*` en `@utrecht/*` (NL Design System candidate).
- **API-consumptie is volledig server-side in Python**, via `zgw-consumers`, `ape-pie`, `open-klant-client`, `gemma-zds-client`, `objects-api-client-django` en `requests`. Per integratie een eigen Django-app met eigen `clients.py` / `api_models.py`. Er is **geen** client-side fetch-laag, GraphQL of BFF.
- **Search is server-side**: Elasticsearch 8.x via `django-elasticsearch-dsl` (eigen `documents.py`, `analyzers.py`, `query.py`).

## De breedte: ~20 feature-subsystemen

Wat Open Inwoner een *product* maakt in plaats van een portaal-demo, is de breedte aan Django-apps — elk een subsysteem:

| Domein | Apps / functionaliteit |
|---|---|
| Identiteit & toegang | `accounts` (DigiD / eHerkenning / eIDAS / OIDC), `kvk` (bedrijfsgebruikers), `extended_sessions`, 2FA |
| ZGW / Common Ground | `openzaak` (de grootste integratie: clients, services, webhooks, import/export, config-checks), `openklant` (KCC/contactmomenten), Objects API |
| Overheidsdata | `haalcentraal` (BRP-personen), `kvk` (HR) |
| Sociaal domein | `ssd` (uitkeringen + jaaropgaven, deels via SOAP/StUF richting legacy backends) |
| Content & catalogus | `cms` (django-cms met apphooks/plugins), `pdc` (Producten- en Dienstencatalogus, treebeard-categorieën) |
| Interactie | `plans` (samenwerkplannen burger↔ambtenaar), `questionnaire` (beslisboom/zelftriage), `messages`, `userfeed` (notificatie-feed) |
| Service-integraties | `qmatic` (afspraken), `mijn_afval` (afvalkalender), `laposta` (nieuwsbrieven), `mail` |

## Enterprise-hardening

Het verschil tussen een demo en een productie-portaal voor gemeenten zit grotendeels hier, en het is in Open Inwoner expliciet aanwezig:

- **2FA**: `django-two-factor-auth` + `maykin-2fa` + WebAuthn.
- **Brute-force-lockout**: `django-axes`.
- **Audit-logging**: `django-timeline-logger` + `django-log-outgoing-requests` (logt elke uitgaande API-call).
- **Content-Security-Policy**: `django-csp` + een eigen DB-managed CSP-app met report-endpoints.
- **Sessie-hardening**: 15-min sessie-timeout, secure/HTTPOnly cookies, CSRF via sessies.
- **Observability**: Sentry + volledige OpenTelemetry-instrumentatie + Elastic APM.
- **Declaratieve provisioning**: setup-configuration (config-as-code voor deploys).

**Waar de complexiteit zit:** verspreid over ~20 server-side Django-subsystemen. De ~14% front-end (HTML/TS/SCSS) is de presentatielaag; de ~80% Python — identity-federatie, ZGW-plumbing, sociaal domein/StUF, search-indexering en de security/audit/compliance-hardening die gemeenten eisen — is het meerjarige fundament.

_Versies, byte-tellingen en app-inventaris in deze sectie geverifieerd: juni 2026._

# Portaal 3 — iBurgerzaken / Mijn Loket (PinkRoccade, proprietary)

Minder diep te verifiëren omdat het closed-source is; het bewijs komt uit vacatures en bedrijfscommunicatie, niet uit broncode. Relevant vanwege de marktomvang: **iBurgerzaken wordt door ~175 gemeenten gebruikt — meer dan de helft van Nederland.**

- Front-end: **Angular / TypeScript** (aparte "Front End / Angular Developer"-rollen).
- Backend: **Java / Spring Boot** (Java-specialisten, Kubernetes/Docker/Maven/GitLab; ook Quarkus/Wildfly genoemd).
- Geen open repo, geen `package.json`, geen publiek architectuurdocument.

Het patroon is identiek aan de andere twee: TypeScript-front-end (hier Angular) tegen een eigen server-side backend (Java) die de gemeentelijke systemen ontsluit. **De grootste speler van het land consumeert de REST-API's dus óók niet in de browser.**

_Stack-claims in deze sectie geverifieerd: juni 2026, op basis van vacatures — niet op product-broncode._

## Niet geverifieerd

Voor de overige proprietaire leveranciers uit het bredere veld (Centric, Exxellence/Mozard, GreenValley, SIMgroep/Seamless, Procura, OpenWeb) en voor de generieke "Common Ground componenten" leverde het onderzoek geen geverifieerde stack-claims op. Afwezigheid van bewijs is geen bewijs van afwezigheid — dit is een open vraag, geen conclusie.

# Hoe de backends van binnen werken

De vorige secties beschrijven de stack; deze kijkt in de broncode van de twee open-source backends (NL Portal's Kotlin-BFF en Open Inwoners Django-laag) om te zien welke data ze ophalen en welke logica ze draaien. iBurgerzaken (closed source) ontbreekt hier noodzakelijkerwijs.

## Het uitgangspunt: lees-aggregatielagen zonder eigen data

Geen van beide backends bezit noemenswaardige eigen data. Ze halen vrijwel alles **live per request** uit externe registers, doen er drie dingen mee (autoriseren, aggregeren, mappen), en geven het door. Open Inwoner noemt dit het "single datasource"-principe; NL Portal is per definitie een Backend-**for**-Frontend. Wat ze ophalen, en waarvandaan:

| Data | Bron-API | NL Portal (client) | Open Inwoner (client) |
|---|---|---|---|
| Zaken, rollen, statussen, resultaten | Open Zaak **Zaken API** | `ZakenApiClient` | `ZakenClient` |
| Zaaktypen, statustypen (metadata) | Open Zaak **Catalogi API** | `CatalogiApiClient` | `CatalogiClient` |
| Documenten | **Documenten API** | `DocumentenApiClient` (+ ClamAV) | `DocumentenClient` |
| Klant, contactmomenten, digitale adressen | **OpenKlant** | `OpenKlant2KlantinteractiesClient` | `KlantenService` (eSuite + OK2) |
| Persoon: naam, adres | **Haal Centraal BRP** | `HaalCentraal2BrpClient` | `BRPClient` (v1.3 + v2.x) |
| Bedrijf | **Haal Centraal Handelsregister/KVK** | `HandelsregisterClient` | `kvk`-app |
| Taken, berichten, producten | **Objecten API** | `ObjectsApiClient` | n.v.t. |
| Uitkeringen, jaaropgave | **Centric GWS** (SOAP/StUF) | — | `ssd` |
| Producten-catalogus (zoek) | lokaal → **Elasticsearch** | — | `pdc` + `search` |

## De drie logica's die beide backends delen

Beide komen onafhankelijk tot dezelfde drie kernproblemen en lossen ze bijna identiek op — de ZGW-standaard dwingt het patroon af.

**1. Per-burger autorisatie ("zie alleen je eigen data").** Geen van beide vertrouwt een client-meegegeven id; ze injecteren de geauthenticeerde BSN/KVK als **rol/betrokkene-filter** in de uitgaande query. De filterstring is letterlijk identiek in beide codebases:

```
rol__betrokkeneIdentificatie__natuurlijkPersoon__inpBsn = <bsn>
```

Voor bedrijven `…nietNatuurlijkPersoon__innNnpId` (KVK/RSIN). NL Portal past hetzelfde toe op Objecten-API-data via een `data_attrs`-filter (`identificatie__value__exact__<bsn>`), gooit 401 als de burger geen rol op de zaak heeft, en de BRP-query neemt géén BSN-argument — die komt uit het token, dus een ander opvragen kan niet. Open Inwoner stapelt er zichtbaarheidsregels op (status aanwezig, zaaktype `extern`, vertrouwelijkheid ≤ max, optioneel alleen-initiator).

**2. Cross-API aggregatie (één "zaak" uit 3-4 bronnen).** Een zaak zoals de burger 'm ziet bestaat niet als zodanig; hij wordt samengesteld:

- **NL Portal**: GraphQL field-resolvers (`@SchemaMapping`) halen lazy bij — `Zaak.zaaktype` → Catalogi API, `Zaak.documenten` → Documenten API, `Zaak.statussen` → Catalogi. Eén GraphQL-type, vier REST-bronnen erachter (met N+1-risico; geen DataLoader aangetroffen).
- **Open Inwoner**: een concurrent thread-pool pipeline met tijdsbudget (`openzaak/services.py`, de meest geavanceerde code in de repo). Drie fases, fan-out over álle API-groepen (meerdere gemeenten tegelijk), zaaktype-resolutie parallel, en pas voor de getoonde pagina-slice de dure status/resultaat-resolutie. Timeouts worden als getypeerde `SkippedZaak(reason=…)` vastgelegd, niet stil weggegooid.

**3. Mapping + compatibiliteits-shims.** Externe JSON → getypeerde view-models. En verrassend veel werk: **eSuite-compatibiliteit**. Open Inwoner zit vol workarounds omdat eSuite niet op zaak én BSN tegelijk kan filteren (haalt alle rollen op, filtert in Python), identificatie-herformattering (`0014ESUITE66392022 → 6639-2022`), losse status-refetches. Dit is de "API's zijn er nog niet aan toe"-realiteit, in code gegoten.

## De eigen accenten per backend

**NL Portal (Kotlin, reactief WebFlux + Spring GraphQL):**

- Identiteit via **Keycloak token-exchange** (`grant_type=token-exchange`) → `BurgerAuthentication`/`BedrijfAuthentication`. Uitgaande calls krijgen een apart service-JWT (`IdTokenGenerator`); de burger-BSN gaat als filter mee, niet als doorgestuurd token.
- **Machtigingen** zijn echt gemodelleerd: `getGemachtigde()` leest een `gemachtigde`-claim, en `AuthenticationMachtigingsDienst` beperkt welke zaaktypen/taaktypen een gemachtigde mag zien.
- **Taken/berichten/producten zijn geen eigen API's** maar generieke **Objecten API-objecten** van een geconfigureerd objecttype, doorzocht met een `data_attrs` mini-DSL; de backend legt er getypeerde Kotlin-domeinmodellen overheen.
- **Messaging via Spring Cloud Stream + RabbitMQ** naar een back-office (inkomend `CreatePortalTaskMessage`, uitgaand `CompleteTaskMessage`), plus Worldline/Ogone **betalingen** (een taak wordt afgerond op de post-sale webhook).

**Open Inwoner (Python/Django, server-rendered):**

- **ZGW Notificaties-webhook-ontvanger** die user-facing state bijwerkt: een "zaak-status-gewijzigd"-event wordt geauthenticeerd op subscription-secret, async via Celery verwerkt, per gebruiker ontdubbeld + rate-limited, en omgezet in een **feed-item + (opt-in) e-mail**.
- **`ssd` = hand-rolled SOAP/StUF** richting Centric GWS over mTLS: WSDL + xsdata-bindings, een met-de-hand-geschreven SOAP-envelope-template, lxml-parsing, en een **PDF-render** terug naar de burger. Veruit de zwaarste integratie.
- **Caching** via een eigen `@cache`-decorator met per-API-groep instelbare timeouts (NL Portal heeft géén caching-laag — alles eager per call).
- **Elasticsearch** over de producten-catalogus met facetten, synoniemen en edge-ngram-autocomplete.

## Twee observaties die het beeld bijstellen

1. **NL Portal draait géén Valtimo.** Ondanks de Ritense-copyright-headers is er geen Valtimo/Camunda/Flowable/BPMN-dependency. Deze backend is **pure aggregatie + autorisatie**; de zaakgericht-werken-procesengine (BPMN, taakcreatie) zit in een aparte back-office waar de BFF via de Objecten API en RabbitMQ mee praat. De procesdiepte zit dus elders — niet in deze repo.
2. **De echt complexe code is klein en geconcentreerd.** Bij NL Portal: de Keycloak-identiteitslaag, het autorisatie-injectiepatroon en de GraphQL-stitching. Bij Open Inwoner: `openzaak/services.py` (de concurrent pipeline), `openzaak/notifications.py` (webhook→dedup→feed) en `ssd` (SOAP). De rest — losse API-clients, DTO's, paginering — is relatief dunne, getypeerde pass-through.

De conclusie: de backends zijn geen mysterieuze kolossen, maar **dezelfde drie problemen, telkens opnieuw opgelost in een andere taal** — per-burger autorisatiefiltering, cross-API aggregatie, en compatibiliteits-shims voor API's die "er nog niet aan toe zijn".

_Backend-internals in deze sectie geverifieerd op broncode-niveau: juni 2026, branches `next-minor` (NL Portal) en `develop` (Open Inwoner)._

# De aggregatielaag als product: IKO (Integraal Klant- en Objectbeeld)

IKO is geen portaal maar de laag eronder: een **data-aggregatieplatform** dat de Common Ground-bronnen samenvoegt tot één integraal beeld. Het hoort in deze analyse omdat het exact de "server-side laag" uit het kernpatroon is — maar uitgetrokken als zelfstandig, configureerbaar product. Veelzeggend: het is van **Ritense** (`com.ritense.iko`), dezelfde leverancier als NL Portals Valtimo-BFF. De aggregatie-tier wordt dus actief door een leverancier als product geclaimd.

## Stack & opzet

- Kotlin/Spring Boot 3.5 + **Apache Camel** (integratie-routing), JDK 21, v1.4.0, open source. Server-rendered admin-UI (Thymeleaf + HTMX + IBM **Carbon Design System** — een ambtenaar-UI, géén NLDS). PostgreSQL (Flyway), **Redis**-caching, Keycloak OIDC, Prometheus-metrics, mTLS, AES-GCM-encrypted connector-config, optionele audit-logging.
- Drie Spring Security-ketens: admin-UI (OIDC-sessie op `/admin/**`), API (JWT resource server op `/aggregated-data-profiles/**` en `/endpoints/**`, autorisatie uit `resource_access.iko.roles`), en actuator.

## Hoe het werkt — drie concepten

1. **Connectoren** — Camel YAML-routes per bron: OpenZaak, OpenKlant, Objecten API, Open Documenten, Haal Centraal BRP (+ SOAP-ws-gateway), BAG. Elke connector-instantie verwijst naar de **OpenAPI-spec** van z'n bron (`apiSpecificationUrl`) en draagt encrypted config (host, tokens, mTLS). De connector definieert "hoe praat je met deze bron".
2. **Aggregated Data Profiles (ADP)** — het kern-domein. Een profiel = primaire bron + endpoint + een **boom van `Relation`-entiteiten** die data uit andere endpoints bijhalen, gekoppeld met **JQ-transformaties** (`endpointTransform` mapt parent-data naar query-parameters, `resultTransform` shapet het eindresultaat), plus role-based toegang en cache-TTL per profiel/relatie. Aggregatie is hier dus **declaratief geconfigureerd, niet hand-gecodeerd.**
3. **Consumptie** — een consument (portaal of KCC-app) haalt een integraal beeld op via de JWT-beveiligde ADP-REST-API; profielen en connectoren worden in de admin-UI beheerd (Monaco-editor voor de Camel-YAML en JQ).

## Hoe het zich verhoudt tot de twee open-source portalen

IKO is wat NL Portal en Open Inwoner intern hand-rollen, uitgetrokken tot een los product:

- de **connectoren** = de per-bron-adapters (elk leest de bron-OpenAPI),
- de **ADP's** = de cross-bron stitching — maar **declaratief via JQ + relation-tree** in plaats van bespoke resolver-code (NL Portal) of een concurrent Python-pipeline (Open Inwoner).

Daarmee is het een graad volwassener als *aggregatiemechanisme*, maar het maakt drie keuzes die afwijken van een uniform-contract-richting:

- **Zwaar & centraal** (PostgreSQL, admin-UI, opgeslagen profielen) i.p.v. een dunne gateway;
- **JQ-transform per profiel over de ruwe bron-OpenAPI** i.p.v. een gedeeld, gestandaardiseerd datamodel — IKO normaliseert juist *omdat* dat uniforme contract ontbreekt;
- **role-based toegang op profiel/endpoint** (JWT-rollen), met een "Klantbeeld"-framing en Carbon-UI die naar de **KCC-medewerker** leunen, eerder dan ABAC-per-burger.

_IKO geverifieerd op broncode- en docniveau: juni 2026, repo `Integraal-Klant-en-Objectbeeld/iko` (v1.4.0, branch `main`)._

# Waar de complexiteit zit — de gemeenschappelijke moat

Over de drie portalen heen is de verdeling consistent: **de zichtbare presentatielaag is dun en relatief eenvoudig; de moeilijke, verdedigbare logica zit server-side en is grotendeels onzichtbaar in een schermafdruk.** Concreet bestaat die laag uit:

1. **Identity-federatie** — DigiD, eHerkenning, eIDAS, OIDC, plus KvK-koppeling voor bedrijfsgebruikers. Niet "een loginscherm", maar broker-integraties met sessie-, niveau- en BSN-afhandeling.
2. **Machtigingen / vertegenwoordiging** — handelen namens een kind, partner of bedrijf. Juridisch verplicht, technisch taai, en bewust uit de front-end gehouden.
3. **ZGW-integratie met versievariatie** — Open Zaak, OpenKlant, Objecten, Documenten. Gemeenten draaien verschillende versies; hier zit de meeste echte complexiteit. Elke leverancier herbouwt deze plumbing in zijn eigen taal (Kotlin, Python, Java).
4. **Sociaal domein & legacy** — uitkeringen, jaaropgaven, deels nog SOAP/StUF richting oudere backends (ESuite e.d.).
5. **Per-gemeente configuratie & content** — CMS, producten-/dienstencatalogus, white-labeling, menu's, teksten per gemeente.
6. **Formulieren** — definitie, rendering, validatie, koppeling aan taken/zaken, opslaan-en-later-verder (Form.io bij NL Portal; eigen `questionnaire` bij Open Inwoner).
7. **Compliance-hardening** — 2FA, brute-force-lockout, audit-/outgoing-request-logging, CSP, WCAG-toegankelijkheid, observability, config-as-code.
8. **Search** — server-side (Elasticsearch bij Open Inwoner), niet client-side.

Geen van deze acht hoort thuis in een browser-bundle, en in de praktijk zit geen ervan dáár.

# Architecturale observaties

Drie patronen vallen op, met directe relevantie voor de vraag wat VNGR zou kunnen leveren:

**1. De BFF/aggregatielaag is de herhaalde investering — en de moat.** NL Portal lost dit propriëtair op met Valtimo (Kotlin + GraphQL); Open Inwoner met `zgw-consumers` (Python); PinkRoccade met een Java-backend. Drie keer hetzelfde wiel — server-side aggregatie en compliance over dezelfde ZGW-API's — in drie talen. Dáár zit de herhaalde pijn, niet in de UI. En met IKO trekt Ritense deze tier nu uit als zelfstandig, configureerbaar product: de aggregatielaag wordt actief door een leverancier geclaimd, niet door een VNG-standaard. De strategische vraag verschuift daarmee van "browser-SDK" naar: wil VNGR de aggregatielaag aan leveranciers overlaten (Valtimo/IKO) en zich richten op het standaardiseren van het bron-contract eronder — het laag waar IKO juist JQ-transformaties voor nodig heeft omdat het ontbreekt.

**2. Type-generatie loopt nergens via een handgeschreven TS-SDK.** NL Portal genereert types uit GraphQL (`graphql-codegen`); Open Inwoner genereert ze niet (Python server-side); PinkRoccade is onbekend maar Angular tegen een eigen backend. Tegelijk *moet* elke ZGW-component zijn OAS3-schema serveren op `{API root}/openapi.json` (verplichte VNG-standaard sinds 1 april 2021). Dat maakt **OpenAPI-gebaseerde, taalonafhankelijke codegen** (TS, Kotlin, Python) de logischere route dan een TS-specifiek pakket — codegen bedient alle drie de architecturen, een browser-SDK slechts een niche die in de praktijk leeg is.

**3. State management en client-side search zijn opgeloste problemen op de verkeerde laag.** Beide worden server-side afgehandeld (Apollo-cache resp. GraphQL bij NL Portal; Django + Elasticsearch bij Open Inwoner). Een client-side oplossing hiervoor landt in een laag die de markt bewust heeft leeggemaakt.

# Bronnen

Primaire bronnen, geverifieerd in juni 2026 (drie-stemmige adversariële check op de kernclaims):

- NL Portal front-end — `github.com/nl-portal/nl-portal-frontend-libraries` (package.json's, `codegen.ts`, README)
- NL Portal backend/BFF — `github.com/nl-portal/nl-portal-backend-libraries` (languages-API, build-config, modules)
- NL Portal release notes — `nl-portal.nl/release-notes/3.x.x` (JS-gerenderd; via repo's bevestigd)
- Open Inwoner — `github.com/maykinmedia/open-inwoner` (`requirements/base.txt`, `src/open_inwoner/*`, `conf/base.py`) en `docs.openinwoner.nl/en/latest/architecture`
- OpenKlant (referentiecomponent) — `github.com/maykinmedia/open-klant`
- `zgw-consumers` — `github.com/maykinmedia/zgw-consumers`
- ZGW-standaard — `vng-realisatie.github.io/gemma-zaken/standaard` (zes API's; verplichte `/openapi.json`)
- PinkRoccade — `pinkroccadelocalgovernment.nl/werken-bij` (vacature-bewijs: Angular + Java/Spring Boot)

**Beperkingen:** stack-bewijs voor de overige proprietaire leveranciers ontbreekt; versienummers zijn momentopnames per juni 2026; de PinkRoccade-claim steunt op vacatures (team-techstack), niet op product-broncode.
