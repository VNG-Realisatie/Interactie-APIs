**Naar truly federated auth: direct bij de bron, met de burger als autorisatiegrond**

_Joep Meindertsma, 20 juli 2026 — voortbouwend op [referentie-architectuur.md](./referentie-architectuur.md), [analyze-portalen.md](./analyze-portalen.md), [`patterns/federated-auth/next.yaml`](../patterns/federated-auth/next.yaml) en het live geverifieerde prototype in `burgerportaal-iko/` (aparte repo). Zie ook issue [#43](https://github.com/VNG-Realisatie/vng-api-lab/issues/43) (service discovery)._

Dit document beantwoordt drie vragen:

1. **Waar staan we nu?** Hoe portalen als NL Portal en Open Inwoner vandaag authenticeren en
   autoriseren, en waarom dat model (applicatie-tokens + filter-discipline) een security-risico
   en een schaalbaarheidsrem is.
2. **Waar bewegen we al heen?** De interactielaag met aansluitprofielen, en Federatief
   Toegangsverlenen (AuthZEN) — wat die oplossen, en wat expliciet niet.
3. **Wat mist er nog?** Direct bij de bron kunnen halen, met de burger zelf als
   autorisatiegrond — waarom dat de holy grail is, en waarom we er dichterbij zijn dan het
   lijkt.

# 1. Huidige situatie: applicatie-tokens en filter-discipline

## Hoe het vandaag werkt

Uit het code-onderzoek naar de bestaande burgerportalen
([analyze-portalen.md](./analyze-portalen.md)) komt één patroon terug, telkens opnieuw
geïmplementeerd:

- **NL Portal** (Kotlin-BFF): de burger logt in via Keycloak, maar de uitgaande calls naar de
  ZGW-bronnen dragen een **apart service-JWT** (`IdTokenGenerator`) — een applicatie-token dat
  voor élke burger hetzelfde is. De burger-BSN gaat mee als **queryfilter**
  (`rol__betrokkeneIdentificatie__natuurlijkPersoon__inpBsn=…`), niet als geverifieerde claim.
  De bron kan het verschil tussen "portaal vraagt namens burger A" en "portaal vraagt namens
  burger B" niet zien.
- **Open Inwoner** (Django): architectonisch het tegenovergestelde (server-rendered monoliet
  i.p.v. SPA+BFF), maar auth-technisch identiek — dezelfde filterstring, letterlijk, in Python
  in plaats van Kotlin. De applicatie injecteert de BSN als rol/betrokkene-filter in de
  uitgaande query; de bron vertrouwt het brede applicatie-credential.
- **IKO** (aggregatielaag): connectoren per bron met encrypted config — host, **statische
  tokens**, mTLS. Wederom: één credential per bron dat alle burgers dekt.

De autorisatie ("zie alleen je eigen data") is in alle gevallen netjes geïmplementeerd — geen
van de portalen vertrouwt een client-meegegeven identiteit — maar hij wordt afgedwongen op de
**verkeerde plek**: in de aanroepende applicatie, niet bij de bron. De bron zelf serveert aan
het applicatie-token álles.

## De security-risico's

1. **Eén credential = alle burgers.** Compromitteer het portaal, de BFF of de aggregatielaag,
   en je hebt de volledige dataset van alle burgers bij alle aangesloten bronnen. Er is geen
   defense-in-depth: de laatste (en enige) verdedigingslinie is de filter-discipline van de
   applicatiecode.
2. **Autorisatie als string-discipline.** De veiligheid hangt af van het consequent meesturen
   van één queryparameter. Eén vergeten filter, één bug in een nieuwe endpoint-integratie, één
   copy-paste zonder de filterregel — en de bron levert gewoon. Het onderzoek laat zien dat
   deze filterlogica minstens vier keer onafhankelijk is geherimplementeerd (NL Portal, Open
   Inwoner, KISS, IKO): vier plekken waar dezelfde fout gemaakt kan worden.
3. **Audit-blindheid bij de bron.** De bron logt hooguit "het portaal vroeg data op" — niet
   wélke burger erachter zat. De verwerkingsverantwoordelijke kan niet reconstrueren wie
   wanneer welke burgerdata heeft ingezien, precies waar de AVG dat wél vraagt.
4. **Transitief vertrouwen stapelt.** Portaal vertrouwt BFF, BFF vertrouwt aggregatielaag,
   aggregatielaag vertrouwt bron — elke laag heeft brede credentials naar de volgende. Elke
   extra laag vergroot het aanvalsoppervlak in plaats van het te verkleinen.

## De performance-beperkingen

1. **Alles trechtert door de middenlaag.** Elke burger-request loopt door de BFF/aggregator,
   die server-side moet fan-outen naar de bronnen. De middenlaag wordt het schaal- én
   beschikbaarheidsknelpunt van de hele keten: valt hij om, dan is álles weg.
2. **Sequentiële autorisatie-ketens.** Omdat de bron niet zelf autoriseert, moet de applicatie
   het vooraf doen: eerst rollen ophalen, dan pas de zaak (NL Portal gooit 401 ná een
   rollen-GET; Open Inwoner stapelt er zichtbaarheidsregels op). Dat is een verplichte extra
   roundtrip per record — een N+1-patroon dat inherent is aan autoriseren-op-afstand.
3. **Herhaalde bouw- en beheerkosten.** Dezelfde drie problemen (per-burger-filtering,
   cross-API-aggregatie, compatibiliteits-shims) zijn in vier codebases in drie talen opnieuw
   opgelost. Elke nieuwe kanaal-app begint weer bij nul, want de intelligentie zit in de
   middenlaag in plaats van in het stelsel.

# 2. Waar we al heen bewegen — en wat dat nog niet oplost

## De interactielaag met aansluitprofielen

Binnen VNG Realisatie ligt een voorstel om tussen kanaal (MijnOmgeving, KCC, notificaties) en
systeem (ZGW, Objects, OpenKlant, …) een **interactielaag** te standaardiseren:
Interactieservices-API's per burgerdienst (MijnZaken, MijnTaken, MijnAgenda, MijnBerichten —
vergelijkbaar met de specs in [`apis/rest/`](../apis/rest/) in dit lab), elk met een
functioneel informatiemodel, en **aansluitprofielen** die vastleggen hoe een bron op zo'n
service aansluit.

