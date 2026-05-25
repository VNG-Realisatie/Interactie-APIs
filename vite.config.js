import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createReadStream } from "fs";
import { extname, resolve } from "path";
import { exec } from "child_process";

const DEFAULT_DEV_PORT = 31837;

function getEnvInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function logServerUrl() {
  return {
    name: "log-server-url",
    configureServer(server) {
      server.httpServer?.on("listening", () => {
        const address = server.httpServer.address();
        const url = `http://localhost:${address.port}`;
        console.log("");
        console.log("  ╔═══════════════════════════════════════════╗");
        console.log("  ║  🚀 Server running at:                  ║");
        console.log(`  ║     ${url.padEnd(35)}║`);
        console.log("  ╚═══════════════════════════════════════════╝");
        console.log("");
      });
    },
  };
}

function watchApiFiles() {
  return {
    name: "watch-api-files",
    configureServer(server) {
      server.watcher.add([
        "apis/**/*.yaml",
        "apis/**/*.yml",
        "schemas/**/*.json",
        "patterns/**/*.yaml",
        "patterns/**/*.yml",
        "docs/**/*.md",
        "services/**/*.md",
      ]);
      server.watcher.on("change", (file) => {
        if (
          file.includes("/apis/") ||
          file.includes("/schemas/") ||
          file.includes("/patterns/") ||
          file.includes("/docs/") ||
          file.includes("/services/")
        ) {
          if (file.endsWith("portal-data.json") || file.endsWith(".portal-cache.json")) return; // prevent loop
          console.log(`\n📝 Bestand gewijzigd: ${file}. Data opnieuw genereren...`);
          exec("node scripts/generate-portal-data.js", (err, stdout, stderr) => {
            if (err) {
              console.error("Fout bij genereren:", stderr);
            } else {
              console.log("🔄 Data bijgewerkt. Pagina verversen...");
              server.ws.send({ type: "full-reload" });
            }
          });
        }
      });
    },
  };
}

function serveYamlAsUtf8() {
  return {
    name: "serve-yaml-as-utf8",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.match(/\.(ya?ml)(\?|$)/)) {
          res.setHeader("Content-Type", "text/yaml; charset=utf-8");
        }
        next();
      });
    },
  };
}

function serveMijnServicesDemo() {
  const demoRoot = resolve("mijnservices-demo-app");
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".txt": "text/plain; charset=utf-8",
  };

  return {
    name: "serve-mijnservices-demo",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
        if (pathname === "/demo") {
          res.statusCode = 302;
          res.setHeader("Location", "/demo/");
          res.end();
          return;
        }
        if (!pathname.startsWith("/demo/")) {
          next();
          return;
        }

        const relPath = decodeURIComponent(pathname.slice("/demo/".length)) || "index.html";
        const filePath = resolve(demoRoot, relPath);
        if (!filePath.startsWith(demoRoot)) {
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }

        const stream = createReadStream(filePath);
        stream.on("error", next);
        res.setHeader("Content-Type", contentTypes[extname(filePath)] ?? "application/octet-stream");
        stream.pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), logServerUrl(), watchApiFiles(), serveYamlAsUtf8(), serveMijnServicesDemo()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({}),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: getEnvInt("VITE_PORT", DEFAULT_DEV_PORT),
    strictPort: true,
    allowedHosts: ["host.docker.internal"],
    fs: {
      strict: false,
      allow: ["."],
    },
  },
});
