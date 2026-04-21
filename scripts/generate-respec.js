const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const yaml = require("js-yaml");
const widdershins = require("widdershins");
const puppeteer = require("puppeteer");
const crypto = require("crypto");
const { marked } = require("marked");
const CACHE_VERSION = "2026-04-03-respec-html-v3";

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

marked.setOptions({
  gfm: true,
});

function computeHash(content) {
  return crypto
    .createHash("sha256")
    .update(`${CACHE_VERSION}\n${content}`, "utf8")
    .digest("hex")
    .substring(0, 16);
}

function loadCache(cachePath) {
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, "utf8"));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveCache(cachePath, cache) {
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

function isCacheValid(filePath, content, cache) {
  if (!cache[filePath]) return false;
  const currentHash = computeHash(content);
  return cache[filePath].hash === currentHash;
}

function updateCache(filePath, content, cache) {
  cache[filePath] = {
    hash: computeHash(content),
    timestamp: new Date().toISOString(),
  };
}

function stripFrontMatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n+/, "");
}

function stripWiddershinsBoilerplate(markdown) {
  return markdown
    .replace(/<!-- Generator: Widdershins[\s\S]*?-->\n*/i, "")
    .replace(/^> Scroll down for code samples, example requests and responses\.[^\n]*\n+/m, "");
}

function sanitizeMarkdown(markdown) {
  return markdown.replace(/<(?=[^a-zA-Z/!])/g, "&lt;");
}

function sanitizeHtml(html) {
  return html
    .replace(/<a id="([^"]+)"><\/a>/g, '<span id="$1"></span>')
    .replace(/<p>\s*License:\s*([^<]+)<\/p>/g, "<p>License: <code>$1</code></p>");
}

function enrichWithMimMetadata(html, spec) {
  // Simple injector: find property headers and add a metadata table
  return html.replace(/<h3 id="[^"]+">([^<]+)<\/h3>/g, (match, title) => {
    const schemaName = title.trim();
    const schema = spec.components?.schemas?.[schemaName];

    if (schema && schema["x-mim-metadata"]) {
      const meta = schema["x-mim-metadata"];
      let table = `<div class="mim-metadata"><h4>MIM Informatie</h4><table border="1" style="width:100%; border-collapse: collapse; margin-bottom: 20px;">`;
      for (const [key, value] of Object.entries(meta)) {
        if (key !== "id" && key !== "stereotype") {
          table += `<tr><td style="padding: 8px; background: #f3f4f6; width: 30%;"><strong>${key}</strong></td><td style="padding: 8px;">${value}</td></tr>`;
        }
      }
      table += `</table></div>`;
      return match + table;
    }
    return match;
  });
}

async function generateRespec() {
  console.log("🚀 Start genereren van ReSpec bestanden...");

  const apisDir = path.join(__dirname, "../apis");
  const outputDir = path.join(__dirname, "../docs/respec");
  const cachePath = path.join(__dirname, "../docs/.respec-cache.json");
  const cache = loadCache(cachePath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const yamlFiles = await fg("**/*.{yaml,yml}", { cwd: apisDir });
  const filesToProcess = [];
  let unchangedCount = 0;

  for (const file of yamlFiles) {
    const filePath = path.join(apisDir, file);
    try {
      const content = fs.readFileSync(filePath, "utf8");
      if (isCacheValid(filePath, content, cache)) {
        console.log(`✅ Ongewijzigd (overslaan): ${file}`);
        unchangedCount++;
      } else {
        console.log(`📝 Gewijzigd (verwerken): ${file}`);
        filesToProcess.push({ file, filePath, content });
      }
    } catch (e) {
      console.error(`❌ Fout bij lezen ${file}: ${e.message}`);
    }
  }

  if (filesToProcess.length === 0) {
    console.log(`ℹ️ Alle ${unchangedCount} bestanden zijn ongewijzigd.`);
    return;
  }

  let browser = null;
  let pdfEnabled = true;

  try {
    browser = await puppeteer.launch({ headless: "new" });
  } catch (e) {
    pdfEnabled = false;
    console.warn(`⚠️ PDF generatie overgeslagen: ${e.message}`);
  }

  for (const { file, filePath, content } of filesToProcess) {
    try {
      const apiSpec = yaml.load(content);
      const title = apiSpec.info?.title || path.basename(file, path.extname(file));
      const version = apiSpec.info?.version || "0.0.1";
      const outputFileName = `${file.replace(/\//g, "_").replace(/\.ya?ml$/, "")}.html`;
      const documentUrl = `http://localhost:3000/docs/respec/${outputFileName}`;

      console.log(`📄 Verwerken: ${title} (${version}) [${file}]`);

      let markdown = await widdershins.convert(apiSpec, options);
      markdown = sanitizeMarkdown(stripWiddershinsBoilerplate(stripFrontMatter(markdown)));
      let renderedHtml = sanitizeHtml(marked.parse(markdown));

      // Verrijken met MIM metadata
      renderedHtml = enrichWithMimMetadata(renderedHtml, apiSpec);

      const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>${title} | ReSpec</title>
  <script src="https://gitdocumentatie.logius.nl/publicatie/respec/builds/respec-nlgov.js" class="remove" async></script>
  <script class="remove">
    var respecConfig = {
      specStatus: "WV",
      specType: "HR",
      pubDomain: "dk",
      shortName: "${title.toLowerCase().replace(/\s+/g, "-")}",
      format: "markdown",
      publishDate: "${new Date().toISOString().split("T")[0]}",
      publishVersion: "${version}",
      nl_organisationName: "VNG Realisatie",
      editors: [{ name: "VNG Realisatie" }],
      github: "https://github.com/vng-realisatie/interactie-apis",
    };
  </script>
  <style>
    .mim-metadata table { font-size: 0.9em; border: 1px solid #ddd; }
    .mim-metadata h4 { margin-top: 20px; color: #1a56db; }
  </style>
</head>
<body>
  <section id="abstract"><p>Technische specificatie voor de ${title} API.</p></section>
  <section id="sotd"><p>Dit document is automatisch afgeleid van de OpenAPI-specificatie.</p></section>
  ${renderedHtml}
</body>
</html>`;

      const outputPath = path.join(outputDir, outputFileName);
      fs.writeFileSync(outputPath, html);

      if (pdfEnabled) {
        const page = await browser.newPage();
        await page.goto(`file://${outputPath}`, { waitUntil: "networkidle2" });
        const pdfPath = outputPath.replace(".html", ".pdf");
        await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
        await page.close();
      }
      updateCache(filePath, content, cache);
    } catch (e) {
      console.error(`❌ Fout bij verwerken ${file}:`, e.message);
    }
  }

  if (browser) await browser.close();
  saveCache(cachePath, cache);
  console.log("🎉 ReSpec generatie voltooid!");
}

generateRespec().catch(console.error);
