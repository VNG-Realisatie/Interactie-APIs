// Lichtgewicht client voor een lokale Ollama-instance, met een agentische
// tool-loop zodat het model de échte (mock-)API's van Mijn omgeving kan
// bevragen. We praten met /api/chat (NDJSON-stream) en geven het model
// function-calling tools; die voert de browser uit tegen dezelfde endpoints
// als de rest van de app (zie tools.ts), waardoor de calls ook in de
// API-inspector verschijnen.

import { buildTools, runTool, type ApiCall } from "./tools";

// Override via .env(.local): VITE_OLLAMA_URL=http://host:11434
export const OLLAMA_BASE: string =
  (import.meta as any).env?.VITE_OLLAMA_URL?.replace(/\/$/, "") || "http://localhost:11434";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  function: { name: string; arguments: Record<string, any> };
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
  // Alleen op assistant-berichten die tools aanroepen.
  tool_calls?: ToolCall[];
  // Alleen op tool-resultaten: de naam van de uitgevoerde tool.
  tool_name?: string;
}

// Haalt de beschikbare modellen op; gebruikt om automatisch een model te kiezen
// en om te detecteren of Ollama draait.
export async function listModels(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal });
  if (!res.ok) throw new Error(`Ollama gaf HTTP ${res.status}`);
  const data = await res.json();
  return (data.models || []).map((m: any) => m.name as string);
}

// Kiest een verstandig standaardmodel: liefst een qwen (kan tools), anders het
// eerste model dat Ollama aanbiedt.
export function pickModel(models: string[]): string | null {
  if (!models.length) return null;
  return models.find((m) => /qwen/i.test(m)) ?? models[0];
}

const STRIP_THINK = /<think>[\s\S]*?(<\/think>|$)/g;
// Reasoning-modellen (qwen3) kunnen <think>-blokken in de content zetten; die
// horen niet in de chatbel thuis.
export function stripThink(text: string): string {
  return text.replace(STRIP_THINK, "").replace(/^\s+/, "");
}

export interface StreamHandlers {
  // Wordt bij elk binnenkomend tekstfragment aangeroepen met de volledige,
  // opgeschoonde tekst-tot-nu-toe van het huidige antwoord.
  onText: (fullText: string) => void;
  // Statusupdate wanneer het model een tool aanroept (voor de "… ophalen"-chip).
  onTool?: (name: string, args: Record<string, any>) => void;
}

interface RunOptions {
  model: string;
  messages: ChatMessage[];
  apiCall: ApiCall;
  handlers: StreamHandlers;
  signal?: AbortSignal;
}

// Voert één gebruikersbeurt uit: stuurt de conversatie naar het model, streamt
// het antwoord, en als het model tools aanroept worden die uitgevoerd en gaat
// de loop verder tot er een tekstantwoord komt. Retourneert de aangevulde
// berichtenlijst (assistant + eventuele tool-berichten) zodat de UI de
// geschiedenis kan bewaren.
export async function runConversation({
  model,
  messages,
  apiCall,
  handlers,
  signal,
}: RunOptions): Promise<ChatMessage[]> {
  const tools = buildTools();
  const convo = [...messages];
  const appended: ChatMessage[] = [];

  // Maximaal een paar tool-rondes om oneindige loops te voorkomen.
  for (let step = 0; step < 6; step++) {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: convo,
        tools,
        stream: true,
        think: false,
        options: { temperature: 0.3 },
      }),
      signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`Ollama gaf HTTP ${res.status} ${res.statusText}`.trim());
    }

    let raw = "";
    const toolCalls: ToolCall[] = [];
    await readNdjson(res.body, (obj) => {
      const msg = obj.message;
      if (msg?.content) {
        raw += msg.content;
        handlers.onText(stripThink(raw));
      }
      if (msg?.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          if (tc?.function?.name) toolCalls.push(tc);
        }
      }
    });

    if (toolCalls.length) {
      // Bewaar het assistant-bericht mét tool-calls en voer elke tool uit.
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: stripThink(raw),
        tool_calls: toolCalls,
      };
      convo.push(assistantMsg);
      appended.push(assistantMsg);

      for (const tc of toolCalls) {
        const args = normalizeArgs(tc.function.arguments);
        handlers.onTool?.(tc.function.name, args);
        let result: unknown;
        try {
          result = await runTool(tc.function.name, args, apiCall);
        } catch (err: any) {
          result = { error: err?.message || "Tool mislukte" };
        }
        const toolMsg: ChatMessage = {
          role: "tool",
          tool_name: tc.function.name,
          content: JSON.stringify(result),
        };
        convo.push(toolMsg);
        appended.push(toolMsg);
      }
      continue; // nog een ronde: laat het model de resultaten verwerken
    }

    // Geen tool-calls → dit is het eindantwoord.
    appended.push({ role: "assistant", content: stripThink(raw) });
    return appended;
  }

  appended.push({
    role: "assistant",
    content: "Ik kon dit verzoek niet afronden. Probeer het iets eenvoudiger te stellen.",
  });
  return appended;
}

// Ollama geeft tool-argumenten meestal als object, soms als JSON-string.
function normalizeArgs(args: unknown): Record<string, any> {
  if (args && typeof args === "object") return args as Record<string, any>;
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }
  return {};
}

// Leest een NDJSON-stream (één JSON-object per regel) en roept onObject aan.
async function readNdjson(
  body: ReadableStream<Uint8Array>,
  onObject: (obj: any) => void,
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
      if (!line) continue;
      try {
        onObject(JSON.parse(line));
      } catch {
        // Onvolledige/ongeldige regel overslaan.
      }
    }
  }
  const rest = buffer.trim();
  if (rest) {
    try {
      onObject(JSON.parse(rest));
    } catch {
      /* negeren */
    }
  }
}
