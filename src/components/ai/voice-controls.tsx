"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useSyncExternalStore,
} from "react";
import {
  selectNaturalFemaleVoice,
  normalizeTextForSpeech,
} from "@/lib/ai/voice/voice-utils";

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult:
    | ((event: { results?: Array<Array<{ transcript: string }>> }) => void)
    | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
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
 * Microphone voice input button with state indicators, permission handling,
 * and error feedback for Windows/Chromium/WebKit browsers.
 */
export function VoiceInputButton({
  onTranscript,
  disabled = false,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const isSupported = useSpeechRecognitionSupported();
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = useCallback((msg: string, durationMs = 4000) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedbackMessage(msg);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackMessage(null);
    }, durationMs);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const toggleListening = useCallback(async () => {
    if (!isSupported || disabled) return;

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
      setIsListening(false);
      setFeedbackMessage(null);
      return;
    }

    try {
      const win = window as unknown as WindowWithSpeech;
      const RecognitionConstructor =
        win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!RecognitionConstructor) {
        showFeedback("Voice input is not supported in this browser.");
        return;
      }

      // Proactively test for microphone permissions in modern browsers
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          // Release immediately; SpeechRecognition will request access cleanly
          for (const track of stream.getTracks()) track.stop();
        } catch (mediaErr: unknown) {
          const errName = (mediaErr as Error)?.name || "";
          if (
            errName === "NotAllowedError" ||
            errName === "PermissionDeniedError"
          ) {
            showFeedback(
              "Microphone access blocked. Enable permissions in your browser URL bar."
            );
            return;
          }
          if (
            errName === "NotFoundError" ||
            errName === "DevicesNotFoundError"
          ) {
            showFeedback(
              "No microphone detected. Check your Windows input device settings."
            );
            return;
          }
        }
      }

      const recognition = new RecognitionConstructor();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        showFeedback("Listening… Speak now", 3000);
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript && transcript.trim().length > 0) {
          onTranscript(transcript.trim());
          showFeedback("Speech recognized", 1500);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        const errType = event?.error;
        if (errType === "not-allowed" || errType === "service-not-allowed") {
          showFeedback(
            "Microphone permission denied. Allow microphone access to speak."
          );
        } else if (errType === "audio-capture") {
          showFeedback(
            "No microphone detected. Check your audio device settings."
          );
        } else if (errType === "network") {
          showFeedback(
            "Speech recognition service unavailable. Please check connection."
          );
        } else if (errType === "no-speech") {
          showFeedback("No speech heard. Tap microphone to try again.", 2500);
        } else {
          showFeedback("Voice input canceled.", 2000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      showFeedback("Unable to start microphone. Please try typing.");
    }
  }, [isSupported, disabled, isListening, onTranscript, showFeedback]);

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Voice recognition is not supported in this browser (requires Chromium/WebKit)"
        aria-label="Voice input not supported in this browser"
        className="relative inline-flex items-center justify-center p-2 rounded-md border border-[#E5E7EB] bg-[#F7F7F7] text-[#9CA3AF] cursor-not-allowed opacity-50"
      >
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
      </button>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      {feedbackMessage && (
        <div
          role="status"
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 text-[11px] font-medium bg-[#1F2937] text-white rounded shadow-lg whitespace-nowrap z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          {feedbackMessage}
        </div>
      )}
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? "Stop listening" : "Speak your weather question"}
        aria-label={isListening ? "Stop voice input" : "Start voice input"}
        className={`relative inline-flex items-center justify-center p-2 rounded-md border transition-all ${
          isListening
            ? "bg-[#FFF5F5] border-[#FED7D7] text-[#D94841] animate-pulse ring-2 ring-[#FED7D7]"
            : "bg-white hover:bg-[#F7F7F7] border-[#E5E7EB] text-[#6B7280] hover:text-[#222222] shadow-xs"
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {isListening ? (
          <svg
            className="w-4 h-4 text-[#D94841]"
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
            strokeWidth={2}
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
    </div>
  );
}

interface VoicePlayerProps {
  text: string;
}

/**
 * Text-to-speech speaker button with natural female voice priority,
 * speech normalization (no raw markdown, proper units), and clean playback controls.
 */
export function VoicePlayerButton({ text }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const isSupported = useSpeechSynthesisSupported();

  // Load available speech synthesis voices asynchronously
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  // Cancel any active speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSpeak = useCallback(() => {
    if (!isSupported || !text) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Cancel any previous utterance first to avoid overlapping speech
    window.speechSynthesis.cancel();

    const spokenText = normalizeTextForSpeech(text);
    if (!spokenText) return;

    const utterance = new SpeechSynthesisUtterance(spokenText);

    // Select natural female voice
    const chosenVoice = selectNaturalFemaleVoice(voices);
    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    } else {
      utterance.lang = "en-US";
    }

    // Tune for clear, calm, natural cadence
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }, [isSupported, text, isPlaying, voices]);

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleSpeak}
      title={isPlaying ? "Stop audio" : "Listen to clear voice narration"}
      aria-label={isPlaying ? "Stop audio" : "Play audio of response"}
      className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border transition-all ${
        isPlaying
          ? "bg-[#FFF9E6] border-[#FFC928] text-[#222222] font-semibold"
          : "bg-white hover:bg-[#F7F7F7] border-[#E5E7EB] text-[#6B7280] hover:text-[#222222] shadow-xs"
      }`}
    >
      <svg
        className={`w-3.5 h-3.5 ${isPlaying ? "text-[#FFC928] animate-pulse" : "currentColor"}`}
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
      <span>{isPlaying ? "Stop" : "Listen"}</span>
    </button>
  );
}
