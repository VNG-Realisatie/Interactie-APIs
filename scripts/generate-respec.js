const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const yaml = require('js-yaml');
const widdershins = require('widdershins');
const puppeteer = require('puppeteer');

const options = {
  codeSamples: true,
  httpsnippet: false,
  templateCallback: function (nm, opts, data) {
    return data;
  },
  theme: 'darkula',
  search: true,
  sample: true,
  discovery: false,
  includes: [],
  shallowSchemas: false,
  tocSummary: true,
  headings: 2,
  yaml: false,
  respec: true // This is key for ReSpec compatibility
};

async function generateRespec() {
  console.log('🚀 Start genereren van ReSpec bestanden...');

  const apisDir = path.join(__dirname, '../apis');
  const outputDir = path.join(__dirname, '../docs/respec');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const yamlFiles = await fg('**/*.{yaml,yml}', { cwd: apisDir });

  console.log('🌐 Start PDF browser...');
  const browser = await puppeteer.launch({ headless: "new" });

  for (const file of yamlFiles) {
    const filePath = path.join(apisDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const apiSpec = yaml.load(content);

      const title = apiSpec.info?.title || path.basename(file, path.extname(file));
      const version = apiSpec.info?.version || '0.0.1';

      console.log(`📄 Verwerken: ${title} (${version}) [${file}]`);

      // Convert OAS to Markdown (ReSpec compatible)
      const markdown = await widdershins.convert(apiSpec, options);

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
      shortName: "${title.toLowerCase().replace(/\s+/g, '-')}",
      publishDate: "${new Date().toISOString().split('T')[0]}",
      publishVersion: "${version}",
      editors: [
        {
          name: "VNG Realisatie",
          company: "VNG Realisatie",
          companyURL: "https://github.com/VNG-Realisatie/Interactie-APIs"
        }
      ],
      github: "https://github.com/joepio/vng-apis-schemas",
      // single source of truth: points back to the original YAML
      // however, we use the generated markdown for the body
    };
  </script>
</head>
<body>
  <section id="abstract">
    <p>Dit document bevat de technische specificatie voor de ${title} API.</p>
  </section>
  <section id="sotd">
    <p>Dit is een werkversie van de specificatie.</p>
  </section>

  <!-- Injected Markdown from Widdershins -->
  <div id="widdershins-content">
    ${markdown}
  </div>
</body>
</html>`;

      const outputFileName = `${file.replace(/\//g, '_').replace(/\.ya?ml$/, '')}.html`;
      const outputPath = path.join(outputDir, outputFileName);

      fs.writeFileSync(outputPath, html);
      console.log(`✅ HTML Gegenereerd: ${outputPath}`);

      console.log(`⏳ PDF genereren voor ${title}...`);
      const page = await browser.newPage();
      await page.goto(`file://${outputPath}`, { waitUntil: 'networkidle2' });
      await page.evaluate(() => {
        return new Promise((resolve) => {
          if (document.respec && document.respec.ready) {
            document.respec.ready.then(resolve);
          } else {
            setTimeout(resolve, 5000);
          }
        });
      });
      const pdfPath = outputPath.replace('.html', '.pdf');
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });
      await page.close();
      console.log(`✅ PDF Gegenereerd: ${pdfPath}`);

    } catch (e) {
      console.error(`❌ Fout bij verwerken ${file}:`, e.message);
    }
  }

  await browser.close();
  console.log('🎉 ReSpec generatie voltooid!');
}

generateRespec().catch(err => {
  console.error('💥 Kritieke fout:', err);
  process.exit(1);
});
