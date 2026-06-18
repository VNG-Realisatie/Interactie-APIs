import { useCallback, useEffect, useRef, useState } from "react";
import { listModels, pickModel, runConversation, type ChatMessage } from "./ollama";
import type { ApiCall } from "./tools";

// De systeemprompt bepaalt de persona en stuurt het model naar de tools voor
// alles wat over de persoonlijke gegevens van de gebruiker gaat.
const SYSTEM_PROMPT = `Je bent de digitale assistent van Mijn omgeving: één aanspreekpunt voor al het contact met de overheid. Je helpt Jeroen van Drouwen met vragen over zowel zijn gemeente als rijksoverheidsorganisaties (bijvoorbeeld de Belastingdienst, SVB, RDW, Dienst Toeslagen, CAK) en andere overheden.

Je kunt alles ophalen wat in Mijn omgeving staat: zijn taken, zaken (aanvragen), producten (zoals vergunningen en passen), afspraken in de agenda en berichten van overheidsorganisaties. Daarnaast mag je algemene vragen over de overheid beantwoorden.

Werkwijze:
- Gaat de vraag over zíjn eigen gegevens (taken, zaken, producten, afspraken, berichten), gebruik dan ALTIJD de bijbehorende tool om die live op te halen. Verzin nooit gegevens, bedragen of datums.
- Kies de tool die past bij de vraag (get_taken, get_zaken, get_zaak_details, get_producten, get_afspraken, get_berichten). Combineer gerust meerdere tools als dat nodig is.
- Vat de uitkomst kort en begrijpelijk samen in het Nederlands, op B1-niveau. Noem concrete titels, organisaties, bedragen en deadlines, en bij welke overheid iets hoort.
- Bij een algemene vraag die geen persoonlijke data nodig heeft, geef je gewoon een behulpzaam antwoord; verwijs zo nodig naar de juiste organisatie of naar telefoonnummer 1400.
- Wees feitelijk, neutraal en beknopt. Geef geen bindend juridisch of financieel advies. Gebruik korte alinea's of opsommingen waar dat helpt.`;

export const SUGGESTIONS = [
  "Welke taken zijn nu het meest urgent?",
  "Wat moet ik nog betalen en vóór wanneer?",
  "Wat is de status van mijn lopende zaken?",
  "Welke afspraken heb ik staan?",
];

const STORAGE_KEY = "mijnoverheid-chat-threads";

// Eén bewaard gesprek met de assistent.
export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

// De gedeelde chat-API die de hook teruggeeft. Eén instantie wordt gedeeld door
// het zwevende widget, de chatpagina én het gespreksoverzicht.
export interface ChatApi {
  convo: ChatMessage[];
  hasConversation: boolean;
  activeId: string | null;
  threads: Conversation[];
  input: string;
  setInput: (v: string) => void;
  busy: boolean;
  liveText: string;
  activeTool: string | null;
  error: string | null;
  unavailable: boolean;
  // forceNew=true start altijd een nieuw gesprek (bijv. vanaf de homepagina),
  // ongeacht of er een actief gesprek is.
  send: (text: string, forceNew?: boolean) => void;
  stop: () => void;
  reset: () => void;
  openThread: (id: string) => void;
  deleteThread: (id: string) => void;
  ensureModel: () => Promise<string | null>;
}

function loadThreads(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Titel afgeleid uit de eerste vraag van de gebruiker.
function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const t = (firstUser?.content || "Nieuw gesprek").trim().replace(/\s+/g, " ");
  return t.length > 60 ? `${t.slice(0, 60)}…` : t;
}

