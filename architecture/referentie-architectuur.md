**Referentie-architectuur: burger logt in, ziet alles**

_Werkdocument, 16 juni 2026 — voortbouwend op [generieke-api-strategie.md](./generieke-api-strategie.md)_

# Waarom dit document

[`generieke-api-strategie.md`](./generieke-api-strategie.md) beschrijft de **principes en het "wat"**: een uniforme API-strategie bij VNG, met losgekoppelde datamodellen, generieke endpoints, OIDC-NLGOV en ABAC.

Dit document beschrijft het **"hoe" voor één concrete keten**: _een burger logt in bij MijnOverheid en ziet alles van verschillende overheden op één plek._ Het vult bovendien de beslissingen in die de strategie bewust openliet (federatief vs. centraal, event-sourcing vs. feed, wie de registers beheert), en voegt de lagen toe die de strategie niet raakte (aggregatie, ingest-betrouwbaarheid, identiteit, de burgerflow).

De afzonderlijke beslissingen staan als ADR's in [`./adr/`](./adr/). Op vier punten wijkt dit document **bewust** af van de strategie; die zijn hieronder als beslispunten gemarkeerd zodat ze aangenomen of verworpen kunnen worden.

# Hoe dit aansluit op de strategie

| Pijler uit de strategie | In deze referentie-architectuur | Status |
|---|---|---|
| JSON-Schema datamodellen, los van de API, per URL | Identiek + URI-identiteit & getypeerde referenties | ✅ Behouden |
| Resource endpoint (`/{id}`, schema-conform) | Het resource-contract per resourcetype | ✅ Behouden |
| Query endpoint | `/zoek` blijft, maar **begrensde grammatica** i.p.v. arbitraire ElasticSearch-DSL — [ADR-0003](./adr/0003-begrensde-query-grammatica.md) | ⚠️ Verfijnd |
| Domain endpoints = query-templates | WOZ/Parkeren/Erfpacht/Belasting worden filters, geen nieuwe API's | ✅ Behouden |
| Event endpoint (CloudEvents + event sourcing) | Lezen: **snapshot + SSE `/events`** ([ADR-0002](./adr/0002-levering-snapshot-plus-sse.md)). Schrijven: **CloudEvents als ingest-envelop** ([ADR-0004](./adr/0004-ingest-cloudevents-push.md)). Event sourcing als publiek contract vervalt | ⚠️ Getransformeerd |
| OAuth + OIDC-NLGOV | Ongewijzigd; + token-exchange per bron | ✅ Behouden |
| ABAC | Versterkt: ABAC **bij de bron** (`betrokkene = burger`) | ✅ Behouden |

De **probleem**analyse uit de strategie is grotendeels wat dit plan oplost: "geen synchronisatie / gaten in data / betrouwbaar verwijderen" → change-feed + SSE + crypto-shred-tombstones; "geen granulaire autorisatie" → ABAC-bij-de-bron; "versiebeheer & datamodel-loskoppeling" → ongewijzigd overgenomen.

# De architectuur in lagen

```
 BRONNEN (bronhouders)              LEES-LAAG                          CLIENT
 ┌─────────────────────┐
 │ Belastingdienst     │  resource + zoek + events  ┌──────────────────┐
 │ Gemeente (ZGW)      │◀───── federatieve ────────│  dunne token/    │  1× /context
 │ Waterschap, SVB,    │       fan-out (parallel)   │  CORS-gateway    │◀── include:[...]
 │ CAK, RDW, BRP, WOZ  │───────────────────────────▶│  (géén record-   │   per-domein status
 └─────────────────────┘   CloudEvents-push (ingest) │  opslag)        │      │
        ▲  OIDC-NLGOV + token-exchange + pseudoniem  └──────────────────┘      ▼
        └──── ABAC bij de bron: betrokkene = burger ───────────┘      client-side merge →
                                                                       alle pagina's
```

1. **Model-laag.** JSON Schema voor validatie + URI-identiteit en getypeerde referenties (de bruikbare 5% van linked data). Eén Git-repo, versie-loos, per-URL opvraagbaar — zoals in de strategie.

2. **Contract-laag (wat bronnen bieden).** ~7 kern-resources — `Taak, Zaak, Product, Verplichting, Bezit, Bericht, Persoon` — die elk hetzelfde protocol-skelet instantiëren: `GET /{id}` (resource), `POST /zoek` (begrensde query), `GET /events` (resumable SSE, `Last-Event-ID` = cursor). Geen 17 bespoke API's, geen 3 god-endpoints. Zie [ADR-0002](./adr/0002-levering-snapshot-plus-sse.md), [ADR-0003](./adr/0003-begrensde-query-grammatica.md).

3. **Ingest-laag (hoe data binnenkomt).** Bronnen leveren **CloudEvents + JSON-Schema-payload**, idempotent en ondertekend — ofwel via self-host, ofwel door te pushen naar een **per-domein register**. Eén keer leveren, aan één punt; het register absorbeert de retry-complexiteit. Zie [ADR-0004](./adr/0004-ingest-cloudevents-push.md), [ADR-0006](./adr/0006-per-domein-registers.md).

