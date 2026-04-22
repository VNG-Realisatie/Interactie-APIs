const fs = require("fs");
const path = require("path");
const { cleanText, toCamelCase } = require("./mim-utils");

const XML_PATH = path.join(__dirname, "../schemas/agenda/v0.8.1.xmi");
const OUTPUT_FILE = path.join(__dirname, "../schemas/agenda/v0.8.1.json");

const MIM_TAGS = new Set([
  "Aanduiding strijdigheid/nietigheid",
  "Alternatieve naam",
  "Authentiek",
  "Begrip",
  "Datum opname",
  "Definitie",
  "Eigenaar",
  "Formeel patroon",
  "Herkomst",
  "Herkomst definitie",
  "Indicatie afleidbaar",
  "Indicatie classificerend",
  "Indicatie formele historie",
  "Indicatie in onderzoek",
  "Indicatie materiële historie",
  "Is afgeleid",
  "Kwaliteitsbegrip",
  "Lengte",
  "Locatie",
  "Maximum waarde (inclusief)",
  "Minimum lengte",
  "Minimum waarde (inclusief)",
  "Mogelijk geen waarde",
  "Patroon",
  "Populatie",
  "Positie",
  "Regels",
  "Restriction identifier",
  "Toelichting",
]);

const ALLOWED_STEREOTYPES = new Set([
  "Objecttype",
  "Relatieklasse",
  "Referentielijst",
  "Gestructureerd datatype",
  "Gegevensgroeptype",
  "Enumeratie",
]);

const ALLOWED_NAMES = new Set([
  "Partij",
  "Actor",
  "Land",
  "LOCATIE",
  "CONTACTINFORMATIE",
  "ACTIVITEITSOORT OP AGENDA-AFSPRAAK",
  "ACTIVITEITSOORT OP AGENDA AFSPRAAK",
]);

function cleanMetadata(tags) {
  return Object.fromEntries(
    Object.entries(tags || {}).filter(([key, value]) => MIM_TAGS.has(key) && value !== ""),
  );
}

function getMimType(element) {
  if (ALLOWED_STEREOTYPES.has(element.stereotype)) return element.stereotype;
  if (element.packageName === "Complex datatype") return "Gestructureerd datatype";
  if (element.packageName === "Relatieklasse") return "Relatieklasse";
  if (element.packageName === "Objecttype") return "Objecttype";
  if (element.packageName && element.packageName.includes("Referentielijst")) {
    return "Referentielijst";
  }
  return element.stereotype || "Objecttype";
}

function normalizeCardinality(cardinality) {
  const normalized = String(cardinality || "[1]")
    .replace(/^\[/, "")
    .replace(/\]$/, "");
  const [rawLower, rawUpper = rawLower] = normalized.split("..");
  const lower = rawLower === "" ? 1 : Number(rawLower);
  const upper = rawUpper === "*" || rawUpper === "-1" ? "*" : Number(rawUpper);

  return {
    lower: Number.isFinite(lower) ? lower : 1,
    upper: Number.isFinite(upper) || upper === "*" ? upper : 1,
  };
}

function applyCardinality(schema, cardinality) {
  const { lower, upper } = normalizeCardinality(cardinality);
  if (upper === "*" || upper > 1) {
    const arraySchema = { type: "array", items: schema };
    if (lower > 0) arraySchema.minItems = lower;
    if (upper !== "*") arraySchema.maxItems = upper;
    return arraySchema;
  }
  return schema;
}