Dit is winst, en dit lab onderschrijft het: burger-gerichte API-vormen zijn nodig (bronnen
spreken vandaag geen burger-vocabulaire), en standaardisatie van die vormen voorkomt dat elke
kanaal-app zijn eigen vertaling bouwt — precies de herhaalde investering die §1 blootlegt.

Maar het voorstel laat de **plaats van uitvoering** open, en dat is waar het huidige model
stilzwijgend mee kan liften: als de interactielaag een centraal draaiende component wordt die
via aansluitprofielen met applicatie-tokens naar de bronnen praat, dan zijn alle risico's uit
§1 niet opgelost maar gestandaardiseerd. Je houdt een tussenlaag/aggregatiepunt waar alle
burgerdata samenkomt — nu met een stempel erop. De stelling van dit document: standaardiseer
de interactie-API's en infomodellen **als contract**, en maak het aansluitprofiel zó dat een
bron het ook **zelf** kan implementeren — dan is de middenlaag een tijdelijke uitvoerder van
het contract, geen permanent architectuuronderdeel (zie §4).

## Federatief Toegangsverlenen (AuthZEN): waarom ja/nee niet schaalt

Parallel loopt de verkenning **Federatief Toegangsverlenen**, gebaseerd op OpenID
**AuthZEN**: een gestandaardiseerde policy-decision-API waarbij een resource-server per
verzoek aan een PDP vraagt "mag subject S actie A doen op resource R?" en een ja/nee
terugkrijgt.

Voor wat het is — een besluit over een **bekende, individuele resource** — is dat een prima
model: "mag deze medewerker dit document openen", "mag deze gemachtigde deze zaak inzien".
Maar voor het federated ophalen van burgerdata is het fundamenteel de verkeerde vraagvorm,
want daar is de vraag niet *"mag ik bij resource R?"* maar *"**welke** resources zijn er
voor déze burger?"*:

1. **Je moet R al kennen.** Een ja/nee-PDP veronderstelt dat de kandidaat-resources al
   geënumereerd zijn. Maar om te enumereren moet iémand eerst met een breed credential de
   ongefilterde lijst bij de bron ophalen — waarmee je het applicatie-token-model uit §1 door
   de achterdeur weer binnenhaalt.
2. **N+1 op autorisatie.** "Toon mijn zaken" wordt: haal N kandidaten op, stel N
   PDP-vragen. Voor lijstweergaven — de kern van elke MijnOmgeving — is dat per definitie
   trager dan één gefilterde query, en het wordt erger naarmate de burger meer data heeft.
3. **De policy hoort de query te vórmen, niet te vetoën.** Wat federated retrieval nodig
   heeft is autorisatie die zich vertaalt naar een **filter aan de bron**: "geef alles waar
   deze geverifieerde burger betrokkene van is." Dat kan op twee manieren — de policy
   compileren naar een queryfilter (partial evaluation), of veel eenvoudiger: de identiteit
   als geverifieerde claim in het token meesturen en de bron zelf laten filteren. Dit lab
   kiest het tweede (zie §3); AuthZEN doet geen van beide.

