import { Coordinates, normalizeCoordinates } from "../domain/location";
import {
  ForecastQueryOptions,
  HistoricalQueryOptions,
} from "../domain/schemas";

export interface CacheEntry<T> {
  value: T;
  cachedAt: number;
  expiresAt: number;
  staleAt: number;
}

export interface CacheOptions {
  ttlSeconds?: number;
  staleWhileRevalidateSeconds?: number;
}

export interface WeatherCache {
  get<T>(key: string): CacheEntry<T> | null;
  set<T>(key: string, value: T, options?: CacheOptions): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
  size(): number;
}

/**
 * Standard TTL configuration per weather data category.
 */
export const DEFAULT_CACHE_CONFIG = {
  current: {
    ttlSeconds: 600, // 10 minutes
    staleSeconds: 300, // 5 minutes
  },
  forecast: {
    ttlSeconds: 1800, // 30 minutes
    staleSeconds: 900, // 15 minutes
  },
  historical: {
    ttlSeconds: 86400, // 24 hours (historical data does not change)
    staleSeconds: 43200, // 12 hours
  },
} as const;

/**
 * In-memory TTL cache with Stale-While-Revalidate support and LRU-style eviction.
 * Thread-safe in Node.js event loop.
 *
 * NOTE (Architecture & Deployment):
 * In serverless environments (e.g. Vercel Lambda), process memory persists across warm invocations
 * but is not globally shared across different lambda instances.
 * This class implements the WeatherCache interface so a distributed Redis/KV store
 * can be plugged in when required without changing domain callers.
 */
export class MemoryWeatherCache implements WeatherCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry as CacheEntry<T>;
  }

  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const ttlMs = (options.ttlSeconds ?? 600) * 1000;
    const staleMs =
      (options.staleWhileRevalidateSeconds ??
        Math.floor((options.ttlSeconds ?? 600) / 2)) * 1000;
    const now = Date.now();

    // Prevent unbounded memory growth: evict oldest entry if at capacity
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) {
        this.store.delete(firstKey);
      }
    }

    this.store.set(key, {
      value,
      cachedAt: now,
      expiresAt: now + ttlMs,
      staleAt: now + staleMs,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    const entry = this.get(key);
    return entry !== null;
  }

  size(): number {
    return this.store.size;
  }
}

/**
 * Singleflight request deduplicator to coalesce concurrent identical requests.
 * Prevents "thundering herd" / cache stampede against upstream weather providers.
 */
export class RequestDeduplicator {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  async execute<T>(key: string, task: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = task().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  inFlightCount(): number {
    return this.inFlight.size;
  }

  clear(): void {
    this.inFlight.clear();
  }
}

/* ─────────────────────────────────────────────────────────────
   Normalized Cache Key Builders
   ───────────────────────────────────────────────────────────── */

export function buildCurrentWeatherCacheKey(
  providerId: string,
  coords: Coordinates,
  timezone = "auto"
): string {
  const norm = normalizeCoordinates(coords);
  return `weather:current:${providerId}:${norm.latitude.toFixed(2)}:${norm.longitude.toFixed(2)}:${timezone}`;
}

export function buildForecastCacheKey(
  providerId: string,
  options: ForecastQueryOptions
): string {
  const norm = normalizeCoordinates({
    latitude: options.latitude,
    longitude: options.longitude,
  });
  return [
    `weather:forecast`,
    providerId,
    norm.latitude.toFixed(2),
    norm.longitude.toFixed(2),
    options.timezone,
    options.forecastDays,
    options.includeHourly ? "1" : "0",
    options.includeDaily ? "1" : "0",
    options.includeCurrent ? "1" : "0",
  ].join(":");
}

export function buildHistoricalCacheKey(
  providerId: string,
  options: HistoricalQueryOptions
): string {
  const norm = normalizeCoordinates({
    latitude: options.latitude,
    longitude: options.longitude,
  });
  return [
    `weather:historical`,
    providerId,
    norm.latitude.toFixed(2),
    norm.longitude.toFixed(2),
    options.startDate,
    options.endDate,
    options.timezone,
    options.includeHourly ? "1" : "0",
  ].join(":");
}
