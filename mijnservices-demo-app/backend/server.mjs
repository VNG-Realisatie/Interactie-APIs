// MijnTaken demo-server — super klein, stateful, niet productie-ready.
//
// Implementeert het MijnTaken-contract (apis/rest/taken/next.yaml):
//   POST /context/zoek      -> ContextResultaat met taken[] (samenvattingen)
//   GET  /taken/{uuid}      -> volledige Taak
// Plus mutatie-endpoints voor de hackathon (buiten het portaalcontract,
// maar handig om als deelnemer taken voor een burger aan te maken/bewerken):
//   GET    /taken           -> lijst (gemak)
//   POST   /taken           -> nieuwe taak aanmaken
//   PATCH  /taken/{uuid}    -> taak bijwerken (bijv. status -> afgerond)
//   DELETE /taken/{uuid}    -> taak verwijderen
//
// State is in-memory: weg bij herstart. Voor een hackathon van een paar uur
// prima. Geen dependencies — alleen Node's ingebouwde http-module.
//
// Starten:   node backend/server.mjs        (of PORT=8787 node backend/server.mjs)
// Online:    npx cloudflared tunnel --url http://localhost:8787
//            (of: ngrok http 8787) — geeft een publieke https-URL.

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, normalize, join } from "node:path";
import { takenSeed } from "../data/taken-seed.mjs";

const PORT = Number(process.env.PORT ?? 8787);

// De demo-app (index.html, app.js, styles.css, …) staat één map hoger.
// Deze server serveert die bestanden óók, zodat app + API op één URL draaien.
const STATIC_ROOT = fileURLToPath(new URL("../", import.meta.url));
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

// --- Seed-data -------------------------------------------------------------
// De correspondentiestroom (demo-seed) staat als gedeeld bestand in
// data/taken-seed.mjs, zodat de app en deze server dezelfde bron gebruiken.
// structuredClone zodat mutaties (PATCH) de gedeelde seed niet aanpassen.
// uuid -> taak
const taken = new Map(takenSeed.map((taak) => [taak.uuid, structuredClone(taak)]));

// --- Helpers ---------------------------------------------------------------
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Max-Age": "86400",
};

function send(res, status, body, extraHeaders = {}) {
  const payload = body === null ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "API-Version": "next",
    ...CORS,
    ...extraHeaders,
  });
  res.end(payload);
}

function fout(res, status, title) {
  // Beknopte RFC 7807-achtige fout.
  res.writeHead(status, { "Content-Type": "application/problem+json; charset=utf-8", ...CORS });
  res.end(JSON.stringify({ status, title }));
}

