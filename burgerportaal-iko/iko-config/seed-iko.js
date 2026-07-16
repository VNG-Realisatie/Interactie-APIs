import pg from 'pg';
import crypto from 'crypto';

const { Client } = pg;

const CRYPTO_KEY = process.env.IKO_CRYPTO_KEY || 'dGhpcy1pcy1hLXNlY3JldC1rZXktMzItYnl0ZXMtcGE=';
const DB_URL = process.env.DATABASE_URL || 'postgres://iko-admin:secret@127.0.0.1:5432/iko-db';

function encrypt(plainText, base64Key) {
  const key = Buffer.from(base64Key, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, tag]);
  return combined.toString('base64');
}

async function main() {
  console.log('Connecting to database...');
  const client = new Client({ connectionString: DB_URL });
  
  // Retry connection until DB is up
  let connected = false;
  for (let i = 0; i < 30; i++) {
    try {
      await client.connect();
      connected = true;
      break;
    } catch (err) {
      console.log('Database not ready yet, retrying in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!connected) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  console.log('Connected successfully!');

  // Wait until IKO's Flyway migrations have run and created the tables
  let tablesExist = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await client.query("SELECT to_regclass('public.aggregated_data_profile')");
      if (res.rows[0].to_regclass) {
        tablesExist = true;
        break;
      }
      console.log('Waiting for Flyway migrations to create tables...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.log('Error checking tables, retrying...', err.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!tablesExist) {
    console.error('Timeout waiting for Flyway migrations');
    await client.end();
    process.exit(1);
  }

  console.log('Flyway tables exist. Seeding data...');

  try {
    // Clear old data
    await client.query('TRUNCATE TABLE relation CASCADE;');
    await client.query('TRUNCATE TABLE aggregated_data_profile CASCADE;');
    await client.query('TRUNCATE TABLE connector_endpoint_role CASCADE;');
    await client.query('TRUNCATE TABLE connector_instance_config CASCADE;');
    await client.query('TRUNCATE TABLE connector_endpoint CASCADE;');
    await client.query('TRUNCATE TABLE connector_instance CASCADE;');
    await client.query('TRUNCATE TABLE connector CASCADE;');

    // 1. Insert Generic REST Connector
    const connectorId = 'c1c1c1c1-1111-1111-1111-111111111111';
    const connectorCode = `- route:
    id: "direct:iko:connector:generic-rest"
    errorHandler:
        noErrorHandler: { }
    from:
        uri: "direct:iko:connector:generic-rest"
        steps:
            - removeHeaders: "CamelHttp*"
            - toD:
                uri: "language:groovy:\\"rest-openapi:\${variable.configProperties.specificationUri}#\${variable.operation}?host=\${variable.configProperties.host}\\""
            - unmarshal:
                json: { }`;

    await client.query(
      `INSERT INTO connector (id, name, tag, connector_code, version, is_active, status)
       VALUES ($1, $2, $3, $4, '1.0.0', TRUE, 'FINAL')`,
      [connectorId, 'Generic REST Connector', 'generic-rest', connectorCode]
    );

    // 1b. Token REST Connector: als generic-rest, maar stuurt een statische
    // Authorization-header uit de instance-config mee (voor bronnen zoals
    // Open Klant die TokenAuth vereisen).
    const tokenConnectorId = 'c1c1c1c1-2222-2222-2222-222222222222';
    const tokenConnectorCode = `- route:
    id: "direct:iko:connector:token-rest"
    errorHandler:
        noErrorHandler: { }
    from:
        uri: "direct:iko:connector:token-rest"
        steps:
            - removeHeaders: "CamelHttp*"
            - setHeader:
                name: "Authorization"
                simple: "\${variable.configProperties[authorization]}"
            - setHeader:
                name: "Content-Type"
                constant: "application/json"
            - setHeader:
                name: "Accept"
                constant: "application/json"
            - choice:
                when:
                    - simple: "\${variable.endpointTransformResult} != null"
                      steps:
                          - setBody:
                              simple: "\${variable.endpointTransformResult}"
                          - marshal:
                              json: { }
            - toD:
                uri: "language:groovy:\\"rest-openapi:\${variable.configProperties.specificationUri}#\${variable.operation}?host=\${variable.configProperties.host}\\""
            - unmarshal:
                json: { }`;

    await client.query(
      `INSERT INTO connector (id, name, tag, connector_code, version, is_active, status)
       VALUES ($1, $2, $3, $4, '1.0.0', TRUE, 'FINAL')`,
      [tokenConnectorId, 'Token REST Connector', 'token-rest', tokenConnectorCode]
    );

    // Helper to create instance. Standaard hangt elke instance aan de
    // token-rest connector met het Bearer-token dat de VNG-mocks vereisen;
    // bronnen met eigen auth (zoals Open Klant) geven hun eigen token mee.
    async function createInstance(id, name, tag, specUri, hostUrl, connId = tokenConnectorId, extraConfig = { authorization: 'Bearer dummy-token' }) {
      await client.query(
        `INSERT INTO connector_instance (id, name, connector_id, tag)
         VALUES ($1, $2, $3, $4)`,
        [id, name, connId, tag]
      );

      const encSpecUri = encrypt(specUri, CRYPTO_KEY);
      const encHostUrl = encrypt(hostUrl, CRYPTO_KEY);

      await client.query(
        `INSERT INTO connector_instance_config (connector_instance_id, key, value)
         VALUES ($1, 'specificationUri', $2), ($1, 'host', $3)`,
        [id, encSpecUri, encHostUrl]
      );

      for (const [key, value] of Object.entries(extraConfig)) {
        await client.query(
          `INSERT INTO connector_instance_config (connector_instance_id, key, value)
           VALUES ($1, $2, $3)`,
          [id, key, encrypt(value, CRYPTO_KEY)]
        );
      }
    }

    // Helper to create endpoint
    async function createEndpoint(id, name, operation, connId = tokenConnectorId) {
      await client.query(
        `INSERT INTO connector_endpoint (id, name, connector_id, operation)
         VALUES ($1, $2, $3, $4)`,
        [id, name, connId, operation]
      );
    }

    // Instances
    const instOpenKlantId = 'd1d1d1d1-1111-1111-1111-111111111111';
    const instTakenId = 'd1d1d1d1-2222-2222-2222-222222222222';
    const instProductenId = 'd1d1d1d1-3333-3333-3333-333333333333';
    const instPlanId = 'd1d1d1d1-4444-4444-4444-444444444444';
    const instAgendaId = 'd1d1d1d1-5555-5555-5555-555555555555';
    const instGesprekkenId = 'd1d1d1d1-6666-6666-6666-666666666666';
    const instZakenId = 'd1d1d1d1-7777-7777-7777-777777777777';

    console.log('Seeding connector instances...');
    await createInstance(
      instOpenKlantId, 'OpenKlant Instance', 'open-klant',
      'file:/openapi-specs/rest/openklant-klantinteracties/mijnoverheid-demo.yaml', 'http://open-klant:8000',
      tokenConnectorId,
      // TokenAuth uit scratchpad/iko-src/imports/open-klanten/database/1-setup-klanten.sql
      { authorization: 'Token 5bf819967d9fdd00d326ce20774768b4182285e5' }
    );
    await createInstance(instTakenId, 'Taken Instance', 'taken', 'file:/openapi-specs/rest/taken/next.yaml', 'http://lab-mocks:4010');
    await createInstance(instProductenId, 'Producten Instance', 'producten', 'file:/openapi-specs/rest/producten/next.yaml', 'http://lab-mocks:4010');
    await createInstance(instPlanId, 'Plan Instance', 'plan', 'file:/openapi-specs/rest/openplan-plannen/next.yaml', 'http://lab-mocks:4010');
    await createInstance(instAgendaId, 'Agenda Instance', 'agenda', 'file:/openapi-specs/rest/agenda/next.yaml', 'http://lab-mocks:4010');
    await createInstance(instGesprekkenId, 'Gesprekken Instance', 'gesprekken', 'file:/openapi-specs/rest/gesprekken/next.yaml', 'http://lab-mocks:4010');
    await createInstance(instZakenId, 'Zaken Instance', 'zaken', 'file:/openapi-specs/rest/zaken/next.yaml', 'http://lab-mocks:4010');

    // Endpoints
    const epOpenKlantRetrieve = 'e1e1e1e1-1111-1111-1111-111111111111';
    const epTakenSearch = 'e1e1e1e1-2222-2222-2222-222222222222';
    const epProductenSearch = 'e1e1e1e1-3333-3333-3333-333333333333';
    const epPlanList = 'e1e1e1e1-4444-4444-4444-444444444444';
    const epDoelList = 'e1e1e1e1-4444-5555-5555-555555555555';
    const epAgendaSearch = 'e1e1e1e1-5555-5555-5555-555555555555';
    const epGesprekkenList = 'e1e1e1e1-6666-6666-6666-666666666666';
    const epZakenSearch = 'e1e1e1e1-7777-7777-7777-777777777777';
    const epZakenRetrieve = 'e1e1e1e1-7777-8888-8888-888888888888';

    console.log('Seeding connector endpoints...');
    await createEndpoint(epOpenKlantRetrieve, 'Partijen List', 'partijenList', tokenConnectorId);
    await createEndpoint(epTakenSearch, 'Taken Zoek', 'zoekContext');
    await createEndpoint(epProductenSearch, 'Producten Zoek', 'zoekProducten');
    await createEndpoint(epPlanList, 'Plan List', 'plan_list');
    await createEndpoint(epDoelList, 'Doel List', 'doel_list');
    await createEndpoint(epAgendaSearch, 'Agenda Zoek', 'zoekAfspraken');
    await createEndpoint(epGesprekkenList, 'Gesprekken List', 'gesprekken_list');
    await createEndpoint(epZakenSearch, 'Zaken Zoek', 'zoekZaken');
    await createEndpoint(epZakenRetrieve, 'Zaak Retrieve', 'retrieveZaak');

    // Helper to create ADP
    async function createADP(id, name, instanceId, endpointId, endpointTransform, transform) {
      await client.query(
        `INSERT INTO aggregated_data_profile (
          id, name, connector_instance_id, connector_endpoint_id,
          endpoint_transform, transform, roles, cache_enabled, cache_ttl,
          version, is_active, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'ROLE_AGGREGATED_DATA_PROFILE', FALSE, 0, '1.0.0', TRUE, 'FINAL')`,
        [id, name, instanceId, endpointId, endpointTransform, transform]
      );
    }

    // Profiles
    const adpGegevensId = 'f1f1f1f1-1111-1111-1111-111111111111';
    const adpTakenId = 'f1f1f1f1-2222-2222-2222-222222222222';
    const adpProductenId = 'f1f1f1f1-3333-3333-3333-333333333333';
    const adpPlanId = 'f1f1f1f1-4444-4444-4444-444444444444';
    const adpAgendaId = 'f1f1f1f1-5555-5555-5555-555555555555';
    const adpGesprekkenId = 'f1f1f1f1-6666-6666-6666-666666666666';
    const adpZakenId = 'f1f1f1f1-7777-7777-7777-777777777777';
    const adpZaakDetailId = 'f1f1f1f1-7777-8888-8888-888888888888';

    console.log('Seeding aggregated data profiles...');
    
    // 1. gegevens (OpenKlant partijenList, gefilterd op de BSN van de
    // ingelogde burger). .idParam is de ?id= die de gateway uit de sessie
    // meegeeft — hiermee is dit profiel user-scoped.
    await createADP(
      adpGegevensId, 'gegevens', instOpenKlantId, epOpenKlantRetrieve,
      '{"partijIdentificator__objectId": .idParam, "expand": "digitaleAdressen"}',
      '.results[0]'
    );

    // 2. taken
    await createADP(
      adpTakenId, 'taken', instTakenId, epTakenSearch,
      '{"klantId": "a8f3c1d2-7e44-4b1a-9c0f-123456789abc", "include": ["taken"]}',
      '.'
    );

    // 3. producten
    await createADP(
      adpProductenId, 'producten', instProductenId, epProductenSearch,
      '{"klantId": "a8f3c1d2-7e44-4b1a-9c0f-123456789abc"}',
      '.'
    );

    // 4. plan (Main profile fetches plan_list, has relation for doelen)
    // Na de relation-merge (PairAggregator) is de body {left: <plan_list
    // response>, right: {doelen: [...]}}; de result-transform pakt beide.
    await createADP(
      adpPlanId, 'plan', instPlanId, epPlanList,
      '.',
      '{"plan": .left.results[0], "doelen": .right.doelen}'
    );

    // Seeding Relation for plan goals
    const relationPlanDoelenId = 'f1f1f1f1-4444-5555-6666-666666666666';
    await client.query(
      `INSERT INTO relation (
        id, aggregated_data_profile_id, property_name, source_id,
        connector_instance_id, connector_endpoint_id, source_to_endpoint_mapping,
        transform, cache_enabled, cache_ttl
       )
       VALUES ($1, $2, 'doelen', NULL, $3, $4, '.', '.results', FALSE, 0)`,
      [relationPlanDoelenId, adpPlanId, instPlanId, epDoelList]
    );

    // 5. agenda
    await createADP(
      adpAgendaId, 'agenda', instAgendaId, epAgendaSearch,
      '{"identificaties": [{"type": "email", "waarde": "jeroen@example.test"}]}',
      '.'
    );

    // 6. gesprekken
    await createADP(
      adpGesprekkenId, 'gesprekken', instGesprekkenId, epGesprekkenList,
      '.',
      '.'
    );

    // 7. zaken
    await createADP(
      adpZakenId, 'zaken', instZakenId, epZakenSearch,
      '{"klantId": "a8f3c1d2-7e44-4b1a-9c0f-123456789abc"}',
      '.'
    );

    // 8. zaak-detail
    // De gateway stuurt containerParam = base64({containerId: "zaak",
    // filters: {uuid}}); IKO zet dat om naar .filterParams.zaak in de
    // endpoint-transform-context.
    await createADP(
      adpZaakDetailId, 'zaak-detail', instZakenId, epZakenRetrieve,
      '{"uuid": .filterParams.zaak.uuid}',
      '.'
    );

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await client.end();
  }
}

main();
