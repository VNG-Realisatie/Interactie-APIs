# Burgerportaal IKO

Dit is een nieuw burgerportaal gekoppeld aan **IKO** (de open-source aggregatielaag van Ritense) via een dunne **BFF-gateway**.

## Architectuur
De applicatie volgt de Common Ground referentie-architectuur:
`Browser (React/NLDS) --> BFF-gateway (Express) --> IKO (Aggregatielaag) --> Common Ground Bronnen (Mocks)`

- **Frontend**: React/Vite app aangepast van de MijnOverheid-demo. Draait op http://localhost:5180.
- **BFF Gateway**: Express server op http://localhost:3000. Regelt burger inloggen (DigiD OIDC simulatie), BSN-injectie en M2M token flow naar IKO.
- **IKO**: Draait op http://localhost:8080. Aggregeert BRP, zaken, taken, plannen, agenda en gesprekken.
- **Keycloak**: Draait op http://localhost:8082 voor authenticatie en OIDC.

## Snel Starten

1. **Start de stack** (Docker containers):
   ```bash
   npm run start
   ```
   Dit start Postgres, Redis, Keycloak, IKO, de mock-bronnen, de BFF-gateway en de frontend.

2. **Seed de IKO database**:
   ```bash
   npm run seed
   ```
   Dit script installeert de vereiste SQL dependencies en configureert IKO automatisch. Het maakt de connectoren, instances en Aggregated Data Profiles (ADP) aan in de database.

3. **Open het portaal**:
   - Ga naar http://localhost:5181 om het burgerportaal te gebruiken (log in als `jeroen`/`jeroen` of `anna`/`anna`).
   - Ga naar http://localhost:8080/admin om de IKO Admin UI te bekijken (login met `admin/admin`).

## Demo: MijnOverheid-app op IKO (mock-compatibele facade)

De gateway serveert ook de exacte paden en response-vormen van de VNG API
Lab-mocks (`/apis/rest/...`), gevoed door IKO. Daarmee draait de **ongewijzigde**
MijnOverheid-app uit `mijnoverheid/` volledig op de IKO-aggregatielaag — met
dezelfde demodata, en de persoonsgegevens uit een échte Open Klant.

### Opzetten (één commando)

```bash
npm run demo
```

Dit start de stack (zonder de burgerportaal-frontend), seedt IKO én Open
Klant, en wacht tot de hele keten antwoordt. Daarna:

```bash
# in een tweede terminal, vanuit de repo-root van vng-api-lab
npm run mock          # de lokale mocks op :41837 — de "voor"-situatie
cd mijnoverheid && pnpm dev   # de app op http://localhost:5180
```

### Draaiboek

1. **Voor**: open http://localhost:5180. De app praat rechtstreeks met de
   mock-API's (poort 41837). Open de API-inspector (de `</>`-knop) en laat de
   calls zien: elke pagina bevraagt zijn eigen bron-API.
2. **Omschakelen**: zet in de API-inspector per API de endpoint-override op de
   gateway — begin met één API (bijv. MijnTaken →
   `http://localhost:3000/apis/rest/taken/next`) om te laten zien dat het per
   bron kan. Of schakel alles in één keer via de browserconsole:

   ```js
   localStorage.setItem('mijnoverheid-api-bases', JSON.stringify(Object.fromEntries([
     ...['taken','zaken','producten','agenda','gesprekken','openplan-plannen']
       .map(a => [a, `http://localhost:3000/apis/rest/${a}/next`]),
     ['openklant-klantinteracties', 'http://localhost:3000/apis/rest/openklant-klantinteracties/mijnoverheid-demo'],
   ]))); location.reload();
   ```

3. **Na**: zelfde app, zelfde data — maar in de API-inspector zie je dat alle
   verkeer nu via `localhost:3000` (de BFF-gateway) loopt. Achter de schermen:
   gateway → IKO (M2M-token via Keycloak) → bronnen. Laat de IKO Admin UI zien
   op http://localhost:8080/admin (`admin/admin`): daar staan de connectoren
   en de dataprofielen die per portaal-onderdeel aggregeren.
4. **Punchline**: "Mijn gegevens" komt niet uit een mock maar uit een échte
   Open Klant-installatie (met TokenAuth), zonder dat de app dat merkt.

Terug naar de "voor"-situatie:

```js
localStorage.removeItem('mijnoverheid-api-bases'); location.reload();
```

## Demo: user-scoped met DigiD-simulatie (2 burgers)

Het burgerportaal zelf (http://localhost:5181, draait mee in de stack) heeft
een echte loginflow via Keycloak als DigiD-simulatie. Er zijn twee burgers:

| Login | Wachtwoord | BSN | Persona |
|---|---|---|---|
| `jeroen` | `jeroen` | 569312863 | Jeroen van Drouwen, Keukenlaan 133 |
| `anna` | `anna` | 123456782 | Anna Jansen, Parkstraat 42 |

De BSN komt als claim uit het token, gaat via de gateway-sessie als `?id=` mee
naar IKO, en het `gegevens`-dataprofiel filtert daarmee in de echte Open Klant
(`partijIdentificator__objectId`). Log in als Jeroen, bekijk "Mijn gegevens",
log uit (beëindigt ook de Keycloak-SSO-sessie) en log in als Anna: andere
naam, ander adres, andere contactgegevens — zonder dat de frontend iets van
BSN's weet. De overige tabs (taken, zaken, agenda, …) komen uit de
Prism-mocks en zijn nog niet per burger verschillend.

Zie `docs/architecture.md` voor de architectuurdetails.