Conclusie: Federatief Toegangsverlenen is complementair (voor besluit-op-één-resource en voor
fijnmazige machtigingsvragen), maar het is niet het mechanisme waarmee een burger federatief
zijn eigen data ophaalt. Wie het daarvoor inzet, bouwt de enumeratie — en dus het brede
applicatie-token — opnieuw in.

# 3. Wat mist: direct bij de bron, met de burger als autorisatiegrond

De holy grail is dat de autorisatievraag en de dataquery **samenvallen**: de burger logt één
keer in met DigiD, en elke bron beantwoordt de vraag "wat heb ik hier?" rechtstreeks, op
gezag van een token dat cryptografisch aan die burger gebonden is. Geen middenlaag die alles
ziet, geen applicatie-token dat alles kan, geen filter-discipline die het verschil maakt
tussen veilig en datalek.

Hoe de calls dan lopen, per sessie:

1. **Discovery** — de client haalt `GET /.well-known/federated-resources` op
   ([spec](../apis/rest/discovery/next.yaml), [schema](../schemas/discovery/v0.0.1.json)) en
   weet per service (taken, zaken, producten, …) welk systeem hem bedient. Publiek en
   identiteitsagnostisch, naar analogie van RFC 8414. Dit beantwoordt de vraag die AuthZEN
   niet kan stellen: *welke bronnen bestaan er überhaupt voor mij om te bevragen?*
2. **Eén login** — Authorization Code + PKCE bij de autorisatieserver (DigiD of simulatie).
   Eén keer inloggen, niet per bron.
3. **Per bron een smal token** — de client wisselt zijn login-token in voor een
   audience-restricted token per bron (RFC 8693 token exchange, `resource=` uit het
   manifest). Dit is het missende scharnier: vandaag ligt de audience statisch vast per
   geregistreerde client, waardoor elke bron vooraf ingericht moet zijn. Met token exchange
   bepaalt de _client_ welke bronnen hij aanspreekt, puur op basis van het manifest.
4. **Direct naar de bron** — de browser roept elke bron rechtstreeks aan; de bron verifieert
   zelf het token (JWKS, issuer, audience) en dwingt record-level autorisatie af: de
   BSN-claim uit het token ís het filter. Een geldig token van burger A dat data van burger B
   opvraagt, krijgt `403 RecordNietGemachtigd` (zie het pattern). Geen enkele partij ziet het
   complete plaatje.

Waarom dit de risico's en remmen uit §1 wegneemt: het gestolen-credential-scenario krimpt van
"alle burgers, alle bronnen" naar "één burger, één bron, kort geldig"; de autorisatie is geen
string-discipline meer maar een cryptografische vergelijking bij de bron; de bron kan
eindelijk per burger auditloggen; en de lijst-query is meteen de geautoriseerde query — geen
N+1, geen verplichte middenlaag in het pad.

**En we zijn dichterbij dan het lijkt.** Dit is geen paper-architectuur: het prototype in
`burgerportaal-iko/` (aparte repo) heeft de kern al live
geverifieerd — twee onafhankelijk geregistreerde publieke clients, volledige Authorization
Code + PKCE-flows, audience-restricted tokens, record-level enforcement met de
gestandaardiseerde 403, een strikte CORS-allowlist voor directe browseraanroepen, en een
werkend discovery-manifest waar de testflow álle URL's uit opzoekt
(`burgerportaal-iko/federated-test.sh`, curl-only reproductie). De bouwstenen zijn bestaande,
uitontwikkelde standaarden (OAuth2, PKCE, JWKS, RFC 8693) en bestaande software (Keycloak,
`jose`) — wat rest is vooral afspraken maken, geen onderzoek. Wat nog wél echte
engineering vraagt: dynamische token exchange, DPoP/sender-constrained tokens (RFC 9449) en
toegangslogging bij de bron (zie de roadmap in §5).

# 4. De rol van de aggregatielaag: van hub naar adapter naar gewoon-een-bron

Vrijwel geen enkele bestaande bron kan vandaag stap 4 waarmaken. De aggregatielaag is daarom
niet het eindbeeld, maar wél het realistische migratiepad — in drie gedaantes, waarbij de
frontend het verschil nooit ziet:

- **Nu (hub).** Alles loopt door de aggregatielaag; één M2M-credential werkt overal.
- **Overgang (federation-adapter).** De aggregatielaag staat vóór bronnen die zelf nog geen
  resource-server zijn: naar de client toe gedraagt hij zich per service als een federated
  bron (eigen manifest-entry, audience-restricted tokens, record-level check); naar binnen
  toe praat hij legacy-M2M. Cruciaal: **per-service entries in het manifest**, niet één
  adapter-entry — dan kan elke bron afzonderlijk migreren.
