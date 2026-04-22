const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const yaml = require("js-yaml");
const widdershins = require("widdershins");
const puppeteer = require("puppeteer");
const crypto = require("crypto");
const { marked } = require("marked");
const { toCamelCase } = require("./mim-utils");
const http = require("http");
const { createServer } = require("vite");

const CACHE_VERSION = "2026-04-20-respec-final-v9";

const options = {
  codeSamples: false,
  httpsnippet: false,
  templateCallback: function (nm, opts, data) {
    return data;
  },
  theme: "darkula",
  search: true,
  sample: true,
  discovery: false,
  includes: [],
  shallowSchemas: false,
  tocSummary: true,
  headings: 2,
  yaml: false,
  respec: true,
};

function resolveSchema(ref, baseDir) {
  if (!ref || !ref.includes(".json")) return null;
  try {
    const [filePath, fragment] = ref.split("#");
    const absolutePath = path.resolve(baseDir, filePath);
    const content = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
    if (!fragment) return content;
    const parts = fragment.split("/").filter((p) => p && p !== "#");
    let target = content;
    for (const part of parts) {
      target = target[part];
    }
    return target;
  } catch (e) {
    return null;
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateImvertorTables(schemaName, schema) {
  const meta = schema["x-mim-metadata"] || {};
  const description = escapeHtml(schema.description || meta.Definitie || "");

  let html = `
    <section class="mim-object-section" id="global_class_${schemaName}">
      <h3>${escapeHtml(meta.naam || schemaName)}</h3>
      <table class="imvertor-main-table">
        <tbody>
          <tr><th>Naam</th><td>${escapeHtml(meta.naam || schemaName)}</td></tr>
          <tr><th>Herkomst</th><td>${escapeHtml(meta.Herkomst || "")}</td></tr>
          <tr><th>Definitie</th><td>${description}</td></tr>
          <tr><th>Herkomst definitie</th><td>${escapeHtml(meta["Herkomst definitie"] || "")}</td></tr>
          <tr><th>Toelichting</th><td>${escapeHtml(meta.Toelichting || "")}</td></tr>
        </tbody>
      </table>

      <h4>Overzicht attributen</h4>
      <table class="imvertor-attr-table">
        <thead>
          <tr><th>Attribuutnaam</th><th>Definitie</th><th>Formaat</th><th>Card</th></tr>
        </thead>
        <tbody>
  `;

  const props = schema.properties || {};
  const required = new Set(schema.required || []);

  for (const [propName, propDef] of Object.entries(props)) {
    const pMeta = propDef["x-mim-metadata"] || {};
    const card = required.has(propName) ? "1" : "0..1";
    const typeLabel = escapeHtml(pMeta.type || propDef.format || propDef.type || "string");
    const propDesc = escapeHtml(propDef.description || pMeta.Definitie || "");

    html += `
      <tr>
        <td><strong>${escapeHtml(pMeta.naam || propName)}</strong><br/><small style="color:#666">(${escapeHtml(propName)})</small></td>
        <td>${propDesc}</td>
        <td><code>${typeLabel}</code></td>
        <td>${card}</td>
      </tr>
    `;
  }

  html += `</tbody></table></section>`;
  return html;
}

function generateGegevensdefinitie(spec, baseDir, diagramFile) {
  const schemas = spec.components?.schemas || {};
  let html = `
    <section id="gegevensdefinitie">
      <h2>Gegevensdefinitie</h2>
      <p><b>Deze tekst is normatief.</b></p>

      <div class="imageinfo overview">
        <figure class="uml-diagram">
          ${
            diagramFile
              ? `<img src="images/${diagramFile}" alt="UML Diagram" style="max-width: 100%; border: 1px solid #e2e8f0; border-radius: 8px;">`
              : `<div style="padding: 40px; background: #f8fafc; border: 2px dashed #cbd5e1; text-align: center; border-radius: 12px;">
               <p style="color: #64748b; font-weight: 600;">[UML Conceptueel Informatiemodel]</p>
               <p style="color: #94a3b8; font-size: 0.8em;">Diagram kon niet worden geladen vanuit de portal.</p>
             </div>`
          }
          <figcaption> ‒ Diagram: Conceptueel Informatiemodel</figcaption>
        </figure>
      </div>
  `;

  for (const [name, schema] of Object.entries(schemas)) {
    let fullSchema = schema;
    if (schema.$ref) {
      fullSchema = resolveSchema(schema.$ref, baseDir) || schema;
    }
    if (fullSchema["x-mim-metadata"] || fullSchema.properties) {
      html += generateImvertorTables(name, fullSchema);
    }
  }

  html += "</section>";
  return html;
}

function checkServerReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 404); // 404 is fine, means server is up
    });
    req.on("error", () => resolve(false));
    req.end();
  });
}

