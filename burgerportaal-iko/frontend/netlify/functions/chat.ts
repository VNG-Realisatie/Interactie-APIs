// Proxy naar OpenRouter. Houdt de API-key server-side (Netlify env var) en
// streamt het OpenAI-compatibele SSE-antwoord door naar de browser. De browser
// stuurt {messages, tools, stream}; wij voegen het model en de geheime key toe.
//
// Env vars (in de Netlify-site instellen):
//   OPENROUTER_API_KEY  (verplicht) — geheime OpenRouter-key
//   OPENROUTER_MODEL    (optioneel) — model-id, default deepseek/deepseek-chat

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    // 503 → de client toont "assistent niet geconfigureerd".
    return new Response(JSON.stringify({ error: "not_configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat";

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const referer = req.headers.get("origin") || "https://mijnoverheid.chat";

  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-Title": "MijnOverheid demo",
    },
    body: JSON.stringify({
      model,
      messages: body.messages,
      tools: body.tools,
      stream: body.stream !== false,
    }),
  });

  // Stream de respons (SSE) ongewijzigd door naar de browser.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
};
