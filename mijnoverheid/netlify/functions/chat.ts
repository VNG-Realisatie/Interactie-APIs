// Proxy naar OpenRouter. Houdt de API-key server-side (Netlify env var) en
// streamt het OpenAI-compatibele SSE-antwoord door naar de browser. De browser
// stuurt {messages, tools, stream}; wij voegen het model en de geheime key toe.
//
// Env vars (in de Netlify-site instellen):
//   OPENROUTER_API_KEY  (verplicht) — geheime OpenRouter-key
//   OPENROUTER_MODEL    (optioneel) — model-id, default deepseek/deepseek-chat

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export default async (req: Request): Promise<Response> => {
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
