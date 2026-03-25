"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Web Speech API type declarations (not in all TS lib versions)
// ---------------------------------------------------------------------------

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare const SpeechRecognition: {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
};

// Augment window to accept webkit-prefixed SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition | undefined;
    webkitSpeechRecognition: typeof SpeechRecognition | undefined;
  }
}

export interface UseVoiceInputOptions {
  /** BCP-47 locale. Defaults to he-IL (Hebrew). */
  lang?: string;
  /** Keep accumulating transcript across multiple pauses (continuous mode). Default: false. */
  continuous?: boolean;
  /** Fire onResult on interim results too. Default: false. */
  interimResults?: boolean;
}

export interface UseVoiceInputResult {
  /** Whether the microphone is currently open and listening. */
  isListening: boolean;
  /** The recognised transcript so far. Resets on each new startListening call. */
  transcript: string;
  /** Start listening. No-op if already listening or not supported. */
  startListening: () => void;
  /** Stop listening manually. No-op if not listening. */
  stopListening: () => void;
  /** True when the browser exposes SpeechRecognition (standard or webkit). */
  isSupported: boolean;
  /** Last error message, or null when there is none. */
  error: string | null;
}

/**
 * Thin wrapper around the Web Speech API (SpeechRecognition).
 *
 * Browser support:
 *  - Chrome / Edge (desktop + Android): full support, no flag needed.
 *  - Safari ≥ 14.5 (iOS + macOS): webkitSpeechRecognition, works on HTTPS only.
 *  - Firefox: NOT supported (as of 2026). Falls back gracefully (isSupported=false).
 *
 * Hebrew (he-IL) notes:
 *  - Works well on Chrome/Android and Chrome Desktop.
 *  - Safari/iOS: he-IL is recognised but accuracy is lower than en-US.
 *  - Requires HTTPS (or localhost) — getUserMedia constraint.
 *  - On iOS, recognition pauses when the screen locks; handle with onend.
 *  - The API is cloud-based on Chrome (Google servers) — privacy consideration.
 *
 * Gotchas:
 *  - SpeechRecognition fires `onend` after a pause (~2-3 s silence). For a mic
 *    button use-case this is fine; for continuous dictation set continuous=true.
 *  - On Android Chrome the first call may trigger a microphone permission prompt.
 *  - Calling abort() mid-result drops the current utterance; stop() commits it.
 */
export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputResult {
  const { lang = "he-IL", continuous = false, interimResults = false } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Detect support once (stable across renders)
  const isSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition ?? window.webkitSpeechRecognition);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("הדפדפן שלך אינו תומך בזיהוי קול");
      return;
    }
    if (recognitionRef.current) return; // already listening

    setError(null);
    setTranscript("");

    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(final || interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'aborted' fires when we call stop() ourselves — not a real error
      if (event.error === "aborted") return;

      const errorMessages: Record<string, string> = {
        "no-speech": "לא זוהתה דיבור. נסה שוב.",
        "audio-capture": "לא נמצא מיקרופון",
        "not-allowed": "גישה למיקרופון נדחתה",
        network: "שגיאת רשת בזיהוי קול",
        "service-not-allowed": "שירות הקול אינו זמין",
        "language-not-supported": "שפה לא נתמכת",
      };
      setError(errorMessages[event.error] ?? `שגיאה: ${event.error}`);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, lang, continuous, interimResults]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  return { isListening, transcript, startListening, stopListening, isSupported, error };
}
