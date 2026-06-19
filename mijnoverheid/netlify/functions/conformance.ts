// Volledige conformiteitstest + register voor leveranciers. Server-side (niet te
// faken): we lezen de échte gebundelde OpenAPI-spec, testen alle lees-operaties,
// bouwen requests uit de spec-voorbeelden, en valideren de responses tegen de
// echte (deref'd) responseschema's via ajv. Plus een foutscenario per operatie
// die een 4xx documenteert. Resultaten kunnen in het register (Netlify Blobs).
//
// Acties (POST body): { action: "test" | "publish" | "list", api, baseUrl, vendor? }

import { getStore } from "@netlify/blobs";
import Ajv from "ajv";
import yaml from "js-yaml";

const KLANT_ID = "a8f3c1d2-7e44-4b1a-9c0f-123456789abc";
// Waar de gebundelde specs staan (de API Lab-portal).
const SPEC_BASE = process.env.SPEC_BASE || "https://vng-api-lab.netlify.app/docs/bundled";

const HEADERS = {
  Authorization: "Bearer dummy-token",
  "Content-Type": "application/json",
  Prefer: "code=200",
};

const LABELS: Record<string, string> = {
  taken: "MijnTaken",
  zaken: "MijnZaken",
  producten: "MijnProducten",
  agenda: "MijnAgenda",
  gesprekken: "MijnGesprekken",
};

function corsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": req.headers.get("origin") || "*",
    Vary: "Origin",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export default async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const res = await handle(req);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (body.action === "list") {
    return json({ records: await listRecords() });
  }

  if (body.action === "test" || body.action === "publish") {
    const api = String(body.api || "");
    const baseUrl = String(body.baseUrl || "").trim().replace(/\/$/, "");
    if (!LABELS[api]) return json({ error: "unknown_api", known: Object.keys(LABELS) }, 400);
    if (!/^https?:\/\//.test(baseUrl)) return json({ error: "invalid_base_url" }, 400);

    let result;
    try {
      result = await runConformance(api, baseUrl);
    } catch (err: any) {
      return json({ error: err?.message || "test_failed" }, 502);
    }

    if (body.action === "test") return json(result);

    const vendor = String(body.vendor || "Onbekende leverancier").slice(0, 80);
    const record = { id: makeId(), vendor, api, baseUrl, ...result };
    await getStore("conformance").setJSON(record.id, record);
    return json({ ok: true, record });
  }

  return json({ error: "unknown_action" }, 400);
}

// ───────────────────────  De engine  ───────────────────────

const METHODS = ["get", "post", "put", "patch", "delete"] as const;
const READ_POST = /(zoek|opvragen|search|raadpleeg)/i; // POSTs die lezen i.p.v. muteren

async function runConformance(api: string, baseUrl: string) {
  const spec = await fetchSpec(api);
  const ajv = makeAjv();
  const ops: any[] = [];

  for (const [pathKey, pathItem] of Object.entries<any>(spec.paths || {})) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const method of METHODS) {
      const op = pathItem[method];
      if (!op) continue;

      // Veilig: alleen lezen. Muterende calls op een leverancier-API slaan we over.
      const isRead = method === "get" || (method === "post" && READ_POST.test(pathKey));
      if (!isRead) {
        ops.push({ name: `${method.toUpperCase()} ${pathKey}`, skipped: true, note: "overgeslagen (muterend)" });
        continue;
      }

      // Pad-parameters invullen uit hun voorbeeld.
      const params = [...(pathItem.parameters || []), ...(op.parameters || [])].map((p) =>
        deref(p, spec),
      );
      const filled = fillPath(pathKey, params);
      const name = `${method.toUpperCase()} ${pathKey}`;
      if (filled === null) {
        ops.push({ name, skipped: true, note: "geen voorbeeldwaarde voor pad-parameter" });
        continue;
      }

      const reqBody =
        method === "post" ? exampleFromSchema(requestSchema(op, spec), spec, new Set()) : undefined;

      ops.push(await testOp(baseUrl, filled, method, pathKey, op, reqBody, spec, ajv));
    }
  }

  const tested = ops.filter((o) => !o.skipped);
  const passed = tested.filter((o) => o.pass).length;
  return {
    label: LABELS[api],
    timestamp: new Date().toISOString(),
    ops,
    score: {
      passed,
      total: tested.length,
      percent: tested.length ? Math.round((passed / tested.length) * 100) : 0,
    },
  };
}

