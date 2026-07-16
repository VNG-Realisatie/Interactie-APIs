// Resource-server-laag die het `federated-auth`-pattern
// (../../patterns/federated-auth/next.yaml) toepast op IKO.
//
// Verschil met de rest van server.js: dáár is de gateway zelf een OIDC
// *client* (haalt één sessie-cookie op, bewaart tokens server-side, praat
// met IKO via één gedeeld M2M-servicecredential). Hier is de gateway een
// OAuth2 *resource server*: hij accepteert een kaal Bearer-token van
// WELKE geregistreerde client dan ook (meerdere "plekken" — verschillende
// frontends, elk hun eigen client_id), verifieert het zelf tegen
// Keycloaks JWKS, en leidt de burger-identiteit (bsn) uitsluitend af uit
// de geverifieerde token-claim — nooit uit client-input. Vandaar dat de
// routes hieronder geen `id`/`bsn`-parameter accepteren: er is domweg
// geen manier voor een client om data van iemand anders op te vragen.
//
// Nog niet gedekt (zie patterns/federated-auth/next.yaml voor het volledige
// plaatje): DPoP/sender-constrained tokens (vereist dat de browser zelf een
// sleutelpaar genereert en elk verzoek ondertekent — echt frontend-werk),
// resource-indicators conform de letterlijke RFC 8707-wire-syntax (Keycloak
// benadert dit met een audience-mapper, wat hetzelfde effect heeft maar niet
// hetzelfde protocol is), en toegangslogging.

import { createRemoteJWKSet, jwtVerify } from 'jose';

const KEYCLOAK_EXTERNAL_URL = process.env.KEYCLOAK_EXTERNAL_URL || 'http://localhost:8082/auth/realms/valtimo';
const KEYCLOAK_INTERNAL_URL = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8082/auth/realms/valtimo';
// Moet overeenkomen met de 'included.custom.audience' in de
// Federated Audience Mapper op elke federated-auth-client in realm.json.
const FEDERATED_AUDIENCE = process.env.FEDERATED_AUDIENCE || 'iko-federated-gateway';

// JWKS ophalen van het interne (container-netwerk) Keycloak-adres, maar
// tokens valideren tegen de externe issuer-URL — Keycloak zet die URL in
// de `iss`-claim van elk token, ongeacht via welk netwerkpad het is opgehaald.
const JWKS = createRemoteJWKSet(new URL(`${KEYCLOAK_INTERNAL_URL}/protocol/openid-connect/certs`));

async function verifyFederatedToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      type: 'about:blank',
      title: 'Niet geauthenticeerd',
      status: 401,
      detail: 'Verwacht een Authorization: Bearer <token> header.',
    });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: KEYCLOAK_EXTERNAL_URL,
      audience: FEDERATED_AUDIENCE,
    });
    if (!payload.bsn) {
      return res.status(401).json({
        type: 'about:blank',
        title: 'Token mist bsn-claim',
        status: 401,
        detail: 'Dit token is geldig maar bevat geen bsn-claim; deze client is niet ingericht voor burger-identificatie.',
      });
    }
    req.federatedBsn = payload.bsn;
    // 'azp' (authorized party) toont WELKE geregistreerde client dit
    // verzoek deed — de "plek" waar de client vandaan komt.
    req.federatedClientId = payload.azp || payload.client_id || 'onbekend';
    next();
  } catch (err) {
    console.error('[federated-auth] tokenverificatie mislukt:', err.message);
    return res.status(401).json({
      type: 'about:blank',
      title: 'Ongeldig token',
      status: 401,
      detail: `Tokenverificatie mislukt: ${err.message}`,
    });
  }
}

// Standaard 403-response uit patterns/federated-auth/next.yaml#/responses/RecordNietGemachtigd:
// wél geauthenticeerd, niet gemachtigd voor déze specifieke resource.
function recordNietGemachtigd(res, detail) {
  return res.status(403).json({
    type: 'about:blank',
    title: 'Record niet gemachtigd',
    status: 403,
    detail,
  });
}

