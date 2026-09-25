import { WeatherProvider, ProviderCapabilities } from "./types";
import { OpenMeteoAdapter } from "./open-meteo/adapter";
import { WeatherError } from "../errors/weather-error";

export class ProviderRegistry {
  private readonly providers = new Map<string, WeatherProvider>();
  private defaultProviderId: string;

  constructor() {
    const defaultAdapter = new OpenMeteoAdapter();
    this.providers.set(defaultAdapter.id, defaultAdapter);
    this.defaultProviderId = defaultAdapter.id;
  }

  register(provider: WeatherProvider, asDefault = false): void {
    this.providers.set(provider.id, provider);
    if (asDefault) {
      this.defaultProviderId = provider.id;
    }
  }

  get(id?: string): WeatherProvider {
    const targetId = id ?? this.defaultProviderId;
    const provider = this.providers.get(targetId);
    if (!provider) {
      throw WeatherError.invalidParameters(
        `Weather provider '${targetId}' is not registered. Available: ${Array.from(this.providers.keys()).join(", ")}`
      );
    }
    return provider;
  }

  getDefault(): WeatherProvider {
    return this.get(this.defaultProviderId);
  }

  setDefault(id: string): void {
    if (!this.providers.has(id)) {
      throw WeatherError.invalidParameters(
        `Cannot set unknown provider '${id}' as default.`
      );
    }
    this.defaultProviderId = id;
  }

  listCapabilities(): ProviderCapabilities[] {
    return Array.from(this.providers.values()).map((p) => p.capabilities);
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  clear(): void {
    this.providers.clear();
  }
}

// Global singleton instance for server-side use
let globalRegistry: ProviderRegistry | undefined;

export function getProviderRegistry(): ProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new ProviderRegistry();
  }
  return globalRegistry;
}