4. **Lees-/aggregatielaag.** Federatieve fan-out over de bronnen, samengevoegd tot één overzicht **met per-domein status** (ready/loading/error). De aggregatie hoeft niet op een server — alleen een **dunne token/CORS-gateway** is nodig (OAuth-tokens buiten de browser, CORS oplossen). Zie [ADR-0001](./adr/0001-federatief-geen-centrale-kluis.md), [ADR-0005](./adr/0005-dunne-gateway-client-side-aggregatie.md).

5. **Identiteit & autorisatie.** OIDC-NLGOV/DigiD; token-exchange per bron; **polymorfe pseudoniemen** zodat niet elke overheid je rauwe BSN krijgt; **ABAC bij de bron** filtert query-time op `betrokkene = burger`.

# End-to-end: de burger logt in

```
1. INLOGGEN (DigiD / OIDC-NLGOV)
   Burger → gateway → identity provider → terug met id_token + access_token.

2. DISCOVERY ("waar staat mijn data?")
   Gateway vraagt de verwijsindex/FDS-catalogus + leidt woongemeente af uit BRP.
   Resultaat: lijst bron-endpoints + resourcetypen. (alleen metadata, geen inhoud)

3. TOKEN-EXCHANGE per bron
   Per overheid een scoped (pseudoniem) token: "burger X, via MijnOverheid".

4. FEDERATIEVE FAN-OUT (snapshot)  ── parallel ──
   Gemeente → zaken/taken/producten/gesprekken; Belastingdienst/waterschap/CAK → verplichtingen;
   LV WOZ → beschikking; BRP → persoonsgegevens. Elke bron: ABAC betrokkene = jij.
   Samengevoegd tot één bundel, mét per-domein status.

5. LIVE (één SSE /events)
   Eén stream → alle bron-events gemultiplext. Nieuwe aanslag / statuswijziging /
   chatbericht → live binnen. Last-Event-ID = catch-up bij reconnect.

6. SCHRIJVEN
   Reageren op taak / bericht sturen → POST command (idempotent) → resultaat als event terug.
```

Stap 4 is precies het per-domein `Loadable`-patroon in de huidige MijnOverheid-demo: één trage of platte overheid = die tegel toont laden/fout, de rest vult gewoon. Stap 5 is het `/events`-SSE-idee uit de eerdere zaakchat-demo, nu voor álles.

# Chat & realtime

Chat is geen apart domein maar het **realtime kanaal van Klantinteractie** (`gesprekken` en `zaakchat` gaan op in het klantinteractie-register). Drie vlakken: **overzicht** (geaggregeerd als elke tegel), **live sessie** (push-kanaal/SSE, met de cursor-feed als catch-up), **schrijven** (command + idempotency-key). Vluchtige signalen (typing/presence) gaan alleen over het live-kanaal, nooit gepersisteerd. Bewust **géén default-E2EE** vanwege archiverings-/registratieplicht; E2EE alleen voor een apart vertrouwelijk kanaal. Zie [ADR-0002](./adr/0002-levering-snapshot-plus-sse.md).

# Bewuste afwijkingen van de strategie (beslispunten)

1. **"3 generieke endpoints" → ~7 getypeerde resources op één gedeeld protocol.** Generiek verplaatst complexiteit naar de consumer en verliest typecontracten/codegen. → spectrum i.p.v. god-endpoints.
2. **Query: ElasticSearch-compatible → begrensde grammatica** ([ADR-0003](./adr/0003-begrensde-query-grammatica.md)). Een publiek arbitrair query-endpoint is qua autorisatie en DoS/exfiltratie onhoudbaar.
3. **Event sourcing → notificatie + pull (snapshot + SSE)** ([ADR-0002](./adr/0002-levering-snapshot-plus-sse.md)). Append-only log als publiek contract botst met AVG-verwijdering en schema-evolutie.
4. **Federatief, expliciet** ([ADR-0001](./adr/0001-federatief-geen-centrale-kluis.md)). Geen nationale datakluis; data bij de bron.

# Open vragen & governance

- **Wie beheert de registers** — bronhouder vs. operator vs. afsprakenstelsel; zie [ADR-0006](./adr/0006-per-domein-registers.md).
- **Vendor lock-in** bij zaaksysteem-leveranciers als operator — antigif is het uniforme contract + certificering + aanbestedings-eisen (GIBIT), maar het blijft een bestuurlijke lever.
- **Identity-matching** (pseudoniem-vertaling) is operationeel kritisch en het breekbaarste deel.
- **Adoptie**: niet elke bron doet day-1 mee → adapters + nette degradatie ("nog niet beschikbaar").
- **E2EE vs. ABAC/query** — kies per resourcetype een privacy-niveau.

# Beslissingen (ADR-index)

- [ADR-0001](./adr/0001-federatief-geen-centrale-kluis.md) — Federatief, geen centrale kluis
- [ADR-0002](./adr/0002-levering-snapshot-plus-sse.md) — Levering: snapshot + SSE-events (i.p.v. event sourcing)
- [ADR-0003](./adr/0003-begrensde-query-grammatica.md) — Begrensde query-grammatica (i.p.v. ElasticSearch-DSL)
- [ADR-0004](./adr/0004-ingest-cloudevents-push.md) — Ingest: CloudEvents-push, idempotent & ondertekend
- [ADR-0005](./adr/0005-dunne-gateway-client-side-aggregatie.md) — Dunne token/CORS-gateway + client-side aggregatie
- [ADR-0006](./adr/0006-per-domein-registers.md) — Per-domein registers & governance
