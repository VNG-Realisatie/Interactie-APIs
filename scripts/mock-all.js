const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const fg = require("fast-glob");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");
const fs = require("fs");
const yaml = require("js-yaml");

function openApiPathToRegex(serverUrl, openApiPath) {
  let basePath = "";
  if (serverUrl) {
    try {
      if (serverUrl.startsWith("http://") || serverUrl.startsWith("https://")) {
        basePath = new URL(serverUrl).pathname;
      } else {
        basePath = serverUrl;
      }
    } catch (_) {
      basePath = serverUrl;
    }
  }
  if (basePath.endsWith("/")) {
    basePath = basePath.slice(0, -1);
  }
  const fullPath = (basePath + openApiPath).replace(/\/+/g, "/");
  
  // Escape regex special chars except {param} placeholders
  let escaped = fullPath.replace(/[-\/\\^$*+?.()|[\]]/g, '\\$&');
  escaped = escaped.replace(/\{[^}]+\}/g, "[^/]+");
  
  const regexStr = "^" + escaped + "/?$";
  return new RegExp(regexStr);
}

// Versie-voorkeur voor het discovery-manifest: 'next' (actief in ontwikkeling)
// wint altijd, anders de hoogste semver (v1.6.0 > v0.7.0), anders alfabetisch
// laatste als fallback (bijv. bij een niet-semver naam als 'mijnoverheid-demo').
function compareVersions(a, b) {
  if (a === b) return 0;
  if (a === "next") return -1;
  if (b === "next") return 1;
  const pa = a.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  const pb = b.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (pa && pb) {
    for (let i = 1; i <= 3; i++) {
      const diff = Number(pb[i]) - Number(pa[i]);
      if (diff !== 0) return diff;
    }
    return 0;
  }
  if (pa) return -1;
  if (pb) return 1;
  return a < b ? 1 : -1;
}

