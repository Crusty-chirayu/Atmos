/**
 * Voice utilities for ATMOS AI Text-to-Speech & Speech Recognition.
 */

const FEMALE_VOICE_PREFERENCES = [
  // High-fidelity neural & online female voices
  "jenny",
  "aria",
  "neerja",
  "sonia",
  "zira",
  "samantha",
  "victoria",
  "karen",
  "moira",
  "tessa",
  "google uk english female",
  "google us english female",
  "female",
];

/**
 * Selects the highest quality natural-sounding female voice from available speech synthesis voices.
 */
export function selectNaturalFemaleVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // 1. Search for preferred natural female voice names (English)
  for (const preferred of FEMALE_VOICE_PREFERENCES) {
    const match = voices.find(
      (v) =>
        v.name.toLowerCase().includes(preferred) &&
        v.lang.toLowerCase().startsWith("en")
    );
    if (match) return match;
  }

  // 2. Search for any English voice with female indicator
  const englishFemale = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith("en") &&
      (v.name.toLowerCase().includes("woman") ||
        v.name.toLowerCase().includes("female") ||
        v.name.toLowerCase().includes("girl"))
  );
  if (englishFemale) return englishFemale;

  // 3. Fallback to any English voice (en-US, en-GB, en-IN, etc.)
  const englishVoice =
    voices.find((v) => v.lang === "en-US") ||
    voices.find((v) => v.lang === "en-GB") ||
    voices.find((v) => v.lang === "en-IN") ||
    voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  if (englishVoice) return englishVoice;

  // 4. Default voice
  return voices.find((v) => v.default) || voices[0] || null;
}

/**
 * Normalizes assistant Markdown responses into natural, human-friendly spoken text.
 * Strips raw markdown asterisks, hashes, and converts weather units & symbols into spoken words.
 */
export function normalizeTextForSpeech(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Strip code blocks, markdown links, and raw URLs
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  cleaned = cleaned.replace(/\[([^\]]+)\]/g, "$1");
  cleaned = cleaned.replace(/https?:\/\/\S+/g, "");

  // 2. Strip Markdown headers, horizontal rules, blockquotes
  cleaned = cleaned.replace(/^[#\s\-*]{2,}/gm, "");
  cleaned = cleaned.replace(/^#+\s+/gm, "");
  cleaned = cleaned.replace(/^>\s+/gm, "");

  // 3. Strip bold, italics, strikethrough delimiters (**text** -> text, *text* -> text)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");
  cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");

  // 4. Convert markdown list bullets into natural comma pauses
  cleaned = cleaned.replace(/^[-*•]\s+/gm, "");
  cleaned = cleaned.replace(/^\d+\.\s+/gm, "");

  // 5. Expand weather units into natural spoken language
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*°C\b/gi, "$1 degrees Celsius");
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*°F\b/gi, "$1 degrees Fahrenheit");
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*°\b/g, "$1 degrees");
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*km\/h\b/gi, "$1 kilometers per hour");
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*mph\b/gi, "$1 miles per hour");
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*m\/s\b/gi, "$1 meters per second");
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*mm\b/gi, "$1 millimeters");
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*hPa\b/gi, "$1 hectopascals");
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*%/g, "$1 percent");

  // 6. Expand wind directions
  cleaned = cleaned.replace(/\bSSW\b/g, "South-Southwest");
  cleaned = cleaned.replace(/\bSSE\b/g, "South-Southeast");
  cleaned = cleaned.replace(/\bNNW\b/g, "North-Northwest");
  cleaned = cleaned.replace(/\bNNE\b/g, "North-Northeast");
  cleaned = cleaned.replace(/\bWSW\b/g, "West-Southwest");
  cleaned = cleaned.replace(/\bWNW\b/g, "West-Northwest");
  cleaned = cleaned.replace(/\bENE\b/g, "East-Northeast");
  cleaned = cleaned.replace(/\bESE\b/g, "East-Southeast");
  cleaned = cleaned.replace(/\bSW\b/g, "Southwest");
  cleaned = cleaned.replace(/\bSE\b/g, "Southeast");
  cleaned = cleaned.replace(/\bNW\b/g, "Northwest");
  cleaned = cleaned.replace(/\bNE\b/g, "Northeast");

  // 7. Clean coordinates notation e.g. (12.97°N, 77.59°E)
  cleaned = cleaned.replace(
    /\((\d+(?:\.\d+)?)°?\s*N,\s*(\d+(?:\.\d+)?)°?\s*E\)/gi,
    "$1 degrees North, $2 degrees East"
  );
  cleaned = cleaned.replace(
    /\((\d+(?:\.\d+)?)°?\s*S,\s*(\d+(?:\.\d+)?)°?\s*W\)/gi,
    "$1 degrees South, $2 degrees West"
  );

  // 8. Normalize multiple spaces and extra linebreaks into smooth sentence pauses
  cleaned = cleaned.replace(/\n{2,}/g, ". ");
  cleaned = cleaned.replace(/\n/g, ", ");
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  return cleaned.trim();
}
