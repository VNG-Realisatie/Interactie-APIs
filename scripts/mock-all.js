const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const fg = require("fast-glob");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");
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
    if (ports.includes(port)) {
      port += 1;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const ok = await isPortAvailable(port, host);
    if (ok) {
      ports.push(port);
    }
    port += 1;
  }
  return ports;
}

function listenGateway(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`✅ Gateway luistert op 0.0.0.0:${port}`);
      resolve(server);
    });
    server.on("error", reject);
  });
}

async function startMocks() {
  const app = express();
  const mainPort = getEnvInt("MOCK_GATEWAY_PORT", 4010);
  const prismHost = process.env.PRISM_HOST || "127.0.0.1";
  const prismBasePort = getEnvInt("PRISM_BASE_PORT", 5000);
  const specGlob = process.env.MOCK_SPEC_GLOB || "apis/**/*.{yaml,yml}";
  const readyTimeoutMs = getEnvInt("MOCK_READY_TIMEOUT_MS", 60000);

  let specFiles = [];
  const ready = [];
  const prisms = [];

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

  app.get("/health", (_req, res) => {
    const readyCount = ready.filter(Boolean).length;
    res.status(200).json({
      ok: true,
      gateway: `0.0.0.0:${mainPort}`,
      mocks: { ready: readyCount, total: specFiles.length },
    });
  });

  app.get("/", (_req, res) => {
    res.json({
      service: "vng-interactie-mocks",
      health: "/health",
      mocks: { ready: ready.filter(Boolean).length, total: specFiles.length },
    });
  });

  // Fly-proxy moet poort 4010 meteen kunnen bereiken — vóór glob/Prism-start.
  await listenGateway(app, mainPort);

  specFiles = (await fg(specGlob)).sort();
  if (specFiles.length === 0) {
    console.error(`❌ Geen OpenAPI specificaties gevonden voor glob: ${specGlob}`);
    process.exit(1);
  }

  console.log(`\n🔍 Gevonden API specificaties: ${specFiles.length} (${specGlob})`);

  const prismPorts = await allocatePorts(specFiles.length, {
    basePort: prismBasePort,
    host: prismHost,
  });

  for (let index = 0; index < specFiles.length; index++) {
    ready[index] = false;
    const spec = specFiles[index];
    const prismPort = prismPorts[index];
    const apiPath = "/" + spec.replace(path.extname(spec), "");

    app.use(
      apiPath,
      (req, res, next) => {
        if (!ready[index]) {
          res
            .status(503)
            .set("Retry-After", "5")
            .json({ error: `Mock voor ${spec} start nog op, probeer zo opnieuw.` });
          return;
        }
        next();
      },
      createProxyMiddleware({
        target: `http://${prismHost}:${prismPort}`,
        pathRewrite: {
          [`^${apiPath}`]: "",
        },
        logLevel: "error",
        onError: (_err, _req, res) => {
          if (!res.headersSent) {
            res
              .status(502)
              .set("Retry-After", "5")
              .json({ error: `Mock voor ${spec} is tijdelijk niet bereikbaar.` });
          }
        },
      }),
    );
  }

  console.log("");
  console.log("  ╔═══════════════════════════════════════════════╗");
  console.log("  ║  🎭 Mock Gateway endpoints:                 ║");
  console.log(`  ║     http://0.0.0.0:${mainPort.toString().padEnd(33)}║`);
  console.log("  ╚═══════════════════════════════════════════════╝");
  console.log("");
  specFiles.forEach((spec) => {
    const endpoint = spec.replace(path.extname(spec), "");
    console.log(`    • http://0.0.0.0:${mainPort}/${endpoint}/`);
  });
  console.log("");

  (async () => {
    for (let index = 0; index < specFiles.length; index++) {
      const spec = specFiles[index];
      const prismPort = prismPorts[index];
      const apiPath = "/" + spec.replace(path.extname(spec), "");

      console.log(
        `🚀 Start Prism voor ${spec} op ${prismHost}:${prismPort} (gateway path: ${apiPath})`,
      );

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
        ready[index] = false;
        if (code !== 0 && signal !== "SIGTERM") {
          console.error(`❌ Prism voor ${spec} gestopt (code=${code}, signal=${signal})`);
        }
      });

      try {
        // eslint-disable-next-line no-await-in-loop
        await waitForPort(prismPort, prismHost, readyTimeoutMs);
        ready[index] = true;
        console.log(`✅ Prism voor ${spec} luistert op poort ${prismPort}.`);
      } catch (err) {
        console.error(
          `⚠️  Prism voor ${spec} (poort ${prismPort}) start niet binnen ${readyTimeoutMs}ms — overgeslagen.`,
          err.message || err,
        );
      }
    }

    const readyCount = ready.filter(Boolean).length;
    console.log(`✅ ${readyCount}/${specFiles.length} Prism mocks zijn klaar.`);
  })();

  const shutdown = () => {
    prisms.forEach((child) => {
      try {
        child.kill("SIGTERM");
      } catch (_) {}
    });
    process.exit();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startMocks().catch((err) => {
  console.error("❌ Kritieke fout in Mock Gateway:", err);
  process.exit(1);
});
