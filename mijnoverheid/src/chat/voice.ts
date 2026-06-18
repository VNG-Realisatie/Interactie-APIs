// Nederlandse spraak via de browser-eigen Web Speech API. Gratis, geen proxy/key.
// STT (SpeechRecognition) werkt in Chrome/Edge/Safari (niet Firefox); TTS breder.

const SR: any =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export const sttSupported = !!SR;
export const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

// Maakt een Nederlandse spraakherkenner (live, doorlopend).
export function createRecognition(): any | null {
  if (!SR) return null;
  const rec = new SR();
  rec.lang = "nl-NL";
  rec.interimResults = true;
  rec.continuous = true;
  return rec;
}

// Nederlandse stem kiezen (lijst laadt soms async, dus we cachen).
let cachedVoices: SpeechSynthesisVoice[] = [];
function dutchVoice(): SpeechSynthesisVoice | null {
  if (!ttsSupported) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) cachedVoices = voices;
  return cachedVoices.find((v) => v.lang?.toLowerCase().startsWith("nl")) || null;
}
if (ttsSupported) {
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  } catch {
    /* niet kritiek */
  }
}

// Spreekt tekst uit met een Nederlandse stem; roept onDone aan bij einde.
export function speakDutch(text: string, onDone: () => void): void {
  if (!ttsSupported || !text.trim()) {
    onDone();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "nl-NL";
  const v = dutchVoice();
  if (v) u.voice = v;
  u.onend = onDone;
  u.onerror = onDone;
  window.speechSynthesis.speak(u);
}

export function cancelSpeech(): void {
  if (ttsSupported) window.speechSynthesis.cancel();
}

// Markdown → leesbare tekst voor TTS (geen sterretjes/pipes voorlezen).
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}
