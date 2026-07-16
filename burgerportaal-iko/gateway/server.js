import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import { Issuer, custom } from 'openid-client';
import { registerFederatedRoutes } from './federated-auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend. Reflecteert de aanvragende origin zodat naast het
// burgerportaal (5180) ook een los draaiende MijnOverheid-frontend de
// mock-compatibele facade kan aanroepen.
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Session setup. saveUninitialized: false is belangrijk: anders maakt elke
// niet-ingelogde API-call een nieuwe sessie + cookie aan, die de cookie van
// een lopende login-redirect kan overschrijven.
app.use(session({
  secret: process.env.SESSION_SECRET || 'burgerportaal-session-secret-very-secure',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 3600000 // 1 hour
  }
}));

// Configuration
const MOCK_AUTH = process.env.MOCK_AUTH !== 'false'; // default is true
const MOCK_BSN = process.env.MOCK_BSN || '569312863';
const IKO_URL = process.env.IKO_URL || 'http://localhost:8080';
const KEYCLOAK_INTERNAL_URL = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8082/auth/realms/valtimo';
const KEYCLOAK_EXTERNAL_URL = process.env.KEYCLOAK_EXTERNAL_URL || 'http://localhost:8082/auth/realms/valtimo';
const CLIENT_ID = process.env.IKO_CLIENT_ID || 'iko';
const CLIENT_SECRET = process.env.IKO_CLIENT_SECRET || 'ThisIsNotASecret';

// Helper to get active Keycloak URL (external for redirect, internal for server-to-server)
function getKeycloakUrl(type = 'internal') {
  return type === 'internal' ? KEYCLOAK_INTERNAL_URL : KEYCLOAK_EXTERNAL_URL;
}

// Memory cache for IKO service access token
let cachedServiceToken = null;
let tokenExpiry = 0;

// Get OIDC Client for user login
let oidcClient = null;
async function getOidcClient() {
  if (oidcClient) return oidcClient;
  if (MOCK_AUTH) return null;

  try {
    const issuer = new Issuer({
      issuer: getKeycloakUrl('external'),
      authorization_endpoint: `${getKeycloakUrl('external')}/protocol/openid-connect/auth`,
      token_endpoint: `${getKeycloakUrl('internal')}/protocol/openid-connect/token`,
      userinfo_endpoint: `${getKeycloakUrl('internal')}/protocol/openid-connect/userinfo`,
      jwks_uri: `${getKeycloakUrl('internal')}/protocol/openid-connect/certs`,
    });

    oidcClient = new issuer.Client({
      client_id: 'burgerportaal-gateway',
      client_secret: 'BurgerSecret',
      redirect_uris: [process.env.CALLBACK_URL || 'http://localhost:3000/api/auth/callback'],
      response_types: ['code'],
    });
    return oidcClient;
  } catch (err) {
    console.error('Failed to initialize OIDC issuer manually:', err.message);
    return null;
  }
}

// Get Server-to-Server M2M token for calling IKO
async function getIkoServiceToken() {
  // If token is cached and not close to expiring, return it
  if (cachedServiceToken && Date.now() < tokenExpiry - 10000) {
    return cachedServiceToken;
  }

  const tokenUrl = `${getKeycloakUrl('internal')}/protocol/openid-connect/token`;
  console.log(`Fetching new IKO service token from ${tokenUrl}...`);

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', CLIENT_ID);
  params.append('client_secret', CLIENT_SECRET);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch IKO service token: ${response.status} ${errText}`);
  }

  const data = await response.json();
  cachedServiceToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  return cachedServiceToken;
}

// Authentication middleware
app.use((req, res, next) => {
  if (MOCK_AUTH) {
    req.session.bsn = MOCK_BSN;
    req.session.user = {
      name: 'J. (Jeroen) de Vries',
      email: 'jeroen@example.test',
      bsn: MOCK_BSN
    };
  }
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.bsn) {
    return res.status(401).json({ error: 'Niet geauthenticeerd. Log in via DigiD.' });
  }
  next();
}

// Authentication endpoints
app.get('/api/auth/session', (req, res) => {
  res.json({
    authenticated: !!req.session.bsn,
    user: req.session.user || null
  });
});

app.get('/api/auth/login', async (req, res) => {
  if (MOCK_AUTH) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:31837'}/`);
  }

  const client = await getOidcClient();
  if (!client) {
    return res.status(500).send('OIDC client initialization failed');
  }

  const state = Math.random().toString(36).substring(7);
  req.session.oidc_state = state;
  console.log(`[auth] login: sid=${req.session.id} state=${state}`);

  const authorizationUrl = client.authorizationUrl({
    scope: 'openid profile',
    state: state,
  });

  res.redirect(authorizationUrl);
});

