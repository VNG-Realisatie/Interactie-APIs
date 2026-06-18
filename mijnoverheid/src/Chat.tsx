import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "./chat/llm";
import { SUGGESTIONS, type ChatApi } from "./chat/useChat";
import type { VoiceApi } from "./chat/useVoice";
import { toolLabels } from "./chat/tools";
import { renderMarkdown } from "./chat/markdown";
import { useStickToBottom } from "./chat/useStickToBottom";

// Signaal dat verandert bij een nieuw bericht of een gespreksswitch, zodat de
// auto-scroll dan weer onderaan plakt.
function scrollSignal(chat: ChatApi): string {
  const userCount = chat.convo.reduce((n, m) => (m.role === "user" ? n + 1 : n), 0);
  return `${chat.activeId ?? "new"}:${userCount}`;
}

/* ─────────────────────────────  Zwevend widget  ───────────────────────────── */

export function Chat({
  chat,
  voice,
  hideLauncher,
}: {
  chat: ChatApi;
  voice: VoiceApi;
  hideLauncher?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useStickToBottom({
    ref: bodyRef,
    active: open && chat.hasConversation,
    signal: scrollSignal(chat),
  });

  // Esc verlaat de full-screen weergave (terug naar gedockt).
  useEffect(() => {
    if (!open || !expanded) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, expanded]);

  return (
    <>
      {!open && !hideLauncher && (
        <button
          type="button"
          className="chat-launcher"
          onClick={() => setOpen(true)}
          aria-label="Open de assistent"
        >
          <ChatIcon />
          <span className="chat-launcher__label">Hulp</span>
        </button>
      )}

      {open && (
        <div
          className={`chat-panel${expanded ? " chat-panel--full" : ""}`}
          role="dialog"
          aria-label="Assistent"
        >
          <header className="chat-header">
            <span className="chat-header__avatar" aria-hidden="true">
              <ChatIcon />
            </span>
            <span className="chat-header__title">
              <strong>Assistent</strong>
              <small>
                {chat.unavailable ? "Niet beschikbaar" : "Beantwoordt vragen over uw zaken"}
              </small>
            </span>
            <SpeakerToggle voice={voice} className="chat-header__btn" />
            {chat.hasConversation && (
              <button
                type="button"
                className="chat-header__btn"
                onClick={chat.reset}
                aria-label="Nieuw gesprek"
                title="Nieuw gesprek"
              >
                <NewChatIcon />
              </button>
            )}
            <button
              type="button"
              className="chat-header__btn"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Verklein" : "Volledig scherm"}
              title={expanded ? "Verklein" : "Volledig scherm"}
            >
              {expanded ? <CollapseIcon /> : <ExpandIcon />}
            </button>
            <button
              type="button"
              className="chat-header__btn"
              onClick={() => setOpen(false)}
              aria-label="Sluiten"
              title="Sluiten"
            >
              &times;
            </button>
          </header>

          <div className="chat-body" ref={bodyRef}>
            {chat.unavailable ? (
              <UnavailableNote />
            ) : !chat.hasConversation ? (
              <div className="chat-intro">
                <div className="chat-intro__avatar" aria-hidden="true">
                  <ChatIcon />
                </div>
                <p className="chat-intro__greet">
                  Hallo Jeroen, ik ben uw aanspreekpunt voor de hele overheid — van gemeente tot
                  Rijk. Stel gerust een vraag over uw taken, zaken, berichten of afspraken.
                </p>
                <ChatSuggestions chat={chat} />
              </div>
            ) : (
              <ChatThread chat={chat} />
            )}
          </div>

          {!chat.unavailable && (
            <ChatComposer chat={chat} autoFocus voice={voice} enableSpacePtt />
          )}
        </div>
      )}
    </>
  );
}

/* ─────────────────  Herbruikbare deel-componenten (ook voor Home)  ───────────── */

// De berichtenstroom: gebruikersvragen, assistent-antwoorden (markdown),
// tool-chips, live-streaming en de typ-indicator.
export function ChatThread({ chat }: { chat: ChatApi }) {
  const bubbles = useMemo(() => renderBubbles(chat.convo), [chat.convo]);

  return (
    <div className="chat-thread">
      {bubbles.map((b, idx) =>
        b.kind === "tool" ? (
          <div key={idx} className="chat-tool-chip chat-tool-chip--done">
            <CheckIcon />
            {toolLabels[b.name] || b.name}
          </div>
        ) : (
          <div key={idx} className={`chat-msg chat-msg--${b.role}`}>
            {b.role === "assistant" ? (
              <div
                className="chat-msg__bubble chat-markdown"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(b.text) }}
              />
            ) : (
              <div className="chat-msg__bubble">{b.text}</div>
            )}
          </div>
        ),
      )}

      {chat.activeTool && (
        <div className="chat-tool-chip">
          <span className="chat-tool-spinner" aria-hidden="true" />
          {toolLabels[chat.activeTool] || chat.activeTool}…
        </div>
      )}

      {chat.liveText && (
        <div className="chat-msg chat-msg--assistant">
          <div
            className="chat-msg__bubble chat-markdown"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(chat.liveText) + cursor }}
          />
        </div>
      )}

      {chat.busy && !chat.liveText && !chat.activeTool && (
        <div className="chat-msg chat-msg--assistant">
          <div className="chat-msg__bubble">
            <span className="chat-typing" aria-label="Aan het typen">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
      )}

      {chat.error && <div className="chat-error">{chat.error}</div>}
    </div>
  );
}

