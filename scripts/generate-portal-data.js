const fs = require("fs");
const path = require("path");
const fg = require("fast-glob");
const yaml = require("js-yaml");
const crypto = require("crypto");

// Recursively resolve all $ref in a parsed object, relative to baseDir
function resolveRefs(obj, baseDir, visited = new Set()) {
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveRefs(item, baseDir, visited));
  }

  if (obj["$ref"] && typeof obj["$ref"] === "string" && !obj["$ref"].startsWith("#")) {
    const [refFilePath, fragment] = obj["$ref"].split("#");
    const absoluteFilePath = path.resolve(baseDir, refFilePath);
    const fullRefPath = fragment ? `${absoluteFilePath}#${fragment}` : absoluteFilePath;

    if (visited.has(fullRefPath)) {
      console.warn(`⚠️ Circulaire $ref gedetecteerd: ${fullRefPath}`);
      return { description: `(circulaire ref: ${obj["$ref"]})` };
    }
    const nextVisited = new Set(visited);
    nextVisited.add(fullRefPath);

    try {
      const content = fs.readFileSync(absoluteFilePath, "utf8");
      const refDir = path.dirname(absoluteFilePath);
      let parsed;
      if (absoluteFilePath.endsWith(".json")) {
        parsed = JSON.parse(content);
      } else {
        parsed = yaml.load(content);
      }
      delete parsed["$schema"];

      let target = parsed;
      if (fragment) {
        const parts = fragment.split("/").filter((p) => p && p !== "#");
        for (const part of parts) {
          if (target && typeof target === "object" && part in target) {
            target = target[part];
          } else {
            console.error(`❌ Kon fragment "${fragment}" niet vinden in ${absoluteFilePath}`);
            return obj;
          }
        }
      }

      return resolveRefs(target, refDir, nextVisited);
    } catch (e) {
      console.error(`❌ Kon $ref "${obj["$ref"]}" niet resolven vanuit ${baseDir}: ${e.message}`);
      return obj;
    }
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveRefs(value, baseDir, visited);
  }
  return result;
}

// Compute hash of file content
function computeHash(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex").substring(0, 16);
}

// Load cache from file if it exists
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