app.get('/api/auth/callback', async (req, res) => {
  if (MOCK_AUTH) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:31837'}/`);
  }

  const client = await getOidcClient();
  if (!client) {
    return res.status(500).send('OIDC client initialization failed');
  }

  const params = client.callbackParams(req);
  console.log(`[auth] callback: sid=${req.session.id} sessionState=${req.session.oidc_state} paramState=${params.state}`);
  try {
    const tokenSet = await client.callback(
      process.env.CALLBACK_URL || 'http://localhost:3000/api/auth/callback',
      params,
      { state: req.session.oidc_state }
    );
    const claims = tokenSet.claims();

    // Extract BSN from claims (in Dutch Gov context, usually 'bsn' or 'national_id' or 'sub' maps to BSN)
    const bsn = claims.bsn || claims.national_id || claims.sub;

    req.session.bsn = bsn;
    req.session.user = {
      name: claims.name || claims.preferred_username || 'Burger',
      email: claims.email || '',
      bsn: bsn
    };
    // Nodig om bij uitloggen ook de Keycloak-SSO-sessie te kunnen beëindigen
    req.session.id_token = tokenSet.id_token;

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:31837'}/`);
  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

app.get('/api/auth/logout', (req, res) => {
  const idToken = req.session.id_token;
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    if (idToken && !MOCK_AUTH) {
      // Beëindig ook de Keycloak-SSO-sessie, anders logt een volgende
      // "Inloggen met DigiD" stilzwijgend weer in als dezelfde burger en kun
      // je nooit van user wisselen.
      const endSession = `${getKeycloakUrl('external')}/protocol/openid-connect/logout` +
        `?id_token_hint=${encodeURIComponent(idToken)}` +
        `&post_logout_redirect_uri=${encodeURIComponent(process.env.FRONTEND_URL || 'http://localhost:31837')}`;
      return res.redirect(endSession);
    }
    res.json({ success: true });
  });
});