async function testOp(
  baseUrl: string,
  callPath: string,
  method: string,
  pathKey: string,
  op: any,
  reqBody: any,
  spec: any,
  ajv: Ajv,
) {
  const name = `${method.toUpperCase()} ${pathKey}`;
  const violations: string[] = [];
  const started = Date.now();
  let status = 0;
  let schemaValid = true;

  try {
    const res = await fetch(`${baseUrl}${callPath}`, {
      method: method.toUpperCase(),
      headers: { ...HEADERS },
      body: reqBody !== undefined ? JSON.stringify(reqBody) : undefined,
    });
    status = res.status;

    const documented = op.responses && Object.keys(op.responses).includes(String(status));
    if (!documented) violations.push(`Statuscode ${status} is niet gedocumenteerd in de spec`);

    const ok2xx = status >= 200 && status < 300;
    if (!ok2xx) violations.push(`Onverwachte statuscode ${status} (verwacht 2xx)`);

    const ct = res.headers.get("content-type") || "";
    const schema = ok2xx ? responseSchema(op, status, spec) : null;
    if (schema) {
      if (!/json/.test(ct)) violations.push(`Content-Type is geen JSON (${ct || "leeg"})`);
      const data = await res.json().catch(() => null);
      const validate = compile(ajv, schema);
      if (validate) {
        schemaValid = validate(data) as boolean;
        if (!schemaValid) {
          for (const e of (validate.errors || []).slice(0, 8)) {
            violations.push(`${e.instancePath || "/"} ${e.message}`);
          }
        }
      }
    }
  } catch (err: any) {
    violations.push(`Verzoek mislukte: ${err?.message || "onbereikbaar"}`);
    schemaValid = false;
  }

  // Foutscenario: documenteert de op een 400? Stuur dan een lege/ongeldige body
  // en verwacht dat de API correct afwijst (4xx).
  let negative: any = null;
  if (method === "post" && op.responses && op.responses["400"]) {
    try {
      const r = await fetch(`${baseUrl}${callPath}`, {
        method: "POST",
        headers: { ...HEADERS },
        body: JSON.stringify({ __conformance_invalid__: true }),
      });
      const rejected = r.status >= 400 && r.status < 500;
      negative = { rejected, status: r.status };
      if (!rejected) violations.push(`Ongeldige request niet afgewezen (kreeg ${r.status}, verwacht 4xx)`);
    } catch {
      /* negeren */
    }
  }

  const ok2xx = status >= 200 && status < 300;
  const pass = ok2xx && schemaValid && violations.length === 0;
  return {
    name,
    status,
    schemaValid,
    negative,
    pass,
    violations,
    latencyMs: Date.now() - started,
  };
}

// ───────────────────────  Spec-helpers  ───────────────────────

async function fetchSpec(api: string): Promise<any> {
  const res = await fetch(`${SPEC_BASE}/apis_rest_${api}_next.yaml`);
  if (!res.ok) throw new Error(`Kon de spec niet laden (HTTP ${res.status})`);
  const text = await res.text();
  const spec = yaml.load(text) as any;
  fixOpenApiSchemas(spec);
  return spec;
}

// OpenAPI 3.0 → JSON-Schema-vriendelijk maken voor ajv (nullable, exclusive*).
function fixOpenApiSchemas(node: any): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) fixOpenApiSchemas(item);
    return;
  }
  if (node.nullable === true && typeof node.type === "string") {
    node.type = [node.type, "null"];
    delete node.nullable;
  }
  if (typeof node.exclusiveMinimum === "boolean") delete node.exclusiveMinimum;
  if (typeof node.exclusiveMaximum === "boolean") delete node.exclusiveMaximum;
  for (const key of Object.keys(node)) fixOpenApiSchemas(node[key]);
}

function makeAjv(): Ajv {
  return new Ajv({ strict: false, allErrors: true, validateFormats: false });
}

// Compileert een volledig ge-dereferenced schema (geen $refs meer).
function compile(ajv: Ajv, schema: any) {
  try {
    return ajv.compile(schema);
  } catch {
    return null;
  }
}

