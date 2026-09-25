import {
  AIProvider,
  AIProviderCapabilities,
  AICompletionOptions,
  AICompletionResult,
} from "../types";
import { WeatherGroundingSnapshot } from "../../domain/schemas";

export interface GeminiAdapterConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_TIMEOUT_MS = 12000;

export class GeminiAdapter implements AIProvider {
  readonly id = "google-gemini";
  readonly name = "Google Gemini";

  readonly capabilities: AIProviderCapabilities = {
    supportsSystemInstructions: true,
    supportsStreaming: true,
    supportsGroundingContext: true,
    maxPromptLength: 4000,
  };

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: GeminiAdapterConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.GEMINI_API_KEY ?? "";
    this.model = config.model ?? DEFAULT_MODEL;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  isConfigured(): boolean {
    return (
      Boolean(this.apiKey) &&
      !this.apiKey.includes("your-gemini-api-key") &&
      this.apiKey.trim().length > 10
    );
  }

  async generateCompletion(
    userPrompt: string,
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    if (!this.isConfigured()) {
      return this.generateUnconfiguredResponse(options.context);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    // Link optional external signal
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }

    try {
      const url = new URL(
        `${this.baseUrl}/models/${this.model}:generateContent`
      );
      url.searchParams.set("key", this.apiKey);

      const systemPrompt = this.buildSystemPrompt(
        options.systemInstruction,
        options.context
      );

      // Build contents array supporting conversation history
      const contents: Array<{
        role: "user" | "model";
        parts: Array<{ text: string }>;
      }> = [];

      if (options.history && options.history.length > 0) {
        for (const item of options.history) {
          contents.push({
            role: item.role === "model" ? "model" : "user",
            parts: [{ text: item.content }],
          });
        }
      }

      // Append current user prompt
      contents.push({
        role: "user",
        parts: [{ text: userPrompt }],
      });

      const bodyPayload: Record<string, unknown> = {
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxOutputTokens ?? 1024,
        },
      };

      if (systemPrompt) {
        bodyPayload.systemInstruction = {
          parts: [{ text: systemPrompt }],
        };
      }

      const response = await this.fetchFn(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMessage = `Gemini API error (HTTP ${response.status})`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error?.message) {
            parsedMessage = parsed.error.message;
          }
        } catch {
          // Keep default message
        }