- **Eindtoestand (gewoon een bron).** Zodra een bron zelf federated-capable is, wijst zijn
  manifest-entry direct naar de bron: één regel wijzigen, nul frontend-werk. Wat overblijft
  van de aggregatielaag is alleen échte aggregatie (bijv. plan + doelen samenvoegen) — en dat
  is dan geen hub meer, maar zelf een smalle bron met een eigen audience naast de andere.

Dit is ook hoe interactielaag-voorstel en eindbeeld samenkomen: het **aansluitprofiel** is
dan niet "hoe praat de middenlaag met jouw systeem" maar "hoe serveer jij — of je adapter —
de MijnZaken-vorm federated-capable". Een aansluitprofiel hoort daarom naast de datamapping
ook een **auth-profiel** te bevatten: burger-gebonden token accepteren, record-level
afdwingen. Elke bron die het profiel zelf implementeert, laat de middenlaag voor die service
verdampen. De frontend en het manifest-formaat zijn de invarianten; bronnen en adapter zijn
de bewegende delen.

# 5. Hoe de API's in dit lab over tijd moeten wijzigen

De mocks krijgen de rol van referentie-implementatie: "zo hoort een leverancier het te doen."
Elke mock wordt een zelfstandige, federated-capable bron. In volgorde van afhankelijkheid:

1. **Token exchange** (RFC 8693) in de autorisatieserver-config + testscript — sluit de
   discovery→auth-lus. Alles hierna bouwt hierop.
2. **Specs**: elke API krijgt een `next`-versie waarin `securitySchemes` van het
   dummy-bearer-token naar echte OIDC/JWT gaat, met verwijzing naar
   `patterns/federated-auth`. Oude versies blijven staan — bestaande consumers breken niet;
   het discovery-manifest wijst per service naar de versie die geldt.
3. **Mocks als resource-servers**: de token-verificatie + record-level-check uit
   `burgerportaal-iko/gateway/federated-auth.js` genericeren tot herbruikbare module en op de
   BSN-scoped mocks zetten, met per-demo-burger verschillende data — zodat de 403-enforcement
   per bron toetsbaar is, niet alleen bij de adapter.
4. **Frontend-PKCE**: de MijnOverheid-demo verliest zijn hardcoded token; login → per-service
   token via exchange → direct bevragen. Vanaf hier is de demo end-to-end het eindbeeld.
5. **De migratie-demo**: één service live van adapter naar directe bron omzetten door alléén
   de manifest-entry te wijzigen, terwijl de app blijft werken. Dat ene moment demonstreert
   de hele architectuur.
6. **Daarna de dure eisen**: fijnmazige scopes per service (`taken:lezen` — klein), en
   DPoP/sender-constrained tokens (RFC 9449) + toegangslogging bij de bron (echte
   engineering-investering, geen configuratie).

# 6. Versiebeleid

Het manifest-contract blijft minimaal en stabiel (`service`, `baseUrl`, `specUrl`, `label`);
hoe te authenticeren staat canoniek in de `securitySchemes` van de spec achter `specUrl` en
wordt niet in het manifest gedupliceerd. Alle evolutie zit in wáár entries naartoe wijzen en
welke spec-versie erachter hangt. Auth-evolutie per API loopt via nieuwe spec-versies
(`next` → semver), nooit via breaking changes in bestaande versies.

# Openstaande vragen

- Hoe verhoudt dit zich precies tot de scope van **Federatief Toegangsverlenen**? De analyse
  in §2 is gemaakt op de AuthZEN-vraagvorm; toetsen bij de betrokkenen of de verkenning ook
  query-vormende autorisatie (of token-gebaseerde record-level enforcement) beoogt.
- Is er een bestaande VNG/Logius-werkgroep rond burger-scoped autorisatie op ZGW-API's
  (buiten FSC's organisatie-tot-organisatie-scope)? Niet gevonden in eerder onderzoek —
  navragen voordat dit als "nieuw" wordt gepositioneerd.
- Hoe verhoudt token exchange zich tot de toekomstige eIDAS 2.0-wallet-flows? De
  anti-centralisatiefilosofie is dezelfde, maar eIDAS specificeert dit mechanisme niet voor
  operationele API's — dit blijft een eigen synthese.
- Moet het discovery-manifest een eigen standaardisatievoorstel worden richting Common Ground
  (issue #43), los van de auth-pattern?
