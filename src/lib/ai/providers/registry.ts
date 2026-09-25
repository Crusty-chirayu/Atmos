import { AIProvider } from "./types";
import { GeminiAdapter } from "./gemini/adapter";

export class AIProviderRegistry {
  private providers = new Map<string, AIProvider>();
  private defaultProviderId = "google-gemini";

  constructor() {
    this.register(new GeminiAdapter(), true);
  }

  register(provider: AIProvider, setAsDefault = false): void {
    this.providers.set(provider.id, provider);
    if (setAsDefault) {
      this.defaultProviderId = provider.id;
    }
  }

  get(id?: string): AIProvider {
    const targetId = id ?? this.defaultProviderId;
    const provider = this.providers.get(targetId);
    if (!provider) {
      throw new Error(`AI Provider "${targetId}" is not registered.`);
    }
    return provider;
  }

  getDefault(): AIProvider {
    return this.get(this.defaultProviderId);
  }

  list(): Array<{ id: string; name: string; isConfigured: boolean }> {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      isConfigured: p.isConfigured(),
    }));
  }
}

// Global singleton instance
let registryInstance: AIProviderRegistry | null = null;

export function getAIProviderRegistry(): AIProviderRegistry {
  if (!registryInstance) {
    registryInstance = new AIProviderRegistry();
  }
  return registryInstance;
}
