// Proxy naar Xiaomi MiMo voor spraak: ASR (spraak→tekst) en TTS (tekst→spraak).
// Houdt de MIMO_API_KEY server-side. Beide lopen via het OpenAI-compatibele
// /chat/completions-endpoint (door MiMo zo ontworpen):
//  - ASR: model mimo-v2.5-asr, audio als input_audio content-part → message.content
//  - TTS: model mimo-v2.5-tts, tekst in een assistant-bericht → message.audio.data (base64 WAV)
//
// Env: MIMO_API_KEY (sk-… of tp-…)

const URL = "https://api.xiaomimimo.com/v1/chat/completions";

// CORS zodat lokale dev (kale Vite) de gedeployde function mag aanroepen.
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

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const key = process.env.MIMO_API_KEY;
  if (!key) {
    return json({ error: "not_configured" }, 503);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const headers = { "api-key": key, "Content-Type": "application/json" };

  if (body.mode === "asr") {
    const upstream = await fetch(URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: body.model || "mimo-v2.5-asr",
        stream: false,
        messages: [
          { role: "user", content: [{ type: "input_audio", input_audio: { data: body.audio } }] },
        ],
      }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: "asr_failed", detail: data }, upstream.status);
    return json({ text: String(data?.choices?.[0]?.message?.content ?? "").trim() });
  }

  if (body.mode === "tts") {
    const upstream = await fetch(URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: body.model || "mimo-v2.5-tts",
        stream: false,
        messages: [{ role: "assistant", content: body.input }],
      }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return json({ error: "tts_failed", detail: data }, upstream.status);
    const audio = data?.choices?.[0]?.message?.audio?.data ?? "";
    return json({ audio, mime: "audio/wav" });
  }

  return json({ error: "unknown_mode" }, 400);
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
