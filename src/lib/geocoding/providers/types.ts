import { GeocodingLocation } from "../domain/types";
import { GeocodingQueryInput } from "../domain/schemas";

export interface GeocodingProviderCapabilities {
  id: string;
  name: string;
  supportsMultilingual: boolean;
  supportsCountryFiltering: boolean;
  maxResults: number;
  requiresApiKey: boolean;
  attribution: string;
  termsUrl?: string;
}

/**
 * Universal interface for geocoding providers.
 * Allows alternate providers (e.g. Mapbox Geocoding, Nominatim, Photon)
 * to be plugged in seamlessly.
 */
export interface GeocodingProvider {
  readonly id: string;
  readonly capabilities: GeocodingProviderCapabilities;

  /**
   * Search for locations matching a text query.
   */
  search(
    query: GeocodingQueryInput,
    options?: { signal?: AbortSignal }
  ): Promise<{ results: GeocodingLocation[]; generationTimeMs?: number }>;

  /**
   * Optional direct lookup by provider location ID.
   */
  getById?(
    id: string | number,
    options?: { signal?: AbortSignal }
  ): Promise<GeocodingLocation | null>;
}