        if (response.status === 429) {
          throw new Error(
            `ATMOS AI rate limit exceeded: Gemini API quota exceeded. Please wait a moment.`
          );
        }
        if (response.status === 400) {
          throw new Error(`Invalid AI request: ${parsedMessage}`);
        }
        throw new Error(`AI Provider Failure: ${parsedMessage}`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const text =
        candidate?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("\n") ??
        "I was unable to synthesize a response from the weather context.";

      return {
        content: text.trim(),
        model: this.model,
        tokensUsed: {
          promptTokens: data.usageMetadata?.promptTokenCount,
          completionTokens: data.usageMetadata?.candidatesTokenCount,
          totalTokens: data.usageMetadata?.totalTokenCount,
        },
        grounded: Boolean(options.context),
        finishReason: candidate?.finishReason,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `AI request timed out after ${this.timeoutMs}ms. Please try again.`
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildSystemPrompt(
    customInstruction?: string,
    context?: WeatherGroundingSnapshot
  ): string {
    const base = [
      "You are ATMOS Intelligence, an elite meteorological AI assistant on the ATMOS platform.",
      "Your mission is to provide concise, scientifically accurate, and helpful weather guidance.",
      "CRITICAL GROUNDING RULES:",
      "1. Ground all claims strictly in the provided verified meteorological context.",
      "2. Never hallucinate weather readings, alert warnings, or certainty levels beyond the data.",
      "3. If asked about locations or time horizons not present in the context, explicitly acknowledge the limit.",
      "4. Format responses cleanly using markdown (bullet points, bold highlights) for rapid readability.",
      "5. Always respect the user's unit system (e.g. °C or °F, km/h or mph).",
    ];

    if (customInstruction) {
      base.push(`\nUSER INSTRUCTION:\n${customInstruction}`);
    }

    if (context) {
      base.push("\n--- VERIFIED METEOROLOGICAL CONTEXT ---");
      base.push(
        `Location: ${context.location.name}${context.location.country ? `, ${context.location.country}` : ""} (${context.location.latitude.toFixed(2)}°, ${context.location.longitude.toFixed(2)}°)`
      );
      base.push(`Local Timezone: ${context.location.timezone ?? "auto"}`);
      base.push(`Fetched At: ${context.fetchedAt}`);
      base.push(
        `Units: Temperature (${context.units.temperature}), Wind (${context.units.windSpeed}), Precipitation (${context.units.precipitation}), Pressure (${context.units.pressure})`
      );

      if (context.current) {
        base.push("\n[Current Conditions]");
        base.push(
          `- Temperature: ${context.current.temperature} ${context.units.temperature}`
        );
        base.push(
          `- Apparent (Feels-Like): ${context.current.apparentTemperature} ${context.units.temperature}`
        );
        base.push(`- Condition: ${context.current.conditionLabel}`);
        base.push(`- Humidity: ${context.current.relativeHumidity}%`);
        base.push(
          `- Wind: ${context.current.windSpeed} ${context.units.windSpeed} at ${context.current.windDirection}°`
        );
        base.push(
          `- Barometric Pressure: ${context.current.pressureMsl} ${context.units.pressure}`
        );
        if (context.current.uvIndex !== undefined) {
          base.push(`- UV Index: ${context.current.uvIndex}`);
        }
        if (context.current.visibility !== undefined) {
          base.push(`- Visibility: ${context.current.visibility} km`);
        }
      }

      if (context.forecastNext24h && context.forecastNext24h.length > 0) {
        base.push("\n[Next 24 Hours Highlights]");
        for (const h of context.forecastNext24h.slice(0, 12)) {
          base.push(
            `- ${h.time}: ${h.temperature}${context.units.temperature}, ${h.conditionLabel ?? "Clear"}, Precip: ${h.precipitationProbability ?? 0}% (${h.precipitationAmount ?? 0}${context.units.precipitation}), Wind: ${h.windSpeed ?? 0}${context.units.windSpeed}`
          );
        }
      }

      if (context.forecastNext7d && context.forecastNext7d.length > 0) {
        base.push("\n[7-Day Outlook]");
        for (const d of context.forecastNext7d) {
          base.push(
            `- ${d.date}: High ${d.temperatureMax}${context.units.temperature} / Low ${d.temperatureMin}${context.units.temperature}, ${d.conditionLabel ?? "Clear"}, Rain Prob: ${d.precipitationProbability ?? 0}%`
          );
        }
      }

      if (context.dataQualityNotes && context.dataQualityNotes.length > 0) {
        base.push("\n[Data Quality Notes]");
        for (const note of context.dataQualityNotes) {
          base.push(`- ${note}`);
        }
      }
      base.push("--- END METEOROLOGICAL CONTEXT ---");
    }

    return base.join("\n");
  }

  private generateUnconfiguredResponse(
    context?: WeatherGroundingSnapshot
  ): AICompletionResult {
    let message =
      "**ATMOS Intelligence Preview Mode**\n\n" +
      "The Gemini AI integration requires a valid `GEMINI_API_KEY` configured in the server environment.\n\n";

    if (context?.current) {
      message +=
        `Here is the verified current telemetry for **${context.location.name}**:\n` +
        `- Temperature: **${context.current.temperature} ${context.units.temperature}** (Feels like ${context.current.apparentTemperature} ${context.units.temperature})\n` +
        `- Condition: **${context.current.conditionLabel}**\n` +
        `- Wind: **${context.current.windSpeed} ${context.units.windSpeed}**\n` +
        `- Relative Humidity: **${context.current.relativeHumidity}%**\n` +
        `- Barometric Pressure: **${context.current.pressureMsl} ${context.units.pressure}**\n\n` +
        `*Live weather data and forecasts remain 100% operational.*`;
    } else {
      message +=
        "Select a location or ask a weather question once `GEMINI_API_KEY` is added to `.env.local`.";
    }

    return {
      content: message,
      model: "offline-preview",
      grounded: Boolean(context),
      finishReason: "UNCONFIGURED_KEY",
    };
  }
}
