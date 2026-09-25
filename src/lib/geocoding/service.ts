import { GeocodingLocation, GeocodingSearchResult } from "./domain/types";
import {
  GeocodingQuery,
  GeocodingQueryInput,
  GeocodingQuerySchema,
} from "./domain/schemas";
import {
  GeocodingProviderRegistry,
  getGeocodingProviderRegistry,
} from "./providers/registry";
import {
  DEFAULT_GEOCODING_CACHE_CONFIG,
  GeocodingCache,
  MemoryGeocodingCache,
  RequestDeduplicator,
  buildGeocodingCacheKey,
} from "./cache/cache";
import {
  deduplicateGeocodingResults,
  rankGeocodingResults,
} from "./ranking/ranking";
import { WeatherError } from "../weather/errors/weather-error";

export interface GeocodingServiceOptions {
  providerId?: string;
  bypassCache?: boolean;
  signal?: AbortSignal;
}

/**
 * Geocoding service orchestrator.
 * Handles provider dispatch, deterministic ranking, coordinate deduplication,
 * request coalescing, and caching.
 */
export class GeocodingService {
  private readonly registry: GeocodingProviderRegistry;
  private readonly cache: GeocodingCache;
  private readonly deduplicator: RequestDeduplicator;

  constructor(options?: {
    registry?: GeocodingProviderRegistry;
    cache?: GeocodingCache;
    deduplicator?: RequestDeduplicator;
  }) {
    this.registry = options?.registry ?? getGeocodingProviderRegistry();
    this.cache = options?.cache ?? new MemoryGeocodingCache();
    this.deduplicator = options?.deduplicator ?? new RequestDeduplicator();
  }

  /**
   * Search for locations matching query with caching, deduplication, and ranking.
   */
  async search(
    query: GeocodingQueryInput,
    options: GeocodingServiceOptions = {}
  ): Promise<GeocodingSearchResult> {
    const validated = GeocodingQuerySchema.safeParse(query);
    if (!validated.success) {
      throw WeatherError.invalidParameters(
        validated.error.issues[0]?.message ?? "Invalid search query"
      );
    }

    const queryData: GeocodingQuery = validated.data;
    const provider = this.registry.get(options.providerId);
    const cacheKey = buildGeocodingCacheKey(provider.id, queryData);

    // 1. Check cache
    if (!options.bypassCache) {
      const cached = this.cache.get<GeocodingSearchResult>(cacheKey);
      if (cached) {
        return {
          ...cached.value,
          isCached: true,
        };
      }
    }

    // 2. Coalesce concurrent searches
    return this.deduplicator.execute(cacheKey, async () => {
      const raw = await provider.search(queryData, {
        signal: options.signal,
      });

      // Deduplicate overlapping coordinates
      const deduped = deduplicateGeocodingResults(raw.results);

      // Rank results according to match relevance and population
      const ranked = rankGeocodingResults(deduped, queryData.query);

      // Limit results to requested count
      const finalResults = ranked.slice(0, queryData.count);

      const searchResult: GeocodingSearchResult = {
        query: queryData.query,
        results: finalResults,
        totalCount: finalResults.length,
        generationTimeMs: raw.generationTimeMs,
        provider: provider.id,
        isCached: false,
      };

      // Cache successful results
      this.cache.set(cacheKey, searchResult, {
        ttlSeconds: DEFAULT_GEOCODING_CACHE_CONFIG.ttlSeconds,
        staleWhileRevalidateSeconds:
          DEFAULT_GEOCODING_CACHE_CONFIG.staleSeconds,
      });

      return searchResult;
    });
  }

  /**
   * Direct location lookup by ID.
   */
  async getLocationById(
    id: string | number,
    options: GeocodingServiceOptions = {}
  ): Promise<GeocodingLocation | null> {
    const provider = this.registry.get(options.providerId);
    if (!provider.getById) {
      throw WeatherError.unsupported(provider.id, "getById");
    }

    const cacheKey = `geocoding:id:${provider.id}:${id}`;

    if (!options.bypassCache) {
      const cached = this.cache.get<GeocodingLocation>(cacheKey);
      if (cached) {
        return cached.value;
      }
    }

    return this.deduplicator.execute(cacheKey, async () => {
      const location = await provider.getById!(id, {
        signal: options.signal,
      });

      if (location) {
        this.cache.set(cacheKey, location, {
          ttlSeconds: DEFAULT_GEOCODING_CACHE_CONFIG.ttlSeconds,
          staleWhileRevalidateSeconds:
            DEFAULT_GEOCODING_CACHE_CONFIG.staleSeconds,
        });
      }

      return location;
    });
  }
}

// Global default singleton instance
let globalGeocodingService: GeocodingService | undefined;

export function getGeocodingService(): GeocodingService {
  if (!globalGeocodingService) {
    globalGeocodingService = new GeocodingService();
  }
  return globalGeocodingService;
}
