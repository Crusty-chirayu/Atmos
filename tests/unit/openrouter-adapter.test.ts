import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OpenRouterAdapter } from "@/lib/ai/providers/openrouter/adapter";
import { WeatherGroundingSnapshot } from "@/lib/ai/domain/schemas";

describe("OpenRouterAdapter", () => {
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

  it("correctly identifies unconfigured vs configured API key", () => {
    const adapter1 = new OpenRouterAdapter({ apiKey: "" });
    assert.equal(adapter1.isConfigured(), false);

    const adapter2 = new OpenRouterAdapter({ apiKey: "your-openrouter-key" });
    assert.equal(adapter2.isConfigured(), false);

    const adapter3 = new OpenRouterAdapter({
      apiKey: "sk-or-v1-abcdef1234567890abcdef",
    });
    assert.equal(adapter3.isConfigured(), true);
  });

  it("returns structured preview guidance when unconfigured", async () => {
    const adapter = new OpenRouterAdapter({ apiKey: "" });
    const result = await adapter.generateCompletion("Is it raining in Reykjavik?", {
      context: mockSnapshot,
    });

    assert.ok(result.model.includes("preview"));
    assert.equal(result.grounded, true);
    assert.equal(result.finishReason, "UNCONFIGURED_KEY");
    assert.ok(result.content.includes("Reykjavik"));
    assert.ok(result.content.includes("8.5 °C"));
    assert.ok(result.content.includes("OPENROUTER_API_KEY"));
  });

  it("constructs OpenAI-compatible payload with OpenRouter headers", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetch = async (
      url: string | URL | Request,
      init?: RequestInit
    ) => {
      capturedUrl = String(url);
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      capturedBody = JSON.parse(init?.body as string);

      return new Response(
        JSON.stringify({
          id: "gen-test-123",
          model: "meta-llama/llama-3.3-70b-instruct",
          choices: [
            {
              message: {
                role: "assistant",
                content:
                  "Based on verified Open-Meteo forecasts, Reykjavik is experiencing slight rain at 8.5°C with winds around 24.5 km/h.",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 150,
            completion_tokens: 35,
            total_tokens: 185,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const adapter = new OpenRouterAdapter({
      apiKey: "sk-or-v1-validsecret1234567890",
      fetchFn: mockFetch as any,
    });

    const result = await adapter.generateCompletion("How is the rain?", {
      context: mockSnapshot,
      history: [
        { role: "user", content: "Hi" },
        { role: "model", content: "Hello! How can I help with weather?" },
      ],
    });

    assert.ok(capturedUrl.endsWith("/chat/completions"));
    assert.equal(
      capturedHeaders["Authorization"],
      "Bearer sk-or-v1-validsecret1234567890"
    );
    assert.equal(capturedHeaders["HTTP-Referer"], "https://atmos.app");
    assert.equal(capturedHeaders["X-Title"], "ATMOS Weather Intelligence");

    // Verify messages structure
    assert.equal(capturedBody.messages[0].role, "system");
    assert.ok(capturedBody.messages[0].content.includes("ATMOS Intelligence"));
    assert.ok(capturedBody.messages[0].content.includes("Reykjavik"));

    // Verify history mapping (model -> assistant)
    assert.equal(capturedBody.messages[1].role, "user");
    assert.equal(capturedBody.messages[2].role, "assistant");
    assert.equal(capturedBody.messages[3].role, "user");
    assert.equal(capturedBody.messages[3].content, "How is the rain?");

    assert.equal(
      result.content,
      "Based on verified Open-Meteo forecasts, Reykjavik is experiencing slight rain at 8.5°C with winds around 24.5 km/h."
    );
    assert.equal(result.tokensUsed?.totalTokens, 185);
    assert.equal(result.grounded, true);
  });

  it("handles upstream 429 rate limit cleanly", async () => {
    const mockFetch = async () => {
      return new Response(
        JSON.stringify({ error: { code: 429, message: "Rate limit exceeded" } }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    };

    const adapter = new OpenRouterAdapter({
      apiKey: "sk-or-v1-testkey1234567890",
      fetchFn: mockFetch as any,
    });

    await assert.rejects(
      async () => adapter.generateCompletion("Forecast please"),
      /ATMOS AI rate limit exceeded/
    );
  });

  it("handles 401 invalid key cleanly", async () => {
    const mockFetch = async () => {
      return new Response(
        JSON.stringify({ error: { code: 401, message: "User key not found" } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    };

    const adapter = new OpenRouterAdapter({
      apiKey: "sk-or-v1-invalidkey1234567890",
      fetchFn: mockFetch as any,
    });

    await assert.rejects(
      async () => adapter.generateCompletion("Hello"),
      /OpenRouter authentication failed/
    );
  });
});
