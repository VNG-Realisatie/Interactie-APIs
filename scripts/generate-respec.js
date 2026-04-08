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

  // First pass: check which files need processing
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
    console.log(`ℹ️ Alle ${unchangedCount} bestanden zijn ongewijzigd, geen PDF generatie nodig.`);
    return;
  }

  let browser = null;
  let pdfEnabled = true;

  console.log(`\n🌐 Start PDF browser voor ${filesToProcess.length} gewijzigde bestand(en)...`);
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

      // Convert OAS to HTML that ReSpec can treat as real sections.
      let markdown = await widdershins.convert(apiSpec, options);
      markdown = sanitizeMarkdown(stripWiddershinsBoilerplate(stripFrontMatter(markdown)));
      const renderedHtml = sanitizeHtml(marked.parse(markdown));

      // Create ReSpec HTML template
      const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      specStatusText: {
        nl: {
          wv: "Werkversie",
        },
      },
      specTypeText: {
        nl: {
          hr: "Handreiking",
        },
      },
      thisVersion: "${documentUrl}",
      latestVersion: "${documentUrl}",
      prevVersion: "${documentUrl}",
      license: "mit",
      licenses: {
        mit: {
          name: "MIT License",
          url: "https://opensource.org/license/mit",
          image: "https://img.shields.io/badge/license-MIT-green.svg",
        },
      },
      nl_organisationName: "VNG Realisatie",
      sotdText: {
        nl: {
          sotd: "Status van dit document",
          wv: "Dit document is automatisch afgeleid van de OpenAPI-specificatie in deze repository.",
        },
      },
      editors: [
        {
          name: "VNG Realisatie",
          company: "VNG Realisatie",
          companyURL: "https://github.com/VNG-Realisatie/Interactie-APIs"
        }
      ],
      github: "https://github.com/joepio/vng-apis-schemas",
    };
  </script>
</head>
<body>
  <section id="abstract">
    <p>Dit document bevat de technische specificatie voor de ${title} API.</p>
  </section>
  <section id="sotd">
    <p>Dit is een werkversie van de specificatie op basis van de bron in deze repository.</p>
  </section>
${renderedHtml}
</body>
</html>`;

      const outputPath = path.join(outputDir, outputFileName);

      fs.writeFileSync(outputPath, html);
      console.log(`✅ HTML Gegenereerd: ${outputPath}`);

      if (pdfEnabled) {
        console.log(`⏳ PDF genereren voor ${title}...`);
        const page = await browser.newPage();
        await page.goto(`file://${outputPath}`, { waitUntil: "networkidle2" });
        await page.evaluate(() => {
          return new Promise((resolve) => {
            if (document.respec && document.respec.ready) {
              document.respec.ready.then(resolve);
            } else {
              setTimeout(resolve, 5000);
            }
          });
        });
        const pdfPath = outputPath.replace(".html", ".pdf");
        await page.pdf({
          path: pdfPath,
          format: "A4",
          printBackground: true,
          margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
        });
        await page.close();
        console.log(`✅ PDF Gegenereerd: ${pdfPath}`);
      }

      // HTML generatie is voldoende om de cache te verversen; PDF is optioneel in CI/build-omgevingen.
      updateCache(filePath, content, cache);
    } catch (e) {
      console.error(`❌ Fout bij verwerken ${file}:`, e.message);
    }
  }

  if (browser) {
    await browser.close();
  }
  saveCache(cachePath, cache);
  console.log("💾 Cache bijgewerkt");
  console.log("🎉 ReSpec generatie voltooid!");
}

generateRespec().catch((err) => {
  console.error("💥 Kritieke fout:", err);
  process.exit(1);
});
