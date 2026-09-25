import { WeatherGroundingSnapshot } from "../domain/schemas";

export interface AIMessageItem {
  role: "user" | "model" | "system";
  content: string;
}

export interface AICompletionOptions {
  systemInstruction?: string;
  context?: WeatherGroundingSnapshot;
  history?: AIMessageItem[];
  temperature?: number;
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export interface AICompletionResult {
  content: string;
  model: string;
  tokensUsed?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  grounded: boolean;
  finishReason?: string;
}

export interface AIProviderCapabilities {
  supportsSystemInstructions: boolean;
  supportsStreaming: boolean;
  supportsGroundingContext: boolean;
  maxPromptLength: number;
}

/**
 * Universal interface for server-side AI providers (Gemini, Mock, etc.).
 */
export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: AIProviderCapabilities;

  /**
   * Generates a grounded AI completion.
   */
  generateCompletion(
    userPrompt: string,
    options?: AICompletionOptions
  ): Promise<AICompletionResult>;

  /**
   * Returns true if the provider has valid API credentials configured.
   */
  isConfigured(): boolean;
}
