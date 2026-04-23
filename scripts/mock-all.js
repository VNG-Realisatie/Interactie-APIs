const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const fg = require("fast-glob");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

const yaml = require("js-yaml");
const fs = require("fs");

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

async function startMocks() {
  const app = express();
  const mainPort = 4010;

  // CORS headers toestaan voor lokale ontwikkeling (Vite op :3000)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Accept",
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

  const prismPorts = [];

  specFiles.forEach((spec, index) => {
    const prismPort = 5000 + index;
    prismPorts.push(prismPort);

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
      ["mock", spec, "-p", prismPort.toString(), "-h", "127.0.0.1"],
      {
        stdio: ["ignore", "ignore", "inherit"],
      },
    );

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
        target: `http://127.0.0.1:${prismPort}`,
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
  await Promise.all(prismPorts.map((p) => waitForPort(p)));
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
    console.log("  ➜  Dev server: http://localhost:3000");
    console.log("");
    console.log("  Gebruik CTRL+C om te stoppen.\n");
  });

  // Zorg dat bij CTRL+C alle sub-processen ook stoppen (best effort)
  process.on("SIGINT", () => {
    process.exit();
  });
}

startMocks().catch((err) => {
  console.error("❌ Kritieke fout in Mock Gateway:", err);
  process.exit(1);
});