async function startViteServer() {
  console.log("🌐 Start tijdelijke Vite server voor screenshots...");
  const vite = await createServer({
    server: { port: 3001 },
    configFile: path.resolve(__dirname, "../vite.config.js"),
  });
  await vite.listen();
  console.log("✅ Tijdelijke Vite server draait op poort 3001");
  return { vite, port: 3001 };
}

async function generateRespec() {
  console.log("🚀 Start genereren van ReSpec bestanden (OAS -> Imvertor Style)...");

  const apisDir = path.join(__dirname, "../apis");
  const outputDir = path.join(__dirname, "../docs/respec");
  const imagesDir = path.join(outputDir, "images");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  const yamlFiles = await fg("**/*.{yaml,yml}", { cwd: apisDir });

  let browser = null;
  let viteServer = null;
  let targetPort = 3000;

  try {
    const isServerRunning = await checkServerReady("http://localhost:3000");
    if (!isServerRunning) {
      const serverInfo = await startViteServer();
      viteServer = serverInfo.vite;
      targetPort = serverInfo.port;
    } else {
      console.log("🌐 Bestaande dev server gevonden op poort 3000.");
    }

    browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  } catch (e) {
    console.error("❌ Kan infrastructuur niet opzetten:", e.message);
  }

  for (const file of yamlFiles) {
    const filePath = path.join(apisDir, file);
    const apiDir = path.dirname(filePath);
    const content = fs.readFileSync(filePath, "utf8");

    try {
      const apiSpec = yaml.load(content);
      const title = apiSpec.info?.title || "API";
      const outputFileName = `${file.replace(/\//g, "_").replace(/\.ya?ml$/, "")}.html`;
      const diagramFileName = `${outputFileName.replace(".html", "")}_diagram.png`;

      // 1. Capture diagram via Portal
      if (browser) {
        try {
          const rawContent = fs.readFileSync(filePath, "utf8");
          const schemaRefMatch = rawContent.match(/schemas\/[^"'\s]+\.json/);

          if (schemaRefMatch) {
            const matchedPath = schemaRefMatch[0];
            const schemaFileRel = matchedPath.substring(matchedPath.indexOf("schemas/"));
            const portalUrl = `http://localhost:${targetPort}/?file=${schemaFileRel}`;

            const page = await browser.newPage();
            console.log(`📸 Proberen diagram te capturen voor ${title}...`);
            console.log(`   URL: ${portalUrl}`);
            await page.setViewport({ width: 1600, height: 1200 });

            try {
              await page.goto(portalUrl, { waitUntil: "networkidle2", timeout: 20000 });
              await new Promise((r) => setTimeout(r, 6000)); // Ruime tijd voor React Flow rendering

              const element = await page.$(".diagram-container");
              if (element) {
                await element.screenshot({ path: path.join(imagesDir, diagramFileName) });
                console.log(`✅ Diagram succesvol opgeslagen.`);
              } else {
                console.warn(`⚠️ Kon .diagram-container niet vinden op de pagina.`);
              }
            } catch (err) {
              console.warn(`⚠️ Time-out of error bij laden portal: ${err.message}`);
            }
            await page.close();
          } else {
            console.log(`ℹ️ Geen schema referentie gevonden in ${file}, diagram overgeslagen.`);
          }
        } catch (e) {
          console.warn(`⚠️ Fout bij screenshot proces: ${e.message}`);
        }
      }

      let markdown = await widdershins.convert(apiSpec, options);
      markdown = markdown.replace(/^---\n[\s\S]*?\n---\n+/, "");
      let technicalHtml = sanitizeHtml(marked.parse(markdown));

      const diagramExists = fs.existsSync(path.join(imagesDir, diagramFileName));
      const gegevensdefinitieHtml = generateGegevensdefinitie(
        apiSpec,
        apiDir,
        diagramExists ? diagramFileName : null,
      );

      const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>${title} | ReSpec</title>
  <script class="remove">
    var respecConfig = {
      specStatus: "WV", specType: "HR", pubDomain: "dk",
      shortName: "${title.toLowerCase().replace(/\s+/g, "-")}",
      publishDate: "${new Date().toISOString().split("T")[0]}",
      publishVersion: "${apiSpec.info?.version || "0.0.1"}",
      previousPublishDate: "2026-04-01",
      previousMaturity: "WV",
      nl_organisationName: "VNG Realisatie",
      license: "cc-by",
      licenses: { "cc-by": { name: "CC-BY", url: "https://creativecommons.org/licenses/by/4.0/", short: "CC-BY" } },
      specStatusText: { nl: { wv: "Werkversie" } },
      specTypeText: { nl: { hr: "Handreiking" } },
      sotdText: { nl: { sotd: "Status", wv: "Dit is een automatisch gegenereerd document." } },
      thisVersion: "https://vng-realisatie.github.io/Interactie-APIs/docs/respec/${outputFileName}",
      latestVersion: "https://vng-realisatie.github.io/Interactie-APIs/docs/respec/${outputFileName}",
      edDraftURI: "https://github.com/VNG-Realisatie/Interactie-APIs",
      editors: [{ name: "VNG Realisatie" }],
      github: "https://github.com/VNG-Realisatie/Interactie-APIs",
    };
  </script>
  <script src="https://gitdocumentatie.logius.nl/publicatie/respec/builds/respec-nlgov.js" class="remove"></script>
  <style>
    .imvertor-main-table, .imvertor-attr-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.95em; }
    .imvertor-main-table th { background: #f3f4f6; text-align: left; padding: 10px; border: 1px solid #ddd; width: 30%; }
    .imvertor-main-table td { padding: 10px; border: 1px solid #ddd; }
    .imvertor-attr-table th { background: #1a56db; color: white; padding: 10px; text-align: left; border: 1px solid #1a56db; }
    .imvertor-attr-table td { padding: 10px; border: 1px solid #ddd; }
    .imvertor-attr-table tr:nth-child(even) { background: #f9fafb; }
    .mim-object-section { margin-top: 50px; }
    .mim-object-section h3 { border-bottom: 2px solid #1a56db; padding-bottom: 8px; color: #1a3a5f; margin-top: 40px; }
  </style>
</head>
<body>
  <section id="abstract"><p>Formele specificatie voor ${title}.</p></section>
  ${gegevensdefinitieHtml}
  <section id="api-referentie"><h2>API Referentie</h2>${technicalHtml}</section>
</body>
</html>`;

      const outputPath = path.join(outputDir, outputFileName);
      fs.writeFileSync(outputPath, html);
      console.log(`✅ ${outputFileName}`);
    } catch (e) {
      console.error(`❌ ${file}:`, e);
    }
  }

  if (browser) await browser.close();
  if (viteServer) {
    await viteServer.close();
    console.log("🛑 Tijdelijke Vite server afgesloten.");
  }
  console.log("🎉 Klaar met ReSpec!");
}

generateRespec().catch(console.error);