// Fetch an Aggregated Data Profile from IKO
async function fetchAdp(bsn, profileName, containerParam = null) {
  const token = await getIkoServiceToken();

  let url = `${IKO_URL}/aggregated-data-profiles/${profileName}?id=${bsn}`;
  if (containerParam) {
    url += `&containerParam=${encodeURIComponent(containerParam)}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`IKO error: ${errText}`);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

// Proxy helper for IKO calls
async function proxyToIko(req, res, profileName, containerParam = null) {
  try {
    const bsn = req.session.bsn;
    if (!bsn) return res.status(401).json({ error: 'BSN missing from session' });

    console.log(`BFF Gateway proxying: [${req.method}] ${req.url} --> ADP ${profileName}`);
    const data = await fetchAdp(bsn, profileName, containerParam);
    return res.json(data);
  } catch (err) {
    console.error(`Proxy to IKO failed:`, err);
    return res.status(err.status || 500).json({ error: `Internal BFF error: ${err.message}` });
  }
}

// De echte Open Klant wijkt op twee punten af van de mock-vorm: de expand-key
// heet digitaleAdressen i.p.v. digitale_adressen en volledigeNaam zit genest
// in partijIdentificatie i.p.v. op topniveau. Normaliseer naar de mock-vorm.
function shapePartij(d) {
  return {
    ...d,
    volledigeNaam: d.volledigeNaam ?? d.partijIdentificatie?.volledigeNaam,
    _expand: d._expand && {
      ...d._expand,
      digitale_adressen: d._expand.digitale_adressen ?? d._expand.digitaleAdressen
    }
  };
}

// Gateway endpoints matching MijnOverheid portal tabs
app.get('/api/portaal/gegevens', requireAuth, async (req, res) => {
  try {
    const data = await fetchAdp(req.session.bsn, 'gegevens');
    return res.json(shapePartij(data));
  } catch (err) {
    console.error('Proxy to IKO failed:', err);
    return res.status(err.status || 500).json({ error: `Internal BFF error: ${err.message}` });
  }
});

app.get('/api/portaal/taken', requireAuth, (req, res) => {
  proxyToIko(req, res, 'taken');
});

app.get('/api/portaal/producten', requireAuth, (req, res) => {
  proxyToIko(req, res, 'producten');
});

app.get('/api/portaal/plan', requireAuth, (req, res) => {
  proxyToIko(req, res, 'plan');
});

app.get('/api/portaal/agenda', requireAuth, (req, res) => {
  proxyToIko(req, res, 'agenda');
});

app.get('/api/portaal/gesprekken', requireAuth, (req, res) => {
  proxyToIko(req, res, 'gesprekken');
});

app.get('/api/portaal/zaken', requireAuth, (req, res) => {
  proxyToIko(req, res, 'zaken');
});

app.get('/api/portaal/zaken/:uuid', requireAuth, (req, res) => {
  // Pass case uuid as containerParam (base64 encoded JSON or string, IKO can parse this)
  const param = Buffer.from(JSON.stringify({ containerId: 'zaak', filters: { uuid: req.params.uuid } })).toString('base64');
  proxyToIko(req, res, 'zaak-detail', param);
});

// ---------------------------------------------------------------------------
// VNG-mock-compatibele facade
//
// Dezelfde paden en response-vormen als de VNG API Lab-mocks, maar gevoed door
// de IKO Aggregated Data Profiles. De ongewijzigde MijnOverheid-frontend kan
// via haar per-API endpoint-overrides op deze gateway wijzen (bijv.
// http://localhost:3000/apis/rest/taken/next) zodat al het dataverkeer via IKO
// loopt in plaats van rechtstreeks naar de mocks.
//
// Elke route staat er met én zonder het /apis/rest/{api}/{versie}-prefix: de
// frontend-override vervangt dat prefix door de ingestelde base-URL, dus beide
// vormen komen voor. De MijnOverheid-demo kent geen DigiD-flow; zonder sessie
// valt de facade daarom terug op de demo-BSN.

function facadeBsn(req) {
  return req.session.bsn || MOCK_BSN;
}

async function serveAdp(req, res, profileName, { containerParam = null, shape = (d) => d } = {}) {
  try {
    console.log(`Facade: [${req.method}] ${req.originalUrl} --> ADP ${profileName}`);
    const data = await fetchAdp(facadeBsn(req), profileName, containerParam);
    return res.json(shape(data));
  } catch (err) {
    console.error(`Facade ADP '${profileName}' failed:`, err.message);
    return res.status(err.status || 500).json({ error: err.message });
  }
}

app.post(['/apis/rest/taken/:version/context/zoek', '/context/zoek'], (req, res) =>
  serveAdp(req, res, 'taken'));

app.post(['/apis/rest/producten/:version/producten/zoek', '/producten/zoek'], (req, res) =>
  serveAdp(req, res, 'producten'));

// De plan-ADP aggregeert plan + doelen in één object; de mock-API biedt ze als
// twee losse lijst-resources aan, dus hier splitsen we ze weer.
app.get(['/apis/rest/openplan-plannen/:version/plan', '/plan'], (req, res) =>
  serveAdp(req, res, 'plan', {
    shape: (d) => ({ count: d.plan ? 1 : 0, results: d.plan ? [d.plan] : [] })
  }));

app.get(['/apis/rest/openplan-plannen/:version/doel', '/doel'], (req, res) =>
  serveAdp(req, res, 'plan', {
    shape: (d) => ({ count: (d.doelen || []).length, results: d.doelen || [] })
  }));

app.post(['/apis/rest/agenda/:version/afspraken/opvragen', '/afspraken/opvragen'], (req, res) =>
  serveAdp(req, res, 'agenda'));

app.get(['/apis/rest/gesprekken/:version/gesprekken', '/gesprekken'], (req, res) =>
  serveAdp(req, res, 'gesprekken'));

app.post(['/apis/rest/zaken/:version/zaken/zoek', '/zaken/zoek'], (req, res) =>
  serveAdp(req, res, 'zaken'));

app.get(['/apis/rest/zaken/:version/zaken/:uuid', '/zaken/:uuid'], (req, res) =>
  serveAdp(req, res, 'zaak-detail', {
    containerParam: Buffer.from(JSON.stringify({ containerId: 'zaak', filters: { uuid: req.params.uuid } })).toString('base64')
  }));

app.get(['/apis/rest/openklant-klantinteracties/:version/partijen/:uuid', '/partijen/:uuid'], (req, res) =>
  serveAdp(req, res, 'gegevens', { shape: shapePartij }));

// ---------------------------------------------------------------------------
// Federated-auth resource-server-routes (patterns/federated-auth/next.yaml)
//
// In tegenstelling tot alles hierboven: geen sessie, geen cookie, geen
// gedeeld M2M-credential dat de client hoeft te kennen. Elke geregistreerde
// client (mijnoverheid-frontend, nl-portal-frontend, ...) haalt zelf een
// Bearer-token op bij Keycloak (Authorization Code + PKCE) en spreekt deze
// gateway daarmee rechtstreeks aan. IKO's eigen M2M-credential
// (getIkoServiceToken hierboven) blijft bestaan, maar is nu puur intern:
// de externe client weet er niets van en heeft er niets aan.
registerFederatedRoutes(app, { fetchAdp, shapePartij });

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', mockAuth: MOCK_AUTH, mockBsn: MOCK_BSN });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BFF Gateway running at http://0.0.0.0:${PORT}`);
  console.log(`🔒 Mock Authentication is ${MOCK_AUTH ? 'ENABLED (BSN: ' + MOCK_BSN + ')' : 'DISABLED'}`);
});
