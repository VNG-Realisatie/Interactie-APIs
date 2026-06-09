# MijnTaken demo-server

Een **super kleine, stateful, niet-productie** backend + host voor de MijnServices
demo-app. Implementeert het [MijnTaken-contract](https://github.com/vng-realisatie/mijn-taken-api) plus
een paar mutatie-endpoints, zodat hackathon-deelnemers echt taken voor een burger
kunnen aanmaken en bewerken die meteen in de demo-app (het Nabestaandendossier) verschijnen.

- **Eén URL voor alles** — dezelfde server serveert de demo-app én de API.
- **Geen dependencies** — alleen Node's ingebouwde modules (Node 18+).
- **State is in-memory** — weg bij herstart. Prima voor een demo/hackathon.

## Starten (alles op één URL)

```sh
node backend/server.mjs
# of een andere poort:
PORT=8080 node backend/server.mjs
```

Open dan **`http://localhost:8787/#plannen`**. De server serveert de app en koppelt
die automatisch same-origin aan de API — geen `?api=` en geen CORS nodig. Wijzigingen
via de API verschijnen meteen in elke open tab (zie [Live updates](#live-updates-server-sent-events)).

> Hoe het werkt: bij het serveren van `index.html` injecteert de server
> `window.MIJNPLANNEN_API = ""`. De app gebruikt dat als seintje om live (relatief)
> te fetchen. Wordt `index.html` als losse statische file geserveerd (zoals de
> portal `/demo/`), dan ontbreekt dat seintje en blijft de app op statische data.

## Online zetten met één tunnel

Geen cloud-account nodig — exposeer de server (app + API) via één tunnel:

```sh
# Cloudflare (geen account nodig voor een quick tunnel):
npx cloudflared tunnel --url http://localhost:8787

# of ngrok:
ngrok http 8787
```

Beide printen één publieke `https://…`-URL. Deel daarvan `https://<tunnel-url>/#plannen`
met de deelnemers — app én API zitten erachter. Blijft online zolang je laptop én
het tunnel-proces draaien.

## Alternatief: app los hosten, alleen API koppelen

Draai je de app ergens anders (bijv. de portal `/demo/`)? Geef dan de API-URL mee via
de `?api=`-query parameter (vóór de hash); de waarde wordt onthouden in `localStorage`:

```
https://<portal>/demo/index.html?api=https://<tunnel-url>#plannen
```

Terug naar statisch: open de app met een lege waarde `?api=`.

## Endpoints

Contract (uit `next.yaml`):

| Methode | Pad | Omschrijving |
|---|---|---|
| `POST` | `/context/zoek` | `ContextResultaat` met `taken[]` (samenvattingen) |
| `GET` | `/taken/{uuid}` | volledige `Taak` |

Mutaties (demo-uitbreiding, **géén** onderdeel van een standaard):

| Methode | Pad | Omschrijving |
|---|---|---|
| `GET` | `/taken` | lijst van alle taken (gemak) |
| `POST` | `/taken` | nieuwe taak aanmaken |
| `PATCH` | `/taken/{uuid}` | taak bijwerken (bijv. `status`) |
| `DELETE` | `/taken/{uuid}` | taak verwijderen |

> ⚠️ **Let op — dit is geen echte Taken API.**
> De **lees**-endpoints (`POST /context/zoek`, `GET /taken/{uuid}`) volgen het
> [MijnTaken-contract](https://github.com/vng-realisatie/mijn-taken-api). De **schrijf**-endpoints
> hierboven zijn zelf verzonnen voor deze demo en staan **niet** in dat contract:
> MijnTaken is bewust alleen-lezen voor het portaal; muteren hoort bij de provider.
> Wil je contract-getrouw taken aanmaken/bewerken, kijk dan naar de
> **OpenVTB Taken API** ([`apis/rest/openvtb-taken/v0.1.0.yaml`](https://github.com/maykinmedia/open-vtb)),
> die volledige CRUD per taaktype (`/betaaltaken`, `/externetaken`, `/formuliertaken`) biedt.

`organisatie` is een extensieveld bovenop `TaakSamenvatting`; de demo-app groepeert
daarop. Onbekende organisaties krijgen automatisch een eigen groep + filter.

## Velden van een taak (brief) — `POST /taken` en `PATCH /taken/{uuid}`

Alleen `titel.nl` is verplicht; de rest is optioneel met de genoemde default.

| Veld | Type | Default | Toelichting |
|---|---|---|---|
| `titel.nl` | string | — | **Verplicht.** Onderwerp/titel van de brief. |
| `organisatie` | string | `"overig"` | Id: `gemeente`, `belastingdienst`, `toeslagen`, `svb`, `cak`, `uwv`, `rdw`, `waterschap`, `cjib`, `duo`, `rvo`, `kvk`. Een andere waarde krijgt een eigen groep. |
| `briefType` | enum | `"actiebrief"` | `informatiebrief` \| `actiebrief` \| `factuur` \| `aanmaning`. |
| `actieNodig` | boolean | `true` | `true` = telt als actie (in de voortgang, deadline-badge). `false` = informatief. |
| `automatisch` | boolean | `false` | `true` → badge "Automatisch geregeld" (alleen zinvol als `actieNodig=false`). |
| `soort` | enum | `"verplichting"` | `verplichting` \| `recht`. |
| `status` | enum | `"open"` | `open` \| `afgerond` \| `geannuleerd`. |
| `deadline` | string (ISO 8601) | `""` | Bv. `"2026-07-15T23:59:59+02:00"`. Bepaalt "Nog X dagen" / "vóór …". |
| `ontvangen` | string `YYYY-MM-DD` | `""` | Datum binnenkomst (detailpagina). |
| `toelichting.nl` | string | — | "Wat wordt er gevraagd". |
| `leidtTotZaak` | string \| null | `null` | Naam van de zaak waartoe de brief leidt. |
| `uitvoering.canonicalUrl` | string (URL) | `""` | Handoff-link (knop op de detailpagina). |
| `aanhef` | string | `""` | Bv. `"Beste erven van Cees de Vries"` (detailpagina). |
| `geadresseerde` | string | `""` | `"erven"` of `"partner"`. Bij `"erven"` toont de app een pijnpunt-melding. |
| `adres` | object \| null | `null` | `{ straat, huisnummer, postcode, woonplaats, verzorgingstehuis }`. `verzorgingstehuis: true` toont een pijnpunt-melding. |
| `briefCode` | string | `""` | Kenmerk (detailpagina). |

Antwoord op `POST`: `201` met het aangemaakte object inclusief gegenereerde `uuid`.

## Live updates (Server-Sent Events)

De server pusht via **`GET /events`** (een SSE-stream) seintjes naar alle verbonden clients:

- bij **aanmaken/bewerken/verwijderen** van een taak → `{"type":"taken"}` → elke open app ververst
  z'n lijst automatisch (geen "Vernieuwen" nodig);
- bij **wijziging van `app.js` / `styles.css` / `index.html`** → `{"type":"reload"}` → alle tabs
  herladen (handige dev-live-reload).

De demo-app verbindt hier automatisch mee in API-modus. Werkt gewoon via de tunnel (SSE is HTTP).
Snel zelf zien: `curl -N https://<tunnel>/events` en in een ander venster een taak aanmaken.

## Voorbeelden

```sh
# Taken ophalen (zoals de demo-app doet)
curl -s -X POST localhost:8787/context/zoek \
  -H 'content-type: application/json' \
  -d '{"klantId":"demo","include":["taken"]}'

# Nieuwe taak aanmaken voor de burger
curl -s -X POST localhost:8787/taken \
  -H 'content-type: application/json' \
  -d '{
    "organisatie": "woningcorporatie",
    "titel": { "nl": "Huurcontract opzeggen en sleutels inleveren" },
    "toelichting": { "nl": "Zeg de huurwoning op en lever de sleutels in." },
    "deadline": "2026-06-20T23:59:59+02:00",
    "uitvoering": { "type": "formulier", "canonicalUrl": "https://voorbeeld.nl/opzeggen" }
  }'

# Taak afronden
curl -s -X PATCH localhost:8787/taken/<uuid> \
  -H 'content-type: application/json' \
  -d '{"status":"afgerond"}'
```