// Typt voorbeeldvragen één voor één in en weer uit (geanimeerde placeholder).
function useTypewriter(phrases: string[] | undefined, active: boolean): string {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!active || !phrases || phrases.length === 0) {
      setText("");
      return undefined;
    }
    let phrase = 0;
    let char = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = phrases[phrase];
      if (!deleting) {
        char++;
        setText(full.slice(0, char));
        if (char >= full.length) {
          deleting = true;
          timer = setTimeout(tick, 1900);
          return;
        }
        timer = setTimeout(tick, 45);
      } else {
        char--;
        setText(full.slice(0, Math.max(0, char)));
        if (char <= 0) {
          deleting = false;
          phrase = (phrase + 1) % phrases.length;
          timer = setTimeout(tick, 350);
          return;
        }
        timer = setTimeout(tick, 22);
      }
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [active, phrases]);
  return text;
}

// Het invoerveld. variant "hero" maakt 'm groot en prominent (homepagina).
export function ChatComposer({
  chat,
  variant = "docked",
  placeholder = "Stel een vraag…",
  rotatingPlaceholders,
  autoFocus = false,
  afterSend,
  forceNew = false,
  voice,
  enableSpacePtt = false,
}: {
  chat: ChatApi;
  variant?: "docked" | "hero";
  placeholder?: string;
  // Voorbeeldvragen die geanimeerd in/uit de placeholder typen (zolang leeg).
  rotatingPlaceholders?: string[];
  autoFocus?: boolean;
  // Aangeroepen ná een geslaagde verzending (bijv. om naar /chat te navigeren).
  afterSend?: () => void;
  // Start altijd een nieuw gesprek (homepagina).
  forceNew?: boolean;
  // Spraakbediening (optioneel).
  voice?: VoiceApi;
  // Spatie ingedrukt houden = praten (alleen op de actieve chat-oppervlakken).
  enableSpacePtt?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const maxHeight = variant === "hero" ? 200 : 120;

  const submit = (text: string) => {
    if (!text.trim() || chat.busy) return;
    chat.send(text, forceNew);
    afterSend?.();
  };

  const onInterim = (t: string) => chat.setInput(t);

  // Push-to-talk met de spatiebalk: ingedrukt houden om te praten, loslaten om
  // te versturen. Alleen als er geen tekstveld focus heeft (anders typt spatie).
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    if (!enableSpacePtt || !voice?.supported) return undefined;
    const editable = (el: Element | null) =>
      !!el &&
      (el.tagName === "TEXTAREA" ||
        el.tagName === "INPUT" ||
        (el as HTMLElement).isContentEditable);
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || editable(document.activeElement)) return;
      if (voice.recording || chat.busy) return;
      e.preventDefault();
      voice.startRecording(onInterim);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !voice.recording) return;
      e.preventDefault();
      voice.stopRecording((t) => submitRef.current(t));
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [enableSpacePtt, voice, chat.busy]);

  const rotating = !!rotatingPlaceholders && !chat.input && !voice?.recording;
  const typed = useTypewriter(rotatingPlaceholders, rotating);
  const effectivePlaceholder = voice?.recording
    ? "Aan het luisteren…"
    : rotating
      ? `${typed}▏`
      : placeholder;

  return (
    <form
      className={`chat-composer${variant === "hero" ? " chat-composer--hero" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        submit(chat.input);
      }}
    >
      {voice?.supported && (
        <button
          type="button"
          className={`chat-mic${voice.recording ? " is-recording" : ""}`}
          onClick={() => {
            if (chat.busy) return;
            if (voice.recording) voice.stopRecording(submit);
            else voice.startRecording(onInterim);
          }}
          aria-label={voice.recording ? "Opname stoppen en versturen" : "Inspreken"}
          title={enableSpacePtt ? "Inspreken (of spatie ingedrukt houden)" : "Inspreken"}
        >
          <MicIcon />
        </button>
      )}
      <textarea
        ref={ref}
        className="chat-composer__input"
        placeholder={effectivePlaceholder}
        value={chat.input}
        rows={1}
        disabled={chat.busy}
        onChange={(e) => {
          chat.setInput(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, maxHeight)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit(chat.input);
          }
        }}
      />
      {chat.busy ? (
        <button
          type="button"
          className="chat-composer__btn chat-composer__btn--stop"
          onClick={chat.stop}
          aria-label="Stoppen"
        >
          <StopIcon />
        </button>
      ) : (
        <button
          type="submit"
          className="chat-composer__btn"
          disabled={!chat.input.trim()}
          aria-label="Versturen"
        >
          <SendIcon />
        </button>
      )}
    </form>
  );
}

// Klikbare voorbeeldvragen.
export function ChatSuggestions({
  chat,
  afterSend,
  forceNew = false,
}: {
  chat: ChatApi;
  afterSend?: () => void;
  forceNew?: boolean;
}) {
  return (
    <div className="chat-suggestions">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          type="button"
          className="chat-suggestion"
          onClick={() => {
            if (chat.busy) return;
            chat.send(s, forceNew);
            afterSend?.();
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// Knop om gesproken antwoorden aan/uit te zetten (luidspreker).
export function SpeakerToggle({ voice, className }: { voice: VoiceApi; className?: string }) {
  if (!voice.canSpeak) return null;
  return (
    <button
      type="button"
      className={`chat-speaker${voice.speakReplies ? " is-on" : ""}${className ? ` ${className}` : ""}`}
      onClick={voice.toggleSpeakReplies}
      aria-pressed={voice.speakReplies}
      aria-label={voice.speakReplies ? "Gesproken antwoorden uitzetten" : "Gesproken antwoorden aanzetten"}
      title={voice.speakReplies ? "Gesproken antwoorden: aan" : "Gesproken antwoorden: uit"}
    >
      {voice.speakReplies ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
    </button>
  );
}

export function UnavailableNote() {
  return (
    <div className="chat-intro">
      <p className="chat-intro__greet">De assistent is op dit moment niet beschikbaar.</p>
      <p className="chat-help-list">
        De AI-dienst is nog niet geconfigureerd. Stel de OpenRouter-API-key in
        (<code>OPENROUTER_API_KEY</code>) en probeer het opnieuw.
      </p>
    </div>
  );
}

const cursor = '<span class="chat-cursor"></span>';

type Bubble =
  | { kind: "msg"; role: "user" | "assistant"; text: string }
  | { kind: "tool"; name: string };

// Leidt de zichtbare bellen af uit de modelconversatie: gebruikersvragen,
// assistant-antwoorden, en afgeronde tool-aanroepen als chips.
function renderBubbles(convo: ChatMessage[]): Bubble[] {
  const out: Bubble[] = [];
  for (const m of convo) {
    if (m.role === "user") {
      out.push({ kind: "msg", role: "user", text: m.content });
    } else if (m.role === "assistant") {
      if (m.tool_calls?.length) {
        for (const tc of m.tool_calls) out.push({ kind: "tool", name: tc.function.name });
      }
      if (m.content.trim()) out.push({ kind: "msg", role: "assistant", text: m.content });
    }
    // 'tool'- en 'system'-berichten tonen we niet apart.
  }
  return out;
}

/* — Inline iconen (de app-sprite kent geen chat-iconen) — */

export function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3c5 0 9 3.13 9 7 0 3.87-4 7-9 7a11 11 0 0 1-2.6-.31L5 19l.94-3.16C4.13 14.6 3 12.9 3 10c0-3.87 4-7 9-7Z"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="currentColor" d="M3 11.5 21 3l-8.5 18-2.2-7.3L3 11.5Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="none"
        d="M12 5v14m-7-7h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"
      />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path
        d="M6 11a6 6 0 0 0 12 0M12 17v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpeakerOnIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M4 9v6h3l5 4V5L7 9H4Z" />
      <path
        d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7 7 0 0 1 0 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M4 9v6h3l5 4V5L7 9H4Z" />
      <path
        d="M16 9l5 6M21 9l-5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
