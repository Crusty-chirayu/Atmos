import {
  MemoryWeatherCache,
  RequestDeduplicator,
  WeatherCache,
} from "../../weather/cache/cache";
import { GeocodingQuery } from "../domain/schemas";
import { normalizeSearchString } from "../ranking/ranking";

export const DEFAULT_GEOCODING_CACHE_CONFIG = {
  ttlSeconds: 86400, // 24 hours
  staleSeconds: 43200, // 12 hours
} as const;

/**
 * Builds a deterministic, normalized cache key for geocoding queries.
 * Normalizes query string (lowercase, trimmed, diacritics removed)
 * to avoid duplicate cached entries for "Paris", "paris", and "PARIS".
 */
export function buildGeocodingCacheKey(
  providerId: string,
  query: GeocodingQuery
): string {
  const normTerm = normalizeSearchString(query.query);
  return [
    "geocoding",
    providerId,
    normTerm,
    query.language,
    query.count,
    query.countryCode ?? "ALL",
  ].join(":");
}

export { MemoryWeatherCache as MemoryGeocodingCache, RequestDeduplicator };
export type { WeatherCache as GeocodingCache };