export function useChat(apiCall: ApiCall): ChatApi {
  const [threads, setThreads] = useState<Conversation[]>(loadThreads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const detectingRef = useRef<Promise<string | null> | null>(null);

  // Bewaar gesprekken zodat ze een herlaad overleven (zoals moderne chatbots).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    } catch {
      /* opslag kan vol/geblokkeerd zijn — niet kritiek */
    }
  }, [threads]);

  const active = threads.find((t) => t.id === activeId) ?? null;
  const convo: ChatMessage[] = active
    ? active.messages
    : [{ role: "system", content: SYSTEM_PROMPT }];
  const hasConversation = !!active && active.messages.some((m) => m.role !== "system");

  // Voegt een gesprek toe of werkt het bij (nieuwste bovenaan).
  const upsert = useCallback((id: string, messages: ChatMessage[], title: string) => {
    setThreads((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) {
        return [{ id, title, messages, updatedAt: Date.now() }, ...prev];
      }
      const copy = [...prev];
      copy[idx] = { ...copy[idx], messages, updatedAt: Date.now() };
      return copy;
    });
  }, []);

  // Detecteert Ollama + kiest een model. Lui en idempotent.
  const ensureModel = useCallback(async (): Promise<string | null> => {
    if (model) return model;
    if (detectingRef.current) return detectingRef.current;
    const p = (async () => {
      try {
        const chosen = pickModel(await listModels());
        if (chosen) {
          setModel(chosen);
          setUnavailable(false);
          return chosen;
        }
        setUnavailable(true);
        return null;
      } catch {
        setUnavailable(true);
        return null;
      } finally {
        detectingRef.current = null;
      }
    })();
    detectingRef.current = p;
    return p;
  }, [model]);

  const send = useCallback(
    async (text: string, forceNew = false) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      const activeModel = model ?? (await ensureModel());
      if (!activeModel) {
        setUnavailable(true);
        return;
      }

      setError(null);
      setInput("");

      // Bepaal of we in een bestaand gesprek typen of een nieuw gesprek starten.
      const userMsg: ChatMessage = { role: "user", content: trimmed };
      const existing = !forceNew && activeId ? threads.find((t) => t.id === activeId) : null;
      let id = activeId;
      let convoNow: ChatMessage[];
      if (existing) {
        convoNow = [...existing.messages, userMsg];
      } else {
        id = makeId();
        convoNow = [{ role: "system", content: SYSTEM_PROMPT }, userMsg];
        setActiveId(id);
      }
      const title = deriveTitle(convoNow);
      upsert(id!, convoNow, title);

      setBusy(true);
      setLiveText("");
      setActiveTool(null);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const appended = await runConversation({
          model: activeModel,
          messages: convoNow,
          apiCall,
          signal: controller.signal,
          handlers: {
            onText: (full) => setLiveText(full),
            onTool: (name) => {
              setActiveTool(name);
              setLiveText("");
            },
          },
        });
        upsert(id!, [...convoNow, ...appended], title);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setError(err?.message || "Er ging iets mis bij het ophalen van een antwoord.");
        }
      } finally {
        setBusy(false);
        setLiveText("");
        setActiveTool(null);
        abortRef.current = null;
      }
    },
    [busy, model, activeId, threads, apiCall, ensureModel, upsert],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const clearTransient = () => {
    setError(null);
    setLiveText("");
    setActiveTool(null);
    setInput("");
  };

  // Start een nieuw, leeg gesprek (bewaart de vorige in het overzicht).
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
    clearTransient();
  }, []);

  // Open een bestaand gesprek uit het overzicht.
  const openThread = useCallback((id: string) => {
    abortRef.current?.abort();
    setActiveId(id);
    clearTransient();
  }, []);

  const deleteThread = useCallback(
    (id: string) => {
      if (id === activeId) {
        abortRef.current?.abort();
        setActiveId(null);
      }
      setThreads((prev) => prev.filter((t) => t.id !== id));
    },
    [activeId],
  );

  return {
    convo,
    hasConversation,
    activeId,
    threads,
    input,
    setInput,
    busy,
    liveText,
    activeTool,
    error,
    unavailable,
    send,
    stop,
    reset,
    openThread,
    deleteThread,
    ensureModel,
  };
}
