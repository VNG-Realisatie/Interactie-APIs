const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fg = require('fast-glob');
const { spawn } = require('child_process');
const path = require('path');

const yaml = require('js-yaml');
const fs = require('fs');

async function startMocks() {
  const app = express();
  const mainPort = 4010;

  // CORS headers toestaan voor lokale ontwikkeling (Vite op :3000)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Zoek alle OpenAPI bestanden (flat file structure: apis/rest/demo/v1.0.0.yaml)
  const specFiles = await fg('apis/**/*.{yaml,yml}');

  if (specFiles.length === 0) {
    console.error('❌ Geen OpenAPI specificaties gevonden in apis/');
    process.exit(1);
  }

  console.log(`\n🔍 Gevonden API specificaties: ${specFiles.length}`);

  specFiles.forEach((spec, index) => {
    const prismPort = 5000 + index;

    // Forceer het base path gebaseerd op het bestandspad (bijv. /apis/rest/resources/v0.0.1)
    // Dit zorgt voor consistentie met de UI die dit pad ook dynamisch berekent.
    const apiPath = '/' + spec.replace(path.extname(spec), '');

    console.log(`🚀 Start Prism voor ${spec} op localhost:${prismPort} (gateway path: ${apiPath})`);

    // Start Prism in de achtergrond
    const prism = spawn('npx', ['prism', 'mock', spec, '-p', prismPort.toString(), '-h', '127.0.0.1'], {
      stdio: 'ignore', // Muteer output om terminal schoon te houden
      shell: true
    });

    prism.on('error', (err) => {
      console.error(`❌ Fout bij starten Prism voor ${spec}:`, err);
    });

    // Configureer de proxy van Gateway -> Prism
    app.use(apiPath, createProxyMiddleware({
      target: `http://127.0.0.1:${prismPort}`,
      pathRewrite: {
        [`^${apiPath}`]: '', // Strip de base path voordat het naar Prism gaat
      },
      logLevel: 'error'
    }));
  });

  // Start de gateway
  app.listen(mainPort, '127.0.0.1', () => {
    console.log(`\n✅ Unified Mock Gateway draait op http://localhost:${mainPort}`);
    console.log(`\nBeschikbare API endpoints:`);
    specFiles.forEach(spec => {
      const endpoint = spec.replace(path.extname(spec), '');
      console.log(`- http://localhost:${mainPort}/${endpoint}/`);
    });
    console.log('\nGebruik CTRL+C om de gateway en alle mock servers te stoppen.\n');
  });

  // Zorg dat bij CTRL+C alle sub-processen ook stoppen (best effort)
  process.on('SIGINT', () => {
    process.exit();
  });
}

startMocks().catch(err => {
  console.error('❌ Kritieke fout in Mock Gateway:', err);
  process.exit(1);
});
