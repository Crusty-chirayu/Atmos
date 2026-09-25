import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GeminiAdapter } from "@/lib/ai/providers/gemini/adapter";
import { WeatherGroundingSnapshot } from "@/lib/ai/domain/schemas";

describe("GeminiAdapter", () => {
  const mockSnapshot: WeatherGroundingSnapshot = {
    location: {
      name: "Reykjavik",
      country: "Iceland",
      latitude: 64.14,
      longitude: -21.94,
      timezone: "Atlantic/Reykjavik",
    },
    fetchedAt: "2026-09-26T12:00:00Z",
    units: {
      temperature: "°C",
      windSpeed: "kmh",
      precipitation: "mm",
      pressure: "hpa",
    },
    current: {
      temperature: 8.5,
      apparentTemperature: 5.2,
      conditionCode: 61,
      conditionLabel: "Slight rain",
      relativeHumidity: 88,
      windSpeed: 24.5,
      windDirection: 140,
      precipitation: 1.2,
      pressureMsl: 1004.2,
      uvIndex: 1,
      visibility: 10,
    },
  };

  it("correctly identifies unconfigured API key", () => {
    const adapter1 = new GeminiAdapter({ apiKey: "" });
    assert.equal(adapter1.isConfigured(), false);

    const adapter2 = new GeminiAdapter({ apiKey: "your-gemini-api-key" });
    assert.equal(adapter2.isConfigured(), false);

    const adapter3 = new GeminiAdapter({
      apiKey: "AIzaSyD-ValidKeySample12345",
    });
    assert.equal(adapter3.isConfigured(), true);
  });

  it("returns structured preview guidance when unconfigured", async () => {
    const adapter = new GeminiAdapter({ apiKey: "" });
    const result = await adapter.generateCompletion("Is it windy?", {
      context: mockSnapshot,
    });

    assert.equal(result.model, "offline-preview");
    assert.equal(result.grounded, true);
    assert.equal(result.finishReason, "UNCONFIGURED_KEY");
    assert.ok(result.content.includes("Reykjavik"));
    assert.ok(result.content.includes("8.5 °C"));
  });

  it("formats Gemini request payload and extracts response content", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    const mockFetch = async (
      url: string | URL | Request,
      init?: RequestInit
    ) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(init?.body as string);

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "Current conditions in Reykjavik indicate slight rain with temperatures around 8.5°C and brisk winds at 24.5 km/h.",
                  },
                ],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: {
            promptTokenCount: 142,
            candidatesTokenCount: 32,
            totalTokenCount: 174,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const adapter = new GeminiAdapter({
      apiKey: "AIzaSyD-ValidKeySample12345",
      fetchFn: mockFetch as any,
    });

    const result = await adapter.generateCompletion("What is the weather?", {
      context: mockSnapshot,
    });

    assert.ok(capturedUrl.includes("generateContent"));
    assert.ok(capturedUrl.includes("AIzaSyD-ValidKeySample12345"));
    assert.ok(
      capturedBody.systemInstruction.parts[0].text.includes(
        "ATMOS Intelligence"
      )
    );
    assert.ok(
      capturedBody.systemInstruction.parts[0].text.includes("Reykjavik")
    );
    assert.equal(
      result.content,
      "Current conditions in Reykjavik indicate slight rain with temperatures around 8.5°C and brisk winds at 24.5 km/h."
    );
    assert.equal(result.tokensUsed?.totalTokens, 174);
    assert.equal(result.grounded, true);
  });

  it("handles upstream rate limit HTTP 429", async () => {
    const mockFetch = async () => {
      return new Response(
        JSON.stringify({ error: { code: 429, message: "Resource exhausted" } }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    };

    const adapter = new GeminiAdapter({
      apiKey: "AIzaSyD-ValidKeySample12345",
      fetchFn: mockFetch as any,
    });

    await assert.rejects(
      async () => adapter.generateCompletion("Hello"),
      /ATMOS AI rate limit exceeded/
    );
  });
});
