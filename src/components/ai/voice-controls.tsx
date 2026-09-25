"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult:
    | ((event: { results?: Array<Array<{ transcript: string }>> }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface WindowWithSpeech {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

function emptySubscribe() {
  return () => {};
}

function useSpeechRecognitionSupported(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => {
      if (typeof window === "undefined") return false;
      const win = window as unknown as WindowWithSpeech;
      return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
    },
    () => false
  );
}

function useSpeechSynthesisSupported(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false
  );
}

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

/**
 * Voice input microphone button using the browser SpeechRecognition API.
 * Request microphone permission only upon user click.
 * Provides accessible feedback and visual recording pulse.
 */
export function VoiceInputButton({
  onTranscript,
  disabled = false,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const isSupported = useSpeechRecognitionSupported();
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const toggleListening = useCallback(() => {
    if (!isSupported || disabled) return;

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const win = window as unknown as WindowWithSpeech;
      const RecognitionConstructor =
        win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!RecognitionConstructor) return;

      const recognition = new RecognitionConstructor();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          onTranscript(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [isSupported, disabled, isListening, onTranscript]);

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      title={isListening ? "Stop listening" : "Speak your weather question"}
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
      className={`relative inline-flex items-center justify-center p-2 rounded-xl border transition-all ${
        isListening
          ? "bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse ring-2 ring-rose-500/30"
          : "bg-surface-elevated/40 hover:bg-surface-elevated/80 border-surface-border/50 text-foreground-muted hover:text-foreground"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {isListening ? (
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3z"
          />
        </svg>
      )}
    </button>
  );
}

interface VoicePlayerProps {
  text: string;
}

/**
 * Text-to-speech speaker button using the browser SpeechSynthesis API.
 */
export function VoicePlayerButton({ text }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isSupported = useSpeechSynthesisSupported();

  const toggleSpeak = useCallback(() => {
    if (!isSupported || !text) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown symbols for cleaner speech
    const cleanText = text
      .replace(/[*_#`[\]]/g, "")
      .replace(/https?:\/\/\S+/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = 1.0;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }, [isSupported, text, isPlaying]);

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleSpeak}
      title={isPlaying ? "Stop speech" : "Read response aloud"}
      aria-label={isPlaying ? "Stop audio" : "Play audio of response"}
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg border transition-all ${
        isPlaying
          ? "bg-accent-primary/20 border-accent-primary/40 text-accent-primary animate-pulse"
          : "bg-surface-elevated/30 hover:bg-surface-elevated/70 border-surface-border/40 text-foreground-muted hover:text-foreground"
      }`}
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75z"
        />
      </svg>
      <span>{isPlaying ? "Speaking..." : "Listen"}</span>
    </button>
  );
}