// Save cache to file
function saveCache(cachePath, cache) {
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

// Check if content hash matches cache
function isCacheValid(filePath, content, cache) {
  if (!cache[filePath]) return false;
  const currentHash = computeHash(content);
  return cache[filePath].hash === currentHash;
}

// Update cache with new hash
function updateCache(filePath, content, cache) {
  cache[filePath] = {
    hash: computeHash(content),
    timestamp: new Date().toISOString(),
  };
}

async function generatePortalData() {
  console.log("🔍 Bezig met het scannen van de repository voor API data...");

  const cachePath = path.join(__dirname, "../docs/.portal-cache.json");
  const cache = loadCache(cachePath);
  const bundledDir = path.join(__dirname, "../docs/bundled");

  if (!fs.existsSync(bundledDir)) {
    fs.mkdirSync(bundledDir, { recursive: true });
  }

  const data = {
    apis: [],
    schemas: [],
    patterns: [],
  };

  let hasChanges = false;

  // 1. Scan APIs (flat file structure: apis/rest/demo/v1.0.0.yaml)
  const apiFiles = await fg("apis/**/*.{yaml,yml}");
  const apiGroups = {};

  for (const file of apiFiles) {
    try {
      const content = fs.readFileSync(file, "utf8");

      if (!isCacheValid(file, content, cache)) {
        console.log(`📝 Gewijzigd: ${file}`);
        hasChanges = true;

        const spec = yaml.load(content);
        const apiDir = path.dirname(file);
        const version = path.basename(file, path.extname(file));
        const title = spec.info?.title || path.basename(apiDir);

        const baseDir = path.resolve(path.dirname(file));
        const bundled = resolveRefs(spec, baseDir);
        const bundledName = file.replace(/\//g, "_");
        const bundledPath = path.join(bundledDir, bundledName);
        fs.writeFileSync(bundledPath, yaml.dump(bundled, { lineWidth: -1 }));
        console.log(`📦 Gebundeld: ${file} → docs/bundled/${bundledName}`);

        if (!apiGroups[apiDir]) {
          apiGroups[apiDir] = { title, versions: [] };
        }
        apiGroups[apiDir].versions.push({
          version,
          url: "/docs/bundled/" + bundledName,
          sourceUrl: "/" + file,
        });

        updateCache(file, content, cache);
      } else {
        console.log(`✅ Ongewijzigd: ${file}`);
        // Still add to groups from existing bundled file
        const spec = yaml.load(content);
        const apiDir = path.dirname(file);
        const version = path.basename(file, path.extname(file));
        const title = spec.info?.title || path.basename(apiDir);

        if (!apiGroups[apiDir]) {
          apiGroups[apiDir] = { title, versions: [] };
        }
        const bundledName = file.replace(/\//g, "_");
        apiGroups[apiDir].versions.push({
          version,
          url: "/docs/bundled/" + bundledName,
          sourceUrl: "/" + file,
        });
      }
    } catch (e) {
      console.error(`❌ Fout bij verwerken API ${file}: ${e.message}`);
    }
  }

  // Sort and finalize API groups
  for (const group of Object.values(apiGroups)) {
    group.versions.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    data.apis.push(group);
  }

  // 2. Scan Schemas (versioned: schemas/adres/v0.0.1.json)
  const schemaFiles = await fg("schemas/**/*.json");
  const schemaGroups = {};

  for (const file of schemaFiles) {
    try {
      const content = fs.readFileSync(file, "utf8");

      if (!isCacheValid(file, content, cache)) {
        console.log(`📝 Gewijzigd: ${file}`);
        hasChanges = true;
        updateCache(file, content, cache);
      } else {
        console.log(`✅ Ongewijzigd: ${file}`);
      }

      const schema = JSON.parse(content);
      const schemaDir = path.dirname(file);
      const schemaName = schema.title || path.basename(schemaDir);
      const schemaDescription = schema.description || "";
      const version = path.basename(file, ".json");

      if (!schemaGroups[schemaDir]) {
        schemaGroups[schemaDir] = {
          name: schemaName,
          description: schemaDescription,
          versions: [],
        };
      }
      schemaGroups[schemaDir].versions.push({ version, path: file });
    } catch (e) {
      console.error(`❌ Fout bij verwerken Schema ${file}: ${e.message}`);
    }
  }

  for (const group of Object.values(schemaGroups)) {
    group.versions.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    data.schemas.push(group);
  }

  // 3. Scan Patterns (versioned: patterns/pagination/0.0.1.yaml)
  const patternFiles = await fg("patterns/**/*.yaml");
  const patternGroups = {};

  for (const file of patternFiles) {
    try {
      const content = fs.readFileSync(file, "utf8");

      if (!isCacheValid(file, content, cache)) {
        console.log(`📝 Gewijzigd: ${file}`);
        hasChanges = true;
        updateCache(file, content, cache);
      } else {
        console.log(`✅ Ongewijzigd: ${file}`);
      }

      const pattern = yaml.load(content) || {};
      const patternDir = path.dirname(file);
      const patternName = pattern.title || path.basename(patternDir);
      const patternDescription = pattern.description || "";
      const version = path.basename(file, path.extname(file));

      if (!patternGroups[patternDir]) {
        patternGroups[patternDir] = {
          name: patternName,
          description: patternDescription,
          versions: [],
        };
      }
      patternGroups[patternDir].versions.push({ version, path: file });
    } catch (e) {
      console.error(`❌ Fout bij verwerken Pattern ${file}: ${e.message}`);
    }
  }

  for (const group of Object.values(patternGroups)) {
    group.versions.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    data.patterns.push(group);
  }

  // Sorteer data voor stabiele output
  data.apis.sort((a, b) => a.title.localeCompare(b.title));
  data.schemas.sort((a, b) => a.name.localeCompare(b.name));
  data.patterns.sort((a, b) => a.name.localeCompare(b.name));

  // Only write portal-data.json if something changed
  if (hasChanges || !fs.existsSync(path.join(__dirname, "../docs/portal-data.json"))) {
    fs.writeFileSync(
      path.join(__dirname, "../docs/portal-data.json"),
      JSON.stringify(data, null, 2),
    );
    console.log("✅ Portaal data succesvol gegenereerd in docs/portal-data.json");
  } else {
    console.log("ℹ️ Geen wijzigingen, portal-data.json niet bijgewerkt");
  }

  // Always save cache at the end
  saveCache(cachePath, cache);
  console.log("💾 Cache bijgewerkt");
}

generatePortalData().catch((err) => {
  console.error("❌ Kritieke fout bij genereren portaal data:", err);
  process.exit(1);
});
