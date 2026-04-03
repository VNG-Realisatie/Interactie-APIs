import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { exec } from "child_process";

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
      ]);
      server.watcher.on("change", (file) => {
        if (
          file.includes("/apis/") ||
          file.includes("/schemas/") ||
          file.includes("/patterns/") ||
          file.includes("/docs/")
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

export default defineConfig({
  plugins: [react(), logServerUrl(), watchApiFiles()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": JSON.stringify({}),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    fs: {
      strict: false,
      allow: ["."],
    },
  },
});