function normalizeTypeName(typeName) {
  return String(typeName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function mapUmlTypeToJsonSchema(typeName, schemaNamesByOriginalName) {
  const original = String(typeName || "").trim();
  const normalized = normalizeTypeName(original);
  const referencedSchema = schemaNamesByOriginalName.get(normalized);

  if (referencedSchema) return { $ref: `#/$defs/${referencedSchema}` };

  if (["characterstring", "string", "tekst", "text"].includes(normalized)) {
    return { type: "string" };
  }
  if (["uri", "url"].includes(normalized)) {
    return { type: "string", format: "uri" };
  }
  if (["date", "datum"].includes(normalized)) {
    return { type: "string", format: "date" };
  }
  if (["datetime", "datumtijd"].includes(normalized)) {
    return { type: "string", format: "date-time" };
  }
  if (["integer", "int", "short", "long"].includes(normalized)) {
    return { type: "integer" };
  }
  if (["decimal", "double", "float", "number", "real"].includes(normalized)) {
    return { type: "number" };
  }
  if (["boolean", "bool", "logical", "indicatie"].includes(normalized)) {
    return { type: "boolean" };
  }

  return { type: "string" };
}

function associationPropertyName(association, targetElement, existingProperties) {
  const base = toCamelCase(association.name || targetElement.name);
  let candidate = base || toCamelCase(targetElement.name);
  let index = 2;

  while (existingProperties[candidate]) {
    candidate = `${base}${index}`;
    index += 1;
  }

  return candidate;
}

function parseXmi() {
  console.log(`📖 Inlezen van ${XML_PATH}...`);
  if (!fs.existsSync(XML_PATH)) {
    console.error("❌ XMI file not found.");
    return;
  }
  const content = fs.readFileSync(XML_PATH, "utf8");

  const elements = {};
  const associations = [];
  const generalizations = [];
  const notes = {};
  const noteLinks = [];
  const eaPositions = {}; // Store EA coordinates

  // Parse Diagram elements for exact EA positions
  const diagramElementMatches = content.matchAll(
    /<UML:DiagramElement geometry="([^"]+)" subject="([^"]+)"/g,
  );
  for (const match of diagramElementMatches) {
    const geometry = match[1];
    const subject = match[2];
    const leftMatch = geometry.match(/Left=([-\d]+)/);
    const topMatch = geometry.match(/Top=([-\d]+)/);
    if (leftMatch && topMatch) {
      // Apply a scale factor to spread things out for the web
      const SCALE = 1.2;
      eaPositions[subject] = {
        x: Math.round(parseInt(leftMatch[1], 10) * SCALE),
        y: Math.round(parseInt(topMatch[1], 10) * SCALE),
      };
    }
  }

  // Parse classes. EA also exports self-closing UML:Class placeholders; skip those so
  // they do not swallow the following real class block.
  const classBlocks = content.split("<UML:Class ");
  for (let i = 1; i < classBlocks.length; i++) {
    const firstTagEnd = classBlocks[i].indexOf(">");
    if (firstTagEnd === -1) continue;

    const attrStr = classBlocks[i].slice(0, firstTagEnd);
    if (attrStr.trim().endsWith("/")) continue;

    const body = classBlocks[i].slice(firstTagEnd + 1).split("</UML:Class>")[0];
    const block = `<UML:Class ${attrStr}>${body}</UML:Class>`;
    const idMatch = attrStr.match(/xmi\.id="([^"]+)"/);
    const nameMatch = attrStr.match(/name="([^"]+)"/);
    if (!idMatch || !nameMatch) continue;

    const id = idMatch[1];
    const name = nameMatch[1];

    const stereotypeMatch = block.match(/<UML:Stereotype name="([^"]+)"\/>/);
    const stereotype = stereotypeMatch ? stereotypeMatch[1] : "Objecttype";

    const packageNameMatch = block.match(/package_name" value="([^"]+)"/);
    const packageName = packageNameMatch ? packageNameMatch[1] : "";

    const tags = {};
    const tagMatches = block.matchAll(/<UML:TaggedValue tag="([^"]+)" value="([^"]*)"/g);
    for (const tm of tagMatches) {
      if (tm[1] !== "description") {
        // We will parse description later
        const cleaned = cleanText(tm[2]);
        if (cleaned) tags[tm[1]] = cleaned;
      }
    }

    // Some EA versions put description in a separate tag
    const docMatch = block.match(/<UML:TaggedValue tag="documentation" value="([^"]*)"/);
    if (docMatch) tags["Definitie"] = cleanText(docMatch[1]);

    const attributes = [];
    const attrMatches = block.matchAll(/<UML:Attribute name="([^"]+)"[\s\S]*?<\/UML:Attribute>/g);
    for (const am of attrMatches) {
      const attrName = am[1];
      const attrBlock = am[0];

      const typeMatch = attrBlock.match(/<UML:TaggedValue tag="type" value="([^"]+)"/);
      const lowerMatch = attrBlock.match(/<UML:TaggedValue tag="lowerBound" value="([^"]+)"/);
      const upperMatch = attrBlock.match(/<UML:TaggedValue tag="upperBound" value="([^"]+)"/);

      // Fallbacks if tagged values are missing
      let lower = lowerMatch ? lowerMatch[1] : "1";
      let upper = upperMatch ? upperMatch[1] : "1";

      if (!lowerMatch && attrBlock.includes("lowerValue")) {
        const lm2 = attrBlock.match(/<lowerValue[^>]*value="([^"]+)"/);
        if (lm2) lower = lm2[1];
      }
      if (!upperMatch && attrBlock.includes("upperValue")) {
        const um2 = attrBlock.match(/<upperValue[^>]*value="([^"]+)"/);
        if (um2) upper = um2[1];
      }

      let isId = false;
      if (
        attrName.toLowerCase().includes("id") ||
        attrBlock.includes('Indicatie identificerend" value="Ja"')
      ) {
        isId = true;
      }

      const attrTags = {};
      const aTagMatches = attrBlock.matchAll(/<UML:TaggedValue tag="([^"]+)" value="([^"]*)"/g);
      for (const atm of aTagMatches) {
        const cleaned = cleanText(atm[2]);
        if (cleaned) attrTags[atm[1]] = cleaned;
      }

      const aDocMatch = attrBlock.match(/<UML:TaggedValue tag="description" value="([^"]*)"/);
      if (aDocMatch) attrTags["Definitie"] = cleanText(aDocMatch[1]);

      attributes.push({
        name: attrName,
        type: typeMatch ? typeMatch[1] : "String",
        cardinality: `[${lower}..${upper === "-1" || upper === "*" ? "*" : upper}]`,
        required: lower !== "0",
        multiple: upper !== "1",
        isId,
        tags: attrTags,
      });
    }

    elements[id] = { id, name, stereotype, packageName, tags, attributes };
  }

  // Handle EA elements (often contains the actual metadata in newer versions, or overrides)
  // EA creates <element> tags for everything. Let's merge them.
  const elementBlocks = content.split("<element ");
  for (let i = 1; i < elementBlocks.length; i++) {
    const block = elementBlocks[i].split("</element>")[0];
    const idMatch = block.match(/xmi:idref="([^"]+)"/);
    const nameMatch = block.match(/name="([^"]+)"/);
    if (!idMatch || !nameMatch) continue;

    const id = idMatch[1];

    // Notes
    if (block.includes('xmi:type="uml:Note"')) {
      const textMatch = block.match(/<properties documentation="([^"]*)"/);
      if (textMatch) {
        let rawText = textMatch[1];
        let cleanNote = rawText
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#xA;/gi, "\n")
          .replace(/&#x9;/gi, " ")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n\n")
          .replace(/<\/li>/gi, "\n")
          .replace(/<li>/gi, "- ")
          .replace(/<[^>]*>?/gm, "")
          .trim();
        notes[id] = { id, text: cleanNote };
      }
      continue;
    }

    if (!elements[id]) {
      elements[id] = { id, name: nameMatch[1], tags: {}, attributes: [] };
    }

    const propsMatch = block.match(/<properties [^>]*stereotype="([^"]*)"/);
    if (propsMatch) elements[id].stereotype = propsMatch[1];

    const elementTagsPart = block.split("<attributes>")[0];
    const tagMatches = elementTagsPart.matchAll(
      /<tag [^>]*name="([^"]+)" (?:value|notes)="([^"]*)"/g,
    );
    for (const tm of tagMatches) {
      const cleaned = cleanText(tm[2]);
      if (cleaned) elements[id].tags[tm[1]] = cleaned;
    }

    // Overwrite with detailed EA attributes if they exist
    const attributesPartMatch = block.match(/<attributes>([\s\S]*?)<\/attributes>/);
    if (attributesPartMatch) {
      elements[id].attributes = []; // Reset and use the EA detailed ones
      const attrBlocks = attributesPartMatch[1].split("</attribute>");
      for (const attrBlock of attrBlocks) {
        const am = attrBlock.match(/<attribute xmi:idref="([^"]+)" name="([^"]+)"/);
        if (!am) continue;

        const aTypeMatch = attrBlock.match(/<properties type="([^"]+)"/);
        const boundsMatch = attrBlock.match(/<bounds lower="([^"]+)" upper="([^"]+)"/);

        // Visibility
        const scopeMatch = attrBlock.match(/scope="([^"]+)"/i);
        let visibility = "+";
        if (scopeMatch) {
          const s = scopeMatch[1].toLowerCase();
          if (s === "private") visibility = "-";
          if (s === "protected") visibility = "#";
          if (s === "package") visibility = "~";
        }

        // Stereotype
        const attrStereoMatch = attrBlock.match(/<stereotype stereotype="([^"]+)"/);
        const attrStereotype = attrStereoMatch ? attrStereoMatch[1] : null;

        let isId = false;
        const attrTags = {};
        const attrTagMatches = attrBlock.matchAll(
          /<tag [^>]*name="([^"]+)" (?:value|notes)="([^"]*)"/g,
        );
        for (const atm of attrTagMatches) {
          const cleaned = cleanText(atm[2]);
          if (cleaned) attrTags[atm[1]] = cleaned;
          if (atm[1] === "Indicatie identificerend" && atm[2] === "Ja") isId = true;
        }

        if (am[2].toLowerCase().includes("identificatie") || am[2].toLowerCase() === "id")
          isId = true;

        elements[id].attributes.push({
          name: am[2],
          type: aTypeMatch ? aTypeMatch[1] : "string",
          cardinality: boundsMatch
            ? `[${boundsMatch[1]}..${boundsMatch[2] === "-1" ? "*" : boundsMatch[2]}]`
            : "[1]",
          required: boundsMatch ? boundsMatch[1] !== "0" : true,
          multiple: boundsMatch ? boundsMatch[2] !== "1" : false,
          isId,
          visibility,
          stereotype: attrStereotype,
          tags: attrTags,
        });
      }
    }
  }

  // 2. Extraheer Links
  const genMatches = content.matchAll(/<Generalization [^>]*start="([^"]+)" end="([^"]+)"/g);
  for (const gm of genMatches) {
    generalizations.push({ child: gm[1], parent: gm[2] });
  }
  // Check UML generalizations too
  const umlGenMatches = content.matchAll(
    /<generalization xmi:type="uml:Generalization" xmi:id="[^"]+" general="([^"]+)"/g,
  );
  for (const gm of umlGenMatches) {
    const childMatch = content
      .slice(Math.max(0, gm.index - 500), gm.index)
      .match(/<packagedElement[^>]*xmi:id="([^"]+)"/);
    if (childMatch) generalizations.push({ child: childMatch[1], parent: gm[1] });
  }
  // UML 1.3 usually has <UML:Generalization child="..." parent="..."/> inside <UML:Namespace.ownedElement>
  const umlGen2Matches = content.matchAll(
    /<UML:Generalization[^>]*child="([^"]+)" parent="([^"]+)"/g,
  );
  for (const gm of umlGen2Matches) {
    generalizations.push({ child: gm[1], parent: gm[2] });
  }
  const umlGen3Matches = content.matchAll(
    /<UML:Generalization[^>]*subtype="([^"]+)" supertype="([^"]+)"/g,
  );
  for (const gm of umlGen3Matches) {
    generalizations.push({ child: gm[1], parent: gm[2] });
  }

  // Parse UML:Association
  const assocBlocks = content.split("<UML:Association ");
  for (let i = 1; i < assocBlocks.length; i++) {
    const block = assocBlocks[i].split("</UML:Association>")[0];

    const nameMatch = block.match(/^name="([^"]*)"/) || block.match(/name="([^"]*)"/);
    const stereotypeMatch = block.match(/<UML:Stereotype name="([^"]+)"/);

    const ends = [...block.matchAll(/<UML:AssociationEnd([\s\S]*?)<\/UML:AssociationEnd>/g)];
    if (ends.length < 2) continue;

    let source, target, sourceCard, targetCard;
    for (const end of ends) {
      const endStr = end[1];
      const typeMatch = endStr.match(/type="([^"]+)"/);
      const multMatch = endStr.match(/multiplicity="([^"]+)"/);
      const isSource = endStr.includes('value="source"');

      if (isSource) {
        source = typeMatch ? typeMatch[1] : null;
        sourceCard = multMatch ? multMatch[1] : "";
      } else {
        target = typeMatch ? typeMatch[1] : null;
        targetCard = multMatch ? multMatch[1] : "";
      }
    }

    if (!source || !target) continue;

    associations.push({
      name: nameMatch ? nameMatch[1] : "",
      source,
      target,
      sourceCard,
      targetCard,
      stereotype: stereotypeMatch ? stereotypeMatch[1] : null,
    });
  }

  const noteLinkMatches = content.matchAll(/<NoteLink [^>]*start="([^"]+)" end="([^"]+)"/g);
  for (const nm of noteLinkMatches) {
    const start = nm[1];
    const end = nm[2];
    if (notes[start]) noteLinks.push({ noteText: notes[start].text, noteId: start, classId: end });
    if (notes[end]) noteLinks.push({ noteText: notes[end].text, noteId: end, classId: start });
  }

  // 3. Bouw JSON Schema
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "MijnAgenda",
    description:
      "Volledig Conceptueel Informatiemodel (MIM), automatisch gegenereerd vanuit Enterprise Architect.",
    type: "object",
    $defs: {},
  };

  const objectTypes = Object.values(elements).filter((e) => {
    if (!e.name || e.name === "EARootClass") return false;

    const mimType = getMimType(e);
    return (
      ALLOWED_STEREOTYPES.has(mimType) ||
      ALLOWED_NAMES.has(e.name) ||
      e.packageName === "Complex datatype" ||
      generalizations.some((g) => g.child === e.id || g.parent === e.id) ||
      associations.some((a) => a.source === e.id || a.target === e.id)
    );
  });

  const schemaNamesById = new Map(objectTypes.map((obj) => [obj.id, toCamelCase(obj.name)]));
  const schemaNamesByOriginalName = new Map(
    objectTypes.map((obj) => [normalizeTypeName(obj.name), toCamelCase(obj.name)]),
  );

  for (const obj of objectTypes) {
    const technicalName = toCamelCase(obj.name);
    const mimType = getMimType(obj);
    const supertype = generalizations.find((g) => g.child === obj.id);
    const supertypeName = supertype ? schemaNamesById.get(supertype.parent) : undefined;

    const isExternal =
      obj.packageName &&
      !["Model", "MijnAgenda", "Objecttype", "Relatieklasse", "Complex datatype"].includes(
        obj.packageName,
      );

    const def = {
      type: "object",
      title: obj.name,
      description: obj.tags["Definitie"] || obj.tags["Toelichting"] || undefined,
      "x-mim-metadata": {
        ...cleanMetadata(obj.tags),
        mimType,
        id: obj.id,
        stereotype: obj.stereotype || mimType,
        packageName: obj.packageName,
        isExternal: isExternal || ["Partij", "Actor", "Land"].includes(obj.name),
        supertype: supertypeName,
        position: eaPositions[obj.id] || null,
        notes: noteLinks
          .filter((nl) => nl.classId === obj.id)
          .map((nl) => ({
            text: nl.noteText,
            position: eaPositions[nl.noteId] || null,
          })),
        associations: associations
          .filter((a) => a.source === obj.id)
          .map((a) => ({
            target: schemaNamesById.get(a.target),
            name: a.name,
            sourceCard: a.sourceCard,
            targetCard: a.targetCard,
            stereotype: a.stereotype,
          })),
      },
      properties: {},
      required: [],
    };

    for (const attr of obj.attributes) {
      const attrTechName = toCamelCase(attr.name);
      const baseSchema = mapUmlTypeToJsonSchema(attr.type, schemaNamesByOriginalName);
      const prop = applyCardinality(
        {
          ...baseSchema,
          description: attr.tags["Definitie"] || attr.tags["Toelichting"] || undefined,
          "x-mim-metadata": {
            ...cleanMetadata(attr.tags),
            mimType: attr.stereotype || "Attribuutsoort",
            umlType: attr.type,
            naam: attr.name,
            cardinality: attr.cardinality,
            isId: attr.isId,
            visibility: attr.visibility,
            stereotype: attr.stereotype,
          },
        },
        attr.cardinality,
      );

      def.properties[attrTechName] = prop;
      if (attr.required) def.required.push(attrTechName);
    }

    for (const association of associations.filter((a) => a.source === obj.id)) {
      const targetElement = elements[association.target];
      const targetSchemaName = schemaNamesById.get(association.target);
      if (!targetElement || !targetSchemaName) continue;

      const propertyName = associationPropertyName(association, targetElement, def.properties);
      const relationSchema = applyCardinality(
        {
          $ref: `#/$defs/${targetSchemaName}`,
          description: association.name
            ? `Relatie '${association.name}' naar ${targetElement.name}.`
            : `Relatie naar ${targetElement.name}.`,
          "x-mim-metadata": {
            mimType: association.stereotype || "Relatiesoort",
            name: association.name,
            source: technicalName,
            target: targetSchemaName,
            sourceCard: association.sourceCard,
            targetCard: association.targetCard,
            stereotype: association.stereotype,
          },
        },
        `[${association.targetCard || "1"}]`,
      );

      def.properties[propertyName] = relationSchema;
      if (normalizeCardinality(association.targetCard).lower > 0) {
        def.required.push(propertyName);
      }
    }

    if (supertypeName) {
      def.allOf = [
        {
          $ref: `#/$defs/${supertypeName}`,
        },
      ];
    }

    schema.$defs[technicalName] = def;
  }

  schema["$ref"] = "#/$defs/agendaAfspraak";

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(schema, null, 2));
  console.log(`\n🎉 EA-Perfect model gegenereerd: ${OUTPUT_FILE}`);
}

parseXmi();