// Bouwt het discovery-manifest (schemas/discovery/v0.0.1.json) uit dezelfde
// specFiles-lijst die de mocks al mount — geen losse, met de hand bijgehouden
// registratie. Eén entry per service (de mapnaam onder apis/rest/), met de
// primaire versie conform compareVersions. Minimaal kerncontract: service/
// baseUrl/specUrl/label — hoe te authenticeren staat al in de securityScheme
// van de spec achter specUrl (voor deze mocks: een statische
// `Authorization: Bearer dummy-token`, zie defaultMockHeaders in de
// frontend), dus dat dupliceert dit manifest bewust niet.
function buildDiscoveryManifest(specFiles, mainPort) {
  const byService = new Map();
  for (const spec of specFiles) {
    const service = path.basename(path.dirname(spec));
    const version = path.basename(spec, path.extname(spec));
    const apiPath = "/" + spec.replace(path.extname(spec), "");
    let title = service;
    try {
      const doc = yaml.load(fs.readFileSync(spec, "utf8"));
      if (doc && doc.info && doc.info.title) title = doc.info.title;
    } catch (_) {
      // Titel blijft de servicenaam als de spec niet leesbaar is.
    }
    const list = byService.get(service) || [];
    list.push({ version, apiPath, title });
    byService.set(service, list);
  }

  const resources = [...byService.entries()].map(([service, versions]) => {
    versions.sort((x, y) => compareVersions(x.version, y.version));
    const primary = versions[0];
    return {
      service,
      baseUrl: `http://localhost:${mainPort}${primary.apiPath}`,
      specUrl: `/docs/bundled/apis_rest_${service}_${primary.version}.yaml`,
      label: `${primary.title} (mock, ${primary.version})`,
    };
  });
  resources.sort((a, b) => a.service.localeCompare(b.service));

  return {
    gemeente: "VNG API Lab (mocks)",
    generatedAt: new Date().toISOString(),
    resources,
  };
}

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

  specFiles = (await fg(specGlob))
    // apis/rest/discovery beschrijft het .well-known/federated-resources-
    // endpoint zelf (hieronder hard gecodeerd) — geen mockbare backend-
    // domain, dus niet meemounten als Prism-instance of manifest-entry.
    .filter((f) => !f.startsWith("apis/rest/discovery/"))
    .sort();
  if (specFiles.length === 0) {
    console.error(`❌ Geen OpenAPI specificaties gevonden voor glob: ${specGlob}`);
    process.exit(1);
  }

  console.log(`\n🔍 Gevonden API specificaties: ${specFiles.length} (${specGlob})`);

  const prismPorts = await allocatePorts(specFiles.length, {
    basePort: prismBasePort,
    host: prismHost,
  });

  const specMappings = [];

  for (let index = 0; index < specFiles.length; index++) {
    ready[index] = false;
    const spec = specFiles[index];
    const prismPort = prismPorts[index];
    const apiPath = "/" + spec.replace(path.extname(spec), "");

    let patterns = [];
    try {
      const content = fs.readFileSync(spec, "utf8");
      const doc = yaml.load(content);
      if (doc && doc.paths) {
        const serverUrls = doc.servers && doc.servers.length > 0
          ? doc.servers.map(s => s.url)
          : [""];
        for (const openApiPath of Object.keys(doc.paths)) {
          for (const serverUrl of serverUrls) {
            let basePath = "";
            if (serverUrl) {
              try {
                if (serverUrl.startsWith("http://") || serverUrl.startsWith("https://")) {
                  basePath = new URL(serverUrl).pathname;
                } else {
                  basePath = serverUrl;
                }
              } catch (_) {
                basePath = serverUrl;
              }
            }
            if (basePath.endsWith("/")) {
              basePath = basePath.slice(0, -1);
            }
            basePath = basePath.replace(/\/+/g, "/");

            patterns.push({
              regex: openApiPathToRegex(serverUrl, openApiPath),
              basePath
            });
          }
        }
      }
    } catch (err) {
      console.error(`⚠️ Fout bij parsen van spec ${spec} voor fallback routing:`, err.message);
    }

    specMappings.push({
      index,
      spec,
      prismPort,
      patterns
    });

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

  // Fallback middleware for direct routing without prefix
  app.use((req, res, next) => {
    // Skip health check and root path logging
    if (req.path !== "/health" && req.path !== "/") {
      console.log(`[Mock Fallback] Checking request path: ${req.path}`);
    }
    let matchedPattern = null;
    const mapping = specMappings.find(m => {
      matchedPattern = m.patterns.find(({ regex }) => {
        const matches = regex.test(req.path);
        if (matches) {
          console.log(`[Mock Fallback] Path ${req.path} matched regex ${regex} for spec ${m.spec}`);
        }
        return matches;
      });
      return Boolean(matchedPattern);
    });

    if (mapping) {
      if (!ready[mapping.index]) {
        console.log(`[Mock Fallback] Spec ${mapping.spec} is not ready yet.`);
        return res
          .status(503)
          .set("Retry-After", "5")
          .json({ error: `Mock voor ${mapping.spec} start nog op, probeer zo opnieuw.` });
      }
      
      console.log(`[Mock Fallback] Proxying request to ${mapping.spec} on port ${mapping.prismPort}`);
      // Prism serveert de paden zonder het server-basePath uit de spec, dus
      // strip dat van het inkomende pad (bijv. /v1/context/zoek -> /context/zoek).
      const basePath = matchedPattern.basePath;
      const proxy = createProxyMiddleware({
        target: `http://${prismHost}:${mapping.prismPort}`,
        pathRewrite: basePath ? { [`^${basePath}`]: "" } : undefined,
        logLevel: "error",
        onError: (_err, _req, res) => {
          if (!res.headersSent) {
            res
              .status(502)
              .set("Retry-After", "5")
              .json({ error: `Mock voor ${mapping.spec} is tijdelijk niet bereikbaar.` });
          }
        },
      });
      return proxy(req, res, next);
    }

    next();
  });

  // Discovery-manifest (zie apis/rest/discovery/next.yaml,
  // schemas/discovery/v0.0.1.json) — dezelfde vorm als burgerportaal-iko's
  // /.well-known/federated-resources, maar dan voor de kale mocks. Publiek,
  // onbeveiligd, elke origin toegestaan (de globale CORS-middleware boven
  // in dit bestand dekt dat al af).
  const discoveryManifest = buildDiscoveryManifest(specFiles, mainPort);
  app.get("/.well-known/federated-resources", (_req, res) => {
    res.json(discoveryManifest);
  });

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
