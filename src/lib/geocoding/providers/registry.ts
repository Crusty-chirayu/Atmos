import { GeocodingProvider, GeocodingProviderCapabilities } from "./types";
import { OpenMeteoGeocodingAdapter } from "./open-meteo/adapter";
import { WeatherError } from "../../weather/errors/weather-error";

export class GeocodingProviderRegistry {
  private readonly providers = new Map<string, GeocodingProvider>();
  private defaultProviderId: string;

  constructor() {
    const defaultAdapter = new OpenMeteoGeocodingAdapter();
    this.providers.set(defaultAdapter.id, defaultAdapter);
    this.defaultProviderId = defaultAdapter.id;
  }

  register(provider: GeocodingProvider, asDefault = false): void {
    this.providers.set(provider.id, provider);
    if (asDefault) {
      this.defaultProviderId = provider.id;
    }
  }

  get(id?: string): GeocodingProvider {
    const targetId = id ?? this.defaultProviderId;
    const provider = this.providers.get(targetId);
    if (!provider) {
      throw WeatherError.invalidParameters(
        `Geocoding provider '${targetId}' is not registered. Available: ${Array.from(
          this.providers.keys()
        ).join(", ")}`
      );
    }
    return provider;
  }

  getDefault(): GeocodingProvider {
    return this.get(this.defaultProviderId);
  }

  setDefault(id: string): void {
    if (!this.providers.has(id)) {
      throw WeatherError.invalidParameters(
        `Cannot set unknown geocoding provider '${id}' as default.`
      );
    }
    this.defaultProviderId = id;
  }

  listCapabilities(): GeocodingProviderCapabilities[] {
    return Array.from(this.providers.values()).map((p) => p.capabilities);
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  clear(): void {
    this.providers.clear();
  }
}

let globalGeocodingRegistry: GeocodingProviderRegistry | undefined;

export function getGeocodingProviderRegistry(): GeocodingProviderRegistry {
  if (!globalGeocodingRegistry) {
    globalGeocodingRegistry = new GeocodingProviderRegistry();
  }
  return globalGeocodingRegistry;
}
