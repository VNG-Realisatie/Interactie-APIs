import { useCallback, useRef, useState } from "react";
import {
  sttSupported,
  ttsSupported,
  createRecognition,
  speakDutch,
  cancelSpeech,
  stripMarkdown,
} from "./voice";

// v2: nieuwe sleutel zodat gesproken antwoorden voor iedereen op UIT resetten.
const SPEAK_KEY = "mijnoverheid-voice-speak-v2";

export interface VoiceApi {
  supported: boolean; // spraakherkenning (mic)
  canSpeak: boolean; // gesproken antwoorden (TTS)
  recording: boolean;
  speaking: boolean;
  speakReplies: boolean;
  error: string | null;
  // Start herkenning; onInterim krijgt de live (deel)transcriptie.
  startRecording: (onInterim?: (text: string) => void) => void;
  // Stop herkenning; onText krijgt de uiteindelijke transcriptie.
  stopRecording: (onText: (text: string) => void) => void;
  cancelRecording: () => void;
  toggleSpeakReplies: () => void;
  speakText: (text: string) => void;
  stopSpeak: () => void;
}

export function useVoice(): VoiceApi {
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(SPEAK_KEY) === "1",
  );
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<any>(null);
  const finalRef = useRef("");
  const interimRef = useRef<((t: string) => void) | null>(null);
  const sendRef = useRef<((t: string) => void) | null>(null);

  const startRecording = useCallback((onInterim?: (text: string) => void) => {
    if (!sttSupported) {
      setError("Spraakherkenning wordt niet ondersteund in deze browser.");
      return;
    }
    if (recRef.current) return;
    setError(null);
    finalRef.current = "";
    interimRef.current = onInterim ?? null;
    sendRef.current = null;

    const rec = createRecognition();
    if (!rec) return;
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      interimRef.current?.((finalRef.current + interim).trim());
    };
    rec.onerror = (e: any) => {
      setError(
        e?.error === "not-allowed" || e?.error === "service-not-allowed"
          ? "Geen toegang tot de microfoon."
          : "Spraakherkenning mislukte.",
      );
    };
    rec.onend = () => {
      setRecording(false);
      recRef.current = null;
      const text = finalRef.current.trim();
      const send = sendRef.current;
      sendRef.current = null;
      if (send && text) send(text);
    };

    recRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch {
      recRef.current = null;
      setError("Kon de opname niet starten.");
    }
  }, []);

  const stopRecording = useCallback((onText: (text: string) => void) => {
    const rec = recRef.current;
    if (!rec) return;
    sendRef.current = onText;
    try {
      rec.stop(); // → onend levert de uiteindelijke tekst
    } catch {
      /* onend vuurt alsnog */
    }
  }, []);

  const cancelRecording = useCallback(() => {
    const rec = recRef.current;
    sendRef.current = null;
    interimRef.current = null;
    recRef.current = null;
    if (rec) {
      try {
        rec.abort();
      } catch {
        /* genegeerd */
      }
    }
    setRecording(false);
  }, []);

  const speakText = useCallback((text: string) => {
    if (!ttsSupported) return;
    const clean = stripMarkdown(text);
    if (!clean) return;
    setSpeaking(true);
    speakDutch(clean, () => setSpeaking(false));
  }, []);

  const stopSpeak = useCallback(() => {
    cancelSpeech();
    setSpeaking(false);
  }, []);

  const toggleSpeakReplies = useCallback(() => {
    setSpeakReplies((v) => {
      const next = !v;
      try {
        localStorage.setItem(SPEAK_KEY, next ? "1" : "0");
      } catch {
        /* opslag geblokkeerd */
      }
      if (!next) cancelSpeech();
      return next;
    });
  }, []);

  return {
    supported: sttSupported,
    canSpeak: ttsSupported,
    recording,
    speaking,
    speakReplies,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    toggleSpeakReplies,
    speakText,
    stopSpeak,
  };
}