// Serveert een bestand uit de demo-app. In index.html injecteren we een
// vlaggetje (window.MIJNPLANNEN_API = "") zodat de app automatisch live op
// deze server draait — same-origin, dus geen ?api= en geen CORS nodig.
async function serveStatic(res, pathname) {
  const rel = pathname === "/" ? "/index.html" : pathname;
  const safe = normalize(decodeURIComponent(rel)).replace(/^([/\\]|\.\.[/\\])+/, "");
  const filePath = join(STATIC_ROOT, safe);
  if (!filePath.startsWith(STATIC_ROOT)) return fout(res, 403, "Verboden");
  try {
    const ext = extname(filePath).toLowerCase();
    if (ext === ".html") {
      const html = (await readFile(filePath, "utf-8")).replace(
        "</head>",
        '  <script>window.MIJNPLANNEN_API = "";</script>\n  </head>',
      );
      res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-cache" });
      return res.end(html);
    }
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  } catch {
    fout(res, 404, "Bestand niet gevonden");
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

// --- Router ----------------------------------------------------------------
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = req.method ?? "GET";

  if (method === "OPTIONS") return send(res, 204, null);

  try {
    // Health / hint (de root "/" serveert de demo-app, zie onderaan)
    if (method === "GET" && path === "/health") {
      return send(res, 200, {
        service: "MijnTaken demo-server",
        endpoints: ["POST /context/zoek", "GET /taken", "GET /taken/{uuid}", "POST /taken", "PATCH /taken/{uuid}", "DELETE /taken/{uuid}"],
        aantalTaken: taken.size,
      });
    }

    // Contract: zoek context -> samenvattingen
    if (method === "POST" && path === "/context/zoek") {
      await readJson(req); // body (klantId, include, ...) wordt in deze demo niet gefilterd
      return send(res, 200, { taken: [...taken.values()] });
    }

    // Gemak: lijst alle taken
    if (method === "GET" && path === "/taken") {
      return send(res, 200, { taken: [...taken.values()] });
    }

    // Nieuwe taak aanmaken (hackathon)
    if (method === "POST" && path === "/taken") {
      const body = await readJson(req);
      if (!body?.titel?.nl) return fout(res, 400, "Veld 'titel.nl' is verplicht");
      const taak = {
        uuid: randomUUID(),
        organisatie: body.organisatie ?? "overig",
        soort: body.soort ?? "verplichting",
        briefType: body.briefType ?? "actiebrief",
        briefCode: body.briefCode ?? "",
        ontvangen: body.ontvangen ?? "",
        titel: { nl: body.titel.nl, ...body.titel },
        aanhef: body.aanhef ?? "",
        geadresseerde: body.geadresseerde ?? "",
        adres: body.adres ?? null,
        actieNodig: body.actieNodig ?? true,
        automatisch: body.automatisch ?? false,
        status: body.status ?? "open",
        deadline: body.deadline ?? "",
        leidtTotZaak: body.leidtTotZaak ?? null,
        uitvoering: { canonicalUrl: body.uitvoering?.canonicalUrl ?? "", ...(body.uitvoering ?? {}) },
      };
      if (body.toelichting?.nl) taak.toelichting = body.toelichting;
      taken.set(taak.uuid, taak);
      return send(res, 201, taak, { Location: `/taken/${taak.uuid}` });
    }

    // Eén taak: ophalen / bijwerken / verwijderen
    const match = path.match(/^\/taken\/([^/]+)$/);
    if (match) {
      const uuid = decodeURIComponent(match[1]);
      const taak = taken.get(uuid);
      if (!taak) return fout(res, 404, "Taak niet gevonden");

      if (method === "GET") return send(res, 200, taak);

      if (method === "PATCH") {
        const body = await readJson(req);
        if (body.status) taak.status = body.status;
        if (body.titel) taak.titel = { ...taak.titel, ...body.titel };
        if (body.toelichting) taak.toelichting = { ...(taak.toelichting ?? {}), ...body.toelichting };
        if (body.organisatie) taak.organisatie = body.organisatie;
        if (body.soort) taak.soort = body.soort;
        if (body.briefType) taak.briefType = body.briefType;
        if ("briefCode" in body) taak.briefCode = body.briefCode;
        if ("aanhef" in body) taak.aanhef = body.aanhef;
        if ("geadresseerde" in body) taak.geadresseerde = body.geadresseerde;
        if ("adres" in body) taak.adres = body.adres;
        if ("ontvangen" in body) taak.ontvangen = body.ontvangen;
        if ("actieNodig" in body) taak.actieNodig = body.actieNodig;
        if ("automatisch" in body) taak.automatisch = body.automatisch;
        if ("deadline" in body) taak.deadline = body.deadline;
        if ("leidtTotZaak" in body) taak.leidtTotZaak = body.leidtTotZaak;
        if (body.uitvoering) taak.uitvoering = { ...taak.uitvoering, ...body.uitvoering };
        return send(res, 200, taak);
      }

      if (method === "DELETE") {
        taken.delete(uuid);
        return send(res, 204, null);
      }
    }

    // Geen API-route geraakt: serveer de demo-app (static files).
    if (method === "GET") return serveStatic(res, path);

    return fout(res, 404, "Onbekend endpoint");
  } catch (err) {
    return fout(res, 400, `Ongeldige aanvraag: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`MijnTaken demo-server + app op http://localhost:${PORT}`);
  console.log(`  App:     http://localhost:${PORT}/#plannen`);
  console.log(`  API:     POST http://localhost:${PORT}/context/zoek  (health: /health)`);
  console.log(`  Taken:   ${taken.size} geseed`);
  console.log(`  Tunnel:  npx cloudflared tunnel --url http://localhost:${PORT}`);
});
