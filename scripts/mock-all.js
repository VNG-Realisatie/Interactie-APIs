const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const fg = require("fast-glob");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

const yaml = require("js-yaml");
const fs = require("fs");

// Load local dev env vars for Node scripts
try {
  const dotenv = require("dotenv");
  const envPath = path.resolve(__dirname, "../.env.development");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
} catch (_) {}

function waitForPort(port, host = "127.0.0.1", timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.connect(port, host);
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${host}:${port}`));
        } else {
          setTimeout(tryConnect, 250);
        }
      });
    };
    tryConnect();
  });
}

function getEnvInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isPortAvailable(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => {
        server.close(() => resolve(true));
      })
      .listen(port, host);
  });
}

async function allocatePorts(count, { basePort, host }) {
  const ports = [];
  let port = basePort;
  while (ports.length < count) {
    // Skip already selected ports (shouldn't happen, but safe)
    if (ports.includes(port)) {
      port += 1;
      continue;
    }

    // Only allocate if actually available
    // (avoids EADDRINUSE when a dev stack is already running)
    // eslint-disable-next-line no-await-in-loop
    const ok = await isPortAvailable(port, host);
    if (ok) {
      ports.push(port);
    }
    port += 1;
  }
  return ports;
}

async function startMocks() {
  const app = express();
  const mainPort = getEnvInt("MOCK_GATEWAY_PORT", 4010);
  const prismHost = process.env.PRISM_HOST || "127.0.0.1";
  const prismBasePort = getEnvInt("PRISM_BASE_PORT", 5000);

  // CORS headers toestaan voor lokale ontwikkeling (Vite op :{VITE_PORT})
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Accept, Prefer, prefer",
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // Zoek alle OpenAPI bestanden (flat file structure: apis/rest/demo/v1.0.0.yaml)
  const specFiles = await fg("apis/**/*.{yaml,yml}");

  if (specFiles.length === 0) {
    console.error("❌ Geen OpenAPI specificaties gevonden in apis/");
    process.exit(1);
  }

  console.log(`\n🔍 Gevonden API specificaties: ${specFiles.length}`);

  const prismPorts = await allocatePorts(specFiles.length, {
    basePort: prismBasePort,
    host: prismHost,
  });

  const prisms = [];

  specFiles.forEach((spec, index) => {
    const prismPort = prismPorts[index];

    // Forceer het base path gebaseerd op het bestandspad (bijv. /apis/rest/resources/v0.0.1)
    // Dit zorgt voor consistentie met de UI die dit pad ook dynamisch berekent.
    const apiPath = "/" + spec.replace(path.extname(spec), "");

    console.log(
      `🚀 Start Prism voor ${spec} op localhost:${prismPort} (gateway path: ${apiPath})`,
    );

    // Start Prism in de achtergrond. Direct binair pad i.p.v. `npx` zodat het in
    // minimalistische containers (alpine) zonder shell-resolution werkt.
    // Stderr wordt doorgezet zodat eventuele Prism-fouten in de logs belanden.
    const prism = spawn(
      "./node_modules/.bin/prism",
      ["mock", spec, "-p", prismPort.toString(), "-h", prismHost],
      {
        stdio: ["ignore", "ignore", "inherit"],
      },
    );
    prisms.push(prism);

    prism.on("error", (err) => {
      console.error(`❌ Fout bij starten Prism voor ${spec}:`, err);
    });

    prism.on("exit", (code, signal) => {
      if (code !== 0 && signal !== "SIGTERM") {
        console.error(`❌ Prism voor ${spec} gestopt (code=${code}, signal=${signal})`);
      }
    });

    // Configureer de proxy van Gateway -> Prism
    app.use(
      apiPath,
      createProxyMiddleware({
        target: `http://${prismHost}:${prismPort}`,
        pathRewrite: {
          [`^${apiPath}`]: "", // Strip de base path voordat het naar Prism gaat
        },
        logLevel: "error",
      }),
    );
  });

  // Wacht tot alle Prism processen luisteren voordat we de gateway openstellen.
  // Zonder deze gate krijg je "proxy error" responses tijdens de cold-start op Fly.io.
  console.log("⏳ Wachten tot alle Prism mocks luisteren...");
  await Promise.all(prismPorts.map((p) => waitForPort(p, prismHost)));
  console.log("✅ Alle Prism mocks zijn klaar.");

  // Start de gateway (0.0.0.0 zodat het ook werkt in containers/Fly)
  app.listen(mainPort, "0.0.0.0", () => {
    console.log("");
    console.log("  ╔═══════════════════════════════════════════════╗");
    console.log("  ║  🎭 Mock Gateway draait op:                 ║");
    console.log(`  ║     http://localhost:${mainPort.toString().padEnd(33)}║`);
    console.log("  ╚═══════════════════════════════════════════════╝");
    console.log("");
    console.log("  Beschikbare API endpoints:");
    specFiles.forEach((spec) => {
      const endpoint = spec.replace(path.extname(spec), "");
      console.log(`    • http://localhost:${mainPort}/${endpoint}/`);
    });
    console.log("");
    const devPort = getEnvInt("VITE_PORT", 3000);
    console.log(`  ➜  Dev server: http://localhost:${devPort}`);
    console.log("");
    console.log("  Gebruik CTRL+C om te stoppen.\n");
  });

  // Zorg dat bij CTRL+C alle sub-processen ook stoppen (best effort)
  const shutdown = () => {
    prisms.forEach((child) => {
      try {
        child.kill("SIGTERM");
      } catch (_) {}
    });
    process.exit();
  };
  process.on("SIGINT", () => {
    shutdown();
  });
  process.on("SIGTERM", () => {
    shutdown();
  });
}

startMocks().catch((err) => {
  console.error("❌ Kritieke fout in Mock Gateway:", err);
  process.exit(1);
});