// Discovery-manifest (apis/rest/discovery/next.yaml, schemas/discovery/v0.0.1.json):
// vertelt een client WELK SYSTEEM elke SERVICE bedient (Mijn taken, Mijn
// zaken, Mijn producten/vergunningen), vóórdat hij ook maar één token hoeft
// aan te vragen. Bewust onbeveiligd (RFC 8414-achtig, geen persoonsgegevens)
// en bewust géén rol-/relevantie-filtering — zie de spec voor de motivatie.
//
// Kerncontract is minimaal (service/baseUrl/specUrl/label) — hoe te
// authenticeren staat al in de securityScheme van de spec achter specUrl.
// `audience` hieronder is GEEN onderdeel van dat generieke kerncontract; het
// is een expliciete IKO-eigen extensie (het schema verbiedt extra velden
// niet) omdat een standaard OAS-securityScheme geen audience-concept kent.
// Een generieke client mag dit veld negeren; federated-test.sh gebruikt het
// om te verifiëren dat een verkregen token de juiste audience draagt.
//
// Vandaag delen alle drie services dezelfde resource-server (audience/
// baseUrl = IKO), simpelweg omdat IKO ze vandaag alledrie aggregeert — niet
// omdat het manifest dat aanneemt. Zou 'zaken' morgen door een apart
// Zaaksysteem-A bediend worden (met een eigen audience), dan verandert
// alleen die ene entry; het manifest-format en de client-lookup-logica
// ("zoek de entry met service=zaken") blijven ongewijzigd.
function federatedResourceRegistry() {
  const ikoEntry = (service, label, specUrl) => ({
    service,
    baseUrl: `${process.env.GATEWAY_PUBLIC_URL || 'http://localhost:3000'}/api/federated`,
    specUrl,
    label,
    // Niet-generiek, IKO-eigen extraveld — zie toelichting hierboven.
    audience: FEDERATED_AUDIENCE,
  });

  return {
    gemeente: 'Gemeente Voorbeeld (demo)',
    generatedAt: new Date().toISOString(),
    resources: [
      ikoEntry(
        'gegevens',
        'Persoonsgegevens (Open Klant, via IKO)',
        '/docs/bundled/apis_rest_openklant-klantinteracties_mijnoverheid-demo.yaml'
      ),
      ikoEntry(
        'taken',
        'Mijn taken (via IKO)',
        '/docs/bundled/apis_rest_taken_next.yaml'
      ),
      ikoEntry(
        'producten',
        'Mijn producten en vergunningen — o.a. parkeervergunning (via IKO)',
        '/docs/bundled/apis_rest_producten_next.yaml'
      ),
    ],
  };
}

// registerFederatedRoutes(app, { fetchAdp, shapePartij })
// fetchAdp/shapePartij worden meegegeven vanuit server.js zodat deze module
// niets hoeft te weten van hóe IKO precies bereikt wordt (dat blijft intern,
// via IKO's eigen M2M-credential — voor de externe client onzichtbaar en
// irrelevant).
export function registerFederatedRoutes(app, { fetchAdp, shapePartij }) {
  const allowedOrigins = (process.env.FEDERATED_ALLOWED_ORIGINS || 'http://localhost:5180,http://localhost:5181')
    .split(',')
    .map((s) => s.trim());

  // Publiek, onbeveiligd, elke origin toegestaan — zie de spec-description
  // voor de motivatie (vergelijkbaar met .well-known/oauth-authorization-server).
  app.get('/.well-known/federated-resources', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(federatedResourceRegistry());
  });

  // Eigen, strikte CORS voor deze routes — in tegenstelling tot de
  // legacy-facade hieronder in server.js (die reflecteert elke origin).
  app.use('/api/federated', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // "Mijn gegevens" — bsn komt uitsluitend uit het geverifieerde token.
  // Geen enkele client-input bepaalt wiens data wordt opgevraagd, dus er
  // is geen record-mismatch mogelijk: dit endpoint is safe by construction.
  app.get('/api/federated/gegevens', verifyFederatedToken, async (req, res) => {
    try {
      const data = await fetchAdp(req.federatedBsn, 'gegevens');
      return res.json({ ...shapePartij(data), _federatedVia: req.federatedClientId });
    } catch (err) {
      console.error('[federated-auth] gegevens ophalen mislukt:', err);
      return res.status(err.status || 500).json({ error: err.message });
    }
  });

  // "Mijn taken" en "Mijn producten" — zelfde veilig-by-construction-principe
  // als gegevens hierboven: bsn komt uitsluitend uit het token, geen
  // client-supplied identiteit, dus geen manier om andermans lijst op te
  // vragen. Bestaan primair om het discovery-manifest drie ECHTE, werkende
  // domains te laten beschrijven in plaats van één echte en twee fictieve.
  app.get('/api/federated/taken', verifyFederatedToken, async (req, res) => {
    try {
      const data = await fetchAdp(req.federatedBsn, 'taken');
      return res.json({ ...data, _federatedVia: req.federatedClientId });
    } catch (err) {
      console.error('[federated-auth] taken ophalen mislukt:', err);
      return res.status(err.status || 500).json({ error: err.message });
    }
  });

  app.get('/api/federated/producten', verifyFederatedToken, async (req, res) => {
    try {
      const data = await fetchAdp(req.federatedBsn, 'producten');
      return res.json({ producten: data, _federatedVia: req.federatedClientId });
    } catch (err) {
      console.error('[federated-auth] producten ophalen mislukt:', err);
      return res.status(err.status || 500).json({ error: err.message });
    }
  });

  // Test-/demonstratie-endpoint: bestaat UITSLUITEND om de record-level
  // enforcement zichtbaar te maken. Een productie-endpoint zou nooit een
  // client-opgegeven bsn accepteren (zie hierboven) — dit bestaat om te
  // bewijzen dat de vergelijking ook echt afdwingt, niet alleen "toevallig"
  // veilig is omdat er geen invoer voor is.
  app.get('/api/federated/debug/gegevens-als/:bsn', verifyFederatedToken, async (req, res) => {
    if (req.params.bsn !== req.federatedBsn) {
      return recordNietGemachtigd(
        res,
        `Token is geldig voor bsn ${req.federatedBsn}, niet voor de opgevraagde bsn ${req.params.bsn}.`
      );
    }
    try {
      const data = await fetchAdp(req.federatedBsn, 'gegevens');
      return res.json({ ...shapePartij(data), _federatedVia: req.federatedClientId });
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
  });
}
