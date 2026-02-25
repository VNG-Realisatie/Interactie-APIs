const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const yaml = require('js-yaml');

// Recursively resolve all $ref in a parsed object, relative to baseDir
function resolveRefs(obj, baseDir, visited = new Set()) {
  if (obj === null || typeof obj !== 'object') return obj;
  // console.log(`🔍 Resolving at ${baseDir}${obj['$ref'] ? ' ($ref: ' + obj['$ref'] + ')' : ''}`);

  if (Array.isArray(obj)) {
    return obj.map(item => resolveRefs(item, baseDir, visited));
  }

  // If this object has a $ref to an external file (not a #/local/ref)
  if (obj['$ref'] && typeof obj['$ref'] === 'string' && !obj['$ref'].startsWith('#')) {
    const [refFilePath, fragment] = obj['$ref'].split('#');
    const absoluteFilePath = path.resolve(baseDir, refFilePath);
    const fullRefPath = fragment ? `${absoluteFilePath}#${fragment}` : absoluteFilePath;
    console.log(`  👉 Resolving $ref: ${obj['$ref']} -> ${fullRefPath}`);

    if (visited.has(fullRefPath)) {
      console.warn(`⚠️ Circulaire $ref gedetecteerd: ${fullRefPath}`);
      return { description: `(circulaire ref: ${obj['$ref']})` };
    }
    const nextVisited = new Set(visited);
    nextVisited.add(fullRefPath);

    try {
      const content = fs.readFileSync(absoluteFilePath, 'utf8');
      const refDir = path.dirname(absoluteFilePath);
      let parsed;
      if (absoluteFilePath.endsWith('.json')) {
        parsed = JSON.parse(content);
      } else {
        parsed = yaml.load(content);
      }
      // Remove JSON Schema's $schema key so OpenAPI doesn't choke
      delete parsed['$schema'];

      // If there's a fragment (e.g. #/$defs/MyModel), navigate to it
      let target = parsed;
      if (fragment) {
        const parts = fragment.split('/').filter(p => p && p !== '#');
        for (const part of parts) {
          if (target && typeof target === 'object' && part in target) {
            target = target[part];
          } else {
            console.error(`❌ Kon fragment "${fragment}" niet vinden in ${absoluteFilePath}`);
            return obj;
          }
        }
      }

      return resolveRefs(target, refDir, nextVisited);
    } catch (e) {
      console.error(`❌ Kon $ref "${obj['$ref']}" niet resolven vanuit ${baseDir}: ${e.message}`);
      return obj;
    }
  }

  // Recurse into all properties
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveRefs(value, baseDir, visited);
  }
  return result;
}

async function generatePortalData() {
  console.log('🔍 Bezig met het scannen van de repository voor API data...');

  const data = {
    apis: [],
    schemas: [],
    patterns: []
  };

  const bundledDir = path.join(__dirname, '../docs/bundled');
  if (!fs.existsSync(bundledDir)) {
    fs.mkdirSync(bundledDir, { recursive: true });
  }

  // 1. Scan APIs (flat file structure: apis/rest/demo/v1.0.0.yaml)
  // Group versions per API directory
  const apiFiles = await fg('apis/**/*.{yaml,yml}');
  const apiGroups = {};
  for (const file of apiFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const spec = yaml.load(content);
      const apiDir = path.dirname(file); // e.g. apis/rest/demo
      const version = spec.info?.version || path.basename(file, path.extname(file));
      const title = spec.info?.title || path.basename(apiDir);

      // Bundle the spec (resolve all external $refs)
      const baseDir = path.resolve(path.dirname(file));
      const bundled = resolveRefs(spec, baseDir);
      const bundledName = file.replace(/\//g, '_');
      const bundledPath = path.join(bundledDir, bundledName);
      fs.writeFileSync(bundledPath, yaml.dump(bundled, { lineWidth: -1 }));
      console.log(`📦 Gebundeld: ${file} → docs/bundled/${bundledName}`);

      if (!apiGroups[apiDir]) {
        apiGroups[apiDir] = { title, versions: [] };
      }
      apiGroups[apiDir].versions.push({
        version,
        url: '/docs/bundled/' + bundledName,   // Scalar loads the bundled version
        sourceUrl: '/' + file                   // Original file
      });
    } catch (e) {
      console.error(`❌ Fout bij verwerken API ${file}:`, e.message);
    }
  }
  // Convert groups to array, sort versions descending per API
  for (const group of Object.values(apiGroups)) {
    group.versions.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    data.apis.push(group);
  }

  // 2. Scan Schemas (versioned: schemas/adres/v0.0.1.json)
  const schemaFiles = await fg('schemas/**/*.json');
  const schemaGroups = {};
  for (const file of schemaFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const schema = JSON.parse(content);
      const schemaDir = path.dirname(file);
      const schemaName = schema.title || path.basename(schemaDir);
      const version = path.basename(file, '.json');
      if (!schemaGroups[schemaDir]) {
        schemaGroups[schemaDir] = { name: schemaName, versions: [] };
      }
      schemaGroups[schemaDir].versions.push({ version, path: file });
    } catch (e) {
      console.error(`❌ Fout bij verwerken Schema ${file}:`, e.message);
    }
  }
  for (const group of Object.values(schemaGroups)) {
    group.versions.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    data.schemas.push(group);
  }

  // 3. Scan Patterns (versioned: patterns/pagination/0.0.1.yaml)
  const patternFiles = await fg('patterns/**/*.yaml');
  const patternGroups = {};
  for (const file of patternFiles) {
    const patternDir = path.dirname(file);
    const patternName = path.basename(patternDir);
    const version = path.basename(file, path.extname(file));
    if (!patternGroups[patternDir]) {
      patternGroups[patternDir] = { name: patternName, versions: [] };
    }
    patternGroups[patternDir].versions.push({ version, path: file });
  }
  for (const group of Object.values(patternGroups)) {
    group.versions.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    data.patterns.push(group);
  }

  // Sorteer data voor stabiele output
  data.apis.sort((a, b) => a.title.localeCompare(b.title));
  data.schemas.sort((a, b) => a.name.localeCompare(b.name));
  data.patterns.sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(
    path.join(__dirname, '../docs/portal-data.json'),
    JSON.stringify(data, null, 2)
  );

  console.log('✅ Portaal data succesvol gegenereerd in docs/portal-data.json');
}

generatePortalData().catch(err => {
  console.error('❌ Kritieke fout bij genereren portaal data:', err);
  process.exit(1);
});