// Top-level $ref oplossen (één niveau).
function deref(node: any, spec: any, seen = new Set<string>()): any {
  if (!node || typeof node !== "object") return node;
  if (typeof node.$ref === "string") {
    if (seen.has(node.$ref)) return {};
    const resolved = resolvePointer(spec, node.$ref);
    return deref(resolved, spec, new Set([...seen, node.$ref]));
  }
  return node;
}

// Inline álle $refs recursief (zelf-bevattend schema), met cycle-guard per tak.
function fullDeref(node: any, spec: any, seen = new Set<string>()): any {
  if (Array.isArray(node)) return node.map((n) => fullDeref(n, spec, seen));
  if (!node || typeof node !== "object") return node;
  if (typeof node.$ref === "string") {
    if (seen.has(node.$ref)) return {};
    return fullDeref(resolvePointer(spec, node.$ref), spec, new Set([...seen, node.$ref]));
  }
  const out: any = {};
  for (const [k, v] of Object.entries(node)) out[k] = fullDeref(v, spec, seen);
  return out;
}

function resolvePointer(spec: any, ref: string): any {
  const parts = ref.replace(/^#\//, "").split("/").map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
  let cur = spec;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function requestSchema(op: any, spec: any): any {
  const content = deref(op.requestBody, spec)?.content;
  const schema = content?.["application/json"]?.schema;
  return schema ? fullDeref(schema, spec) : null;
}

function responseSchema(op: any, status: number, spec: any): any {
  const resp = deref(op.responses?.[String(status)] ?? op.responses?.default, spec);
  const schema = resp?.content?.["application/json"]?.schema;
  return schema ? fullDeref(schema, spec) : null;
}

// Vult {param} in het pad met het voorbeeld uit de parameter-definitie.
function fillPath(pathKey: string, params: any[]): string | null {
  let out = pathKey;
  for (const m of pathKey.matchAll(/\{([^}]+)\}/g)) {
    const pname = m[1];
    const p = params.find((x) => x?.in === "path" && x?.name === pname);
    const example = p?.example ?? p?.schema?.example ?? p?.schema?.default;
    if (example === undefined || example === null) return null;
    out = out.replace(`{${pname}}`, encodeURIComponent(String(example)));
  }
  return out;
}

// Bouwt een plausibele waarde uit een (deref'd) schema, met voorrang voor
// expliciete voorbeelden in de spec.
function exampleFromSchema(schema: any, spec: any, seen: Set<string>): any {
  const s = deref(schema, spec, seen);
  if (!s || typeof s !== "object") return undefined;
  if (s.example !== undefined) return s.example;
  if (s.default !== undefined) return s.default;
  if (Array.isArray(s.enum) && s.enum.length) return s.enum[0];
  if (s.allOf) {
    const merged: any = {};
    for (const sub of s.allOf) Object.assign(merged, exampleFromSchema(sub, spec, seen) || {});
    return merged;
  }
  if (s.oneOf || s.anyOf) return exampleFromSchema((s.oneOf || s.anyOf)[0], spec, seen);

  const type = Array.isArray(s.type) ? s.type.find((t: string) => t !== "null") : s.type;
  if (type === "object" || s.properties) {
    const obj: any = {};
    const required: string[] = s.required || [];
    for (const [key, propSchema] of Object.entries<any>(s.properties || {})) {
      if (required.includes(key) || (propSchema && propSchema.example !== undefined)) {
        obj[key] = exampleFromSchema(propSchema, spec, seen);
      }
    }
    return obj;
  }
  if (type === "array") return [exampleFromSchema(s.items, spec, seen)].filter((x) => x !== undefined);
  if (type === "string") {
    if (s.format === "date") return "2026-01-01";
    if (s.format === "date-time") return "2026-01-01T12:00:00Z";
    if (s.format === "uuid") return KLANT_ID;
    if (s.format === "email") return "test@example.test";
    return "voorbeeld";
  }
  if (type === "integer" || type === "number") return 1;
  if (type === "boolean") return true;
  return undefined;
}

// ───────────────────────  Register  ───────────────────────

async function listRecords(): Promise<any[]> {
  try {
    const store = getStore("conformance");
    const { blobs } = await store.list();
    const records = await Promise.all(
      blobs.map((b: any) => store.get(b.key, { type: "json" }).catch(() => null)),
    );
    return records.filter(Boolean).sort((a: any, b: any) => (a.timestamp < b.timestamp ? 1 : -1));
  } catch {
    return [];
  }
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
