import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractCoordinates,
  extractTargetCity,
  isGeneralNonWeatherQuery,
} from "@/lib/ai/context/intent";
import {
  normalizeTextForSpeech,
  selectNaturalFemaleVoice,
} from "@/lib/ai/voice/voice-utils";

describe("AI Intent & Entity Extraction", () => {
  it("extracts arbitrary decimal coordinates from natural language queries", () => {
    const res1 = extractCoordinates("What is the weather at 27.9881, 86.9250?");
    assert.ok(res1);
    assert.equal(res1?.latitude, 27.9881);
    assert.equal(res1?.longitude, 86.925);

    const res2 = extractCoordinates("Conditions around lat: -33.8688, lon: 151.2093 please");
    assert.ok(res2);
    assert.equal(res2?.latitude, -33.8688);
    assert.equal(res2?.longitude, 151.2093);

    const res3 = extractCoordinates("Just some regular text without numbers");
    assert.equal(res3, null);
  });

  it("extracts target city and origin from single and multi-city queries", () => {
    const res1 = extractTargetCity("What is the weather in Bangalore?");
    assert.equal(res1.target, "Bangalore");
    assert.equal(res1.isTravel, false);

    const res2 = extractTargetCity("Will it rain in Mumbai today?");
    assert.equal(res2.target, "Mumbai");
    assert.equal(res2.isTravel, false);

    const res3 = extractTargetCity("I am in Bangalore and travelling to Mumbai tomorrow");
    assert.equal(res3.target, "Mumbai");
    assert.equal(res3.origin, "Bangalore");
    assert.equal(res3.isTravel, true);

    const res4 = extractTargetCity("Flight from Delhi to Tokyo next Monday");
    assert.equal(res4.target, "Tokyo");
    assert.equal(res4.origin, "Delhi");
    assert.equal(res4.isTravel, true);
  });

  it("identifies general knowledge, math, and non-weather queries", () => {
    assert.equal(isGeneralNonWeatherQuery("calculate 15% of 800"), true);
    assert.equal(isGeneralNonWeatherQuery("what is 45 * 20?"), true);
    assert.equal(isGeneralNonWeatherQuery("how does a jet engine work?"), true);
    assert.equal(isGeneralNonWeatherQuery("tell me a joke about clouds"), true);
    assert.equal(isGeneralNonWeatherQuery("what is the capital of France?"), true);

    assert.equal(isGeneralNonWeatherQuery("what is the weather in Bangalore?"), false);
    assert.equal(isGeneralNonWeatherQuery("will it rain today?"), false);
    assert.equal(isGeneralNonWeatherQuery("forecast for tomorrow"), false);
  });
});

describe("Voice Text Normalization & Synthesis Utilities", () => {
  it("strips markdown formatting and punctuation noise", () => {
    const raw = "### Weather Update\n\nHere is the **summary** for *today*:\n- Item 1\n- Item 2\n\nVisit [ATMOS](https://atmos.local)";
    const normalized = normalizeTextForSpeech(raw);

    assert.ok(!normalized.includes("#"));
    assert.ok(!normalized.includes("*"));
    assert.ok(!normalized.includes("["));
    assert.ok(!normalized.includes("http"));
    assert.ok(normalized.includes("Weather Update"));
    assert.ok(normalized.includes("summary"));
  });

  it("expands meteorological abbreviations and units for natural speech", () => {
    const input = "Temp: 25°C, rain: 2 mm, wind: 15 km/h from SSW with 60% humidity and 1013 hPa pressure.";
    const output = normalizeTextForSpeech(input);

    assert.ok(output.includes("25 degrees Celsius"));
    assert.ok(output.includes("2 millimeters"));
    assert.ok(output.includes("15 kilometers per hour"));
    assert.ok(output.includes("South-Southwest"));
    assert.ok(output.includes("60 percent"));
    assert.ok(output.includes("1013 hectopascals"));
  });

  it("selects natural female voices based on priority hierarchy", () => {
    const mockVoices = [
      { name: "Microsoft David - English (United States)", lang: "en-US", default: true } as SpeechSynthesisVoice,
      { name: "Microsoft Zira - English (United States)", lang: "en-US", default: false } as SpeechSynthesisVoice,
      { name: "Google US English Female", lang: "en-US", default: false } as SpeechSynthesisVoice,
      { name: "Microsoft Jenny Online (Natural) - English (United States)", lang: "en-US", default: false } as SpeechSynthesisVoice,
    ];

    const selected = selectNaturalFemaleVoice(mockVoices);
    assert.ok(selected);
    // Microsoft Jenny Online (Natural) is top priority in the preferred list
    assert.equal(selected?.name, "Microsoft Jenny Online (Natural) - English (United States)");
  });

  it("falls back gracefully when preferred voices are absent", () => {
    const mockVoices = [
      { name: "Generic Voice", lang: "fr-FR", default: true } as SpeechSynthesisVoice,
      { name: "English Speaker", lang: "en-GB", default: false } as SpeechSynthesisVoice,
    ];

    const selected = selectNaturalFemaleVoice(mockVoices);
    assert.ok(selected);
    assert.equal(selected?.name, "English Speaker");
  });
});
