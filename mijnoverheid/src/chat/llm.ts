// LLM-client voor OpenRouter (OpenAI-compatibele API), met een agentische
// tool-loop zodat het model de échte (mock-)API's van Mijn omgeving kan
// bevragen. De tools draaien client-side (zie tools.ts); alleen de LLM-call
// gaat via een proxy zodat de API-key geheim blijft.
//
// Twee modi (automatisch):
//  - Dev: zet VITE_OPENROUTER_API_KEY in mijnoverheid/.env.local → de browser
//    praat rechtstreeks met OpenRouter (geen Netlify-function nodig).
//  - Prod: geen VITE-key → de browser praat met de Netlify-function
//    (/.netlify/functions/chat), die de geheime key server-side toevoegt.

import { buildTools, runTool, type ApiCall } from "./tools";

const DIRECT_KEY: string | undefined = (import.meta as any).env?.VITE_OPENROUTER_API_KEY;
const DIRECT_MODEL: string =
  (import.meta as any).env?.VITE_OPENROUTER_MODEL || "deepseek/deepseek-chat";
const FUNCTION_ENDPOINT: string =
  (import.meta as any).env?.VITE_CHAT_ENDPOINT || "/.netlify/functions/chat";

// Gegooid wanneer de assistent (nog) niet geconfigureerd is (geen API-key).
export class NotConfiguredError extends Error {
  constructor() {
    super("not_configured");
    this.name = "NotConfiguredError";
  }
}

export type ChatRole = "system" | "user" | "assistant" | "tool";

// OpenAI-vorm: arguments is een JSON-string.
export interface ToolCall {
  id?: string;
  type?: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  // Alleen op assistant-berichten die tools aanroepen.
  tool_calls?: ToolCall[];
  // Alleen op tool-resultaten (OpenAI verwacht het bijbehorende call-id).
  tool_call_id?: string;
  name?: string;
}

const STRIP_THINK = /<think>[\s\S]*?(<\/think>|$)/g;
export function stripThink(text: string): string {
  return text.replace(STRIP_THINK, "").replace(/^\s+/, "");
}

export interface StreamHandlers {
  onText: (fullText: string) => void;
  onTool?: (name: string, args: Record<string, any>) => void;
}

interface RunOptions {
  messages: ChatMessage[];
  apiCall: ApiCall;
  handlers: StreamHandlers;
  signal?: AbortSignal;
}

// Eén LLM-aanroep (streaming). Dev → rechtstreeks naar OpenRouter; prod → proxy.
function llmFetch(payload: unknown, signal?: AbortSignal): Promise<Response> {
  if (DIRECT_KEY) {
    return fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIRECT_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "MijnOverheid demo",
      },
      body: JSON.stringify({ ...(payload as object), model: DIRECT_MODEL }),
      signal,
    });
  }
  return fetch(FUNCTION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}

function safeParse(s: string): Record<string, any> {
  if (!s) return {};
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

// Voert één gebruikersbeurt uit: stuurt de conversatie naar het model, streamt
// het antwoord, en als het model tools aanroept worden die client-side
// uitgevoerd en gaat de loop verder tot er een tekstantwoord komt. Retourneert
// de aangevulde berichten (assistant + tool-berichten).
export async function runConversation({
  messages,
  apiCall,
  handlers,
  signal,
}: RunOptions): Promise<ChatMessage[]> {
  const tools = buildTools();
  const convo = [...messages];
  const appended: ChatMessage[] = [];

  for (let step = 0; step < 6; step++) {
    const res = await llmFetch({ messages: convo, tools, stream: true }, signal);

    if (res.status === 503) {
      throw new NotConfiguredError();
    }
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Assistent gaf HTTP ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ""}`);
    }

    let content = "";
    // Tool-calls komen in stukjes binnen (per index opgebouwd).
    const toolAcc = new Map<number, { id: string; name: string; args: string }>();

    await readSSE(res.body, (data) => {
      const delta = data.choices?.[0]?.delta;
      if (!delta) return;
      if (delta.content) {
        content += delta.content;
        handlers.onText(stripThink(content));
      }
      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          const cur = toolAcc.get(idx) ?? { id: "", name: "", args: "" };
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.name = tc.function.name;
          if (tc.function?.arguments) cur.args += tc.function.arguments;
          toolAcc.set(idx, cur);
        }
      }
    });

    const calls = [...toolAcc.values()].filter((t) => t.name);
    if (calls.length) {
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: stripThink(content),
        tool_calls: calls.map((t) => ({
          id: t.id || t.name,
          type: "function",
          function: { name: t.name, arguments: t.args || "{}" },
        })),
      };
      convo.push(assistantMsg);
      appended.push(assistantMsg);

      for (const t of calls) {
        const args = safeParse(t.args);
        handlers.onTool?.(t.name, args);
        let result: unknown;
        try {
          result = await runTool(t.name, args, apiCall);
        } catch (err: any) {
          result = { error: err?.message || "Tool mislukte" };
        }
        const toolMsg: ChatMessage = {
          role: "tool",
          tool_call_id: t.id || t.name,
          name: t.name,
          content: JSON.stringify(result),
        };
        convo.push(toolMsg);
        appended.push(toolMsg);
      }
      continue; // nog een ronde: laat het model de resultaten verwerken
    }

    appended.push({ role: "assistant", content: stripThink(content) });
    return appended;
  }

  appended.push({
    role: "assistant",
    content: "Ik kon dit verzoek niet afronden. Probeer het iets eenvoudiger te stellen.",
  });
  return appended;
}

// Leest een OpenAI-stijl SSE-stream ("data: {…}\n\n", afgesloten met
// "data: [DONE]") en roept onEvent aan met elk geparseerd JSON-object.
async function readSSE(
  body: ReadableStream<Uint8Array>,
  onEvent: (data: any) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        onEvent(JSON.parse(payload));
      } catch {
        // Onvolledige/ongeldige regel overslaan.
      }
    }
  }
}
