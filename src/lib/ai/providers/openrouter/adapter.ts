import {
  AIProvider,
  AIProviderCapabilities,
  AICompletionOptions,
  AICompletionResult,
} from "../types";
import { WeatherGroundingSnapshot } from "../../domain/schemas";

export interface OpenRouterAdapterConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct";
const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Production OpenRouter AI Adapter for ATMOS Weather Intelligence.
 * Communicates with OpenRouter's OpenAI-compatible completions API,
 * strictly on the server side.
 */
export class OpenRouterAdapter implements AIProvider {
  readonly id = "openrouter";
  readonly name = "OpenRouter";

  readonly capabilities: AIProviderCapabilities = {
    supportsSystemInstructions: true,
    supportsStreaming: true,
    supportsGroundingContext: true,
    maxPromptLength: 8000,
  };

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: OpenRouterAdapterConfig = {}) {
    this.apiKey =
      config.apiKey ??
      process.env.OPENROUTER_API_KEY ??
      process.env.OPENROUTER_KEY ??
      "";
    this.model =
      config.model ??
      process.env.OPENROUTER_MODEL ??
      DEFAULT_MODEL;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  isConfigured(): boolean {
    return (
      Boolean(this.apiKey) &&
      !this.apiKey.includes("your-openrouter") &&
      !this.apiKey.includes("placeholder") &&
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

    // Link optional caller abort signal
    if (options.signal) {
      options.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }

    try {
      const systemPrompt = this.buildSystemPrompt(
        options.systemInstruction,
        options.context
      );

      // Build standard OpenAI-compatible messages array
      const messages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }> = [];

      if (systemPrompt) {
        messages.push({
          role: "system",
          content: systemPrompt,
        });
      }

      // Append conversation history
      if (options.history && options.history.length > 0) {
        for (const item of options.history) {
          messages.push({
            role: item.role === "model" ? "assistant" : "user",
            content: item.content,
          });
        }
      }

      // Append current user prompt
      messages.push({
        role: "user",
        content: userPrompt,
      });

      const bodyPayload = {
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxOutputTokens ?? 1024,
      };

      const response = await this.fetchFn(
        `${this.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://atmos.app",
            "X-Title": "ATMOS Weather Intelligence",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMessage = `OpenRouter API error (HTTP ${response.status})`;
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
            "ATMOS AI rate limit exceeded: OpenRouter quota or provider rate limit reached. Please wait a moment."
          );
        }
        if (response.status === 401) {
          throw new Error(
            "OpenRouter authentication failed: Please verify OPENROUTER_API_KEY in your environment."
          );
        }
        if (response.status === 400) {
          throw new Error(`Invalid AI request: ${parsedMessage}`);
        }
        throw new Error(`AI Provider Failure: ${parsedMessage}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const text =
        choice?.message?.content?.trim() ||
        "I was unable to synthesize a response from the weather context.";

      return {
        content: text,
        model: data.model || this.model,
        tokensUsed: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
        },
        grounded: Boolean(options.context),
        finishReason: choice?.finish_reason,
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
      "You are ATMOS Intelligence, an elite meteorological and general-purpose conversational AI assistant on the ATMOS weather intelligence platform.",
      "Your mission is to provide clear, helpful, scientifically sound, and actionable guidance for everyday life, travel, outdoor planning, and general inquiries.",
      "",
      "CORE CAPABILITIES & GROUNDING RULES:",
      "1. GENERAL KNOWLEDGE & CONVERSATIONAL QUERIES: You can answer general questions (science, math calculations, geography, history, travel packing checklists, meteorology concepts like monsoons or el niño) directly, warmly, and accurately. You do NOT require weather data to answer non-weather queries.",
      "2. VERIFIED WEATHER GROUNDING: When verified meteorological context is provided below, ground your weather claims (temperatures, precipitation probabilities, rain timing, wind speeds, UV index) strictly in this data. Never fabricate forecast numbers.",
      "3. TRAVEL & MULTI-LOCATION PLANNING: If the user asks about a trip or traveling to a destination (e.g. traveling to Mumbai, weekend in Tokyo), advise them directly on destination weather, umbrella/clothing recommendations, and best travel times based on the forecast.",
      "4. FORMATTING & STYLE: Format responses cleanly with readable Markdown (bullet points, bold highlights for key numbers/recommendations). Keep answers concise, actionable, and conversational.",
      "5. NEVER claim you are restricted to London or another default city when the user asks about other locations.",
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
      "The OpenRouter AI integration requires `OPENROUTER_API_KEY` configured in the server environment.\n\n";

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
        "Select a location or ask a weather question once `OPENROUTER_API_KEY` is added to `.env.local`.";
    }

    return {
      content: message,
      model: `${this.model} (preview)`,
      grounded: Boolean(context),
      finishReason: "UNCONFIGURED_KEY",
    };
  }
}
