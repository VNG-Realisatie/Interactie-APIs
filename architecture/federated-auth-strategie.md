**Naar truly federated auth: hoe de API's moeten lopen, en hoe we daar komen**

_Joep Meindertsma, 20 juli 2026 — voortbouwend op [referentie-architectuur.md](./referentie-architectuur.md), [`patterns/federated-auth/next.yaml`](../patterns/federated-auth/next.yaml) en het live geverifieerde prototype in [`burgerportaal-iko/`](../burgerportaal-iko/docs/architecture.md). Zie ook issue [#43](https://github.com/VNG-Realisatie/vng-api-lab/issues/43) (service discovery)._

# Het probleem

In het huidige model loopt burgerdata via een aggregatielaag (IKO-achtig) die met één breed
M2M-servicecredential bij álle bronnen kan. Dat werkt, maar heeft twee fundamentele nadelen:

1. **Eén partij ziet het complete plaatje.** Alle burgerdata van alle domeinen komt op één plek
   samen — een concentratierisico dat haaks staat op de federatieve filosofie van Common Ground
   (en van FSC, de NLX-opvolger: geen centrale hub die al het verkeer ziet).
2. **De bron vertrouwt de aanroeper, niet het token.** ZGW-implementaties vertrouwen vandaag op
   filtering door de aanroepende applicatie (systeem-tot-systeem-vertrouwen). Zonder gateway die
   filtert is "direct bij de bron" dan een datalek-op-aanvraag.

Het prototype in `burgerportaal-iko` bewijst dat het anders kan: een echte OAuth2
resource-server-laag waar de bron zélf het token verifieert (JWKS, issuer, audience) en op
recordniveau afdwingt dat de BSN-claim bij de opgevraagde data hoort.

# Het eindbeeld: hoe de calls moeten lopen

De browser is de enige plek waar alles samenkomt — bij de burger zelf. Per sessie:

1. **Discovery** — de client haalt `GET /.well-known/federated-resources` op
   ([spec](../apis/rest/discovery/next.yaml), [schema](../schemas/discovery/v0.0.1.json)) en weet
   per service (taken, zaken, producten, …) welk systeem hem bedient. Publiek en
   identiteitsagnostisch, naar analogie van RFC 8414.
2. **Eén login** — Authorization Code + PKCE bij de autorisatieserver (DigiD of simulatie).
   Eén keer inloggen, niet per bron.
3. **Per bron een smal token** — de client wisselt zijn login-token in voor een
   audience-restricted token per bron (RFC 8693 token exchange, `resource=` uit het manifest).
   Dit is het missende scharnier: vandaag ligt de audience statisch vast per geregistreerde
   client, waardoor elke bron vooraf ingericht moet zijn. Met token exchange bepaalt de _client_
   welke bronnen hij aanspreekt, puur op basis van het manifest.
4. **Direct naar de bron** — de browser roept elke bron rechtstreeks aan; de bron verifieert
   zelf het token en dwingt record-level autorisatie af (`403 RecordNietGemachtigd` bij een
   BSN-mismatch, zie het pattern). Geen enkele partij ziet het complete plaatje.

# De rol van de aggregatielaag: van hub naar adapter naar gewoon-een-bron

Vrijwel geen enkele bestaande bron kan vandaag stap 4 waarmaken. De aggregatielaag is daarom
niet het eindbeeld, maar wél het realistische migratiepad — in drie gedaantes, waarbij de
frontend het verschil nooit ziet:

- **Nu (hub).** Alles loopt door de aggregatielaag; één M2M-credential werkt overal.
- **Overgang (federation-adapter).** De aggregatielaag staat vóór bronnen die zelf nog geen
  resource-server zijn: naar de client toe gedraagt hij zich per service als een federated bron
  (eigen manifest-entry, audience-restricted tokens, record-level check); naar binnen toe praat
  hij legacy-M2M. Cruciaal: **per-service entries in het manifest**, niet één adapter-entry —
  dan kan elke bron afzonderlijk migreren.
- **Eindtoestand (gewoon een bron).** Zodra een bron zelf federated-capable is, wijst zijn
  manifest-entry direct naar de bron: één regel wijzigen, nul frontend-werk. Wat overblijft van
  de aggregatielaag is alleen échte aggregatie (bijv. plan + doelen samenvoegen) — en dat is dan
  geen hub meer, maar zelf een smalle bron met een eigen audience naast de andere.

De frontend en het manifest-formaat zijn de invarianten; bronnen en adapter zijn de bewegende
delen. Dat is ook het adoptieverhaal richting leveranciers: je hoeft niet te wachten tot élke
bron klaar is — elke bron die migreert, maakt het stelsel federatiever zonder iets te breken.

# Hoe de API's in dit lab over tijd moeten wijzigen

De mocks krijgen de rol van referentie-implementatie: "zo hoort een leverancier het te doen."
Elke mock wordt een zelfstandige, federated-capable bron. In volgorde van afhankelijkheid:

1. **Token exchange** (RFC 8693) in de autorisatieserver-config + testscript — sluit de
   discovery→auth-lus. Alles hierna bouwt hierop.
2. **Specs**: elke API krijgt een `next`-versie waarin `securitySchemes` van het
   dummy-bearer-token naar echte OIDC/JWT gaat, met verwijzing naar
   `patterns/federated-auth`. Oude versies blijven staan — bestaande consumers breken niet; het
   discovery-manifest wijst per service naar de versie die geldt.
3. **Mocks als resource-servers**: de token-verificatie + record-level-check uit
   `burgerportaal-iko/gateway/federated-auth.js` genericeren tot herbruikbare module en op de
   BSN-scoped mocks zetten, met per-demo-burger verschillende data — zodat de 403-enforcement
   per bron toetsbaar is, niet alleen bij de adapter.
4. **Frontend-PKCE**: de MijnOverheid-demo verliest zijn hardcoded token; login → per-service
   token via exchange → direct bevragen. Vanaf hier is de demo end-to-end het eindbeeld.
5. **De migratie-demo**: één service live van adapter naar directe bron omzetten door alléén de
   manifest-entry te wijzigen, terwijl de app blijft werken. Dat ene moment demonstreert de hele
   architectuur.
6. **Daarna de dure eisen**: fijnmazige scopes per service (`taken:lezen` — klein), en
   DPoP/sender-constrained tokens (RFC 9449) + toegangslogging bij de bron (echte
   engineering-investering, geen configuratie).

# Versiebeleid

Het manifest-contract blijft minimaal en stabiel (`service`, `baseUrl`, `specUrl`, `label`);
hoe te authenticeren staat canoniek in de `securitySchemes` van de spec achter `specUrl` en
wordt niet in het manifest gedupliceerd. Alle evolutie zit in wáár entries naartoe wijzen en
welke spec-versie erachter hangt. Auth-evolutie per API loopt via nieuwe spec-versies
(`next` → semver), nooit via breaking changes in bestaande versies.

# Openstaande vragen

- Is er een bestaande VNG/Logius-werkgroep rond burger-scoped autorisatie op ZGW-API's (buiten
  FSC's organisatie-tot-organisatie-scope)? Niet gevonden in eerder onderzoek — navragen voordat
  dit als "nieuw" wordt gepositioneerd.
- Hoe verhoudt token exchange zich tot de toekomstige eIDAS 2.0-wallet-flows? De
  anti-centralisatiefilosofie is dezelfde, maar eIDAS specificeert dit mechanisme niet voor
  operationele API's — dit blijft een eigen synthese.
- Moet het discovery-manifest een eigen standaardisatievoorstel worden richting Common Ground
  (issue #43), los van de auth-pattern?
