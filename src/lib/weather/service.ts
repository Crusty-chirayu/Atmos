import {
  Coordinates,
  CoordinatesSchema,
  normalizeCoordinates,
} from "./domain/location";
import {
  CurrentWeather,
  DailyForecast,
  HistoricalWeather,
  HourlyForecast,
  WeatherBundle,
  WeatherResponseMeta,
} from "./domain/weather";
import {
  CanonicalUnits,
  UnitPreferences,
  convertDistance,
  convertPrecipitation,
  convertPressure,
  convertTemperature,
  convertWindSpeed,
} from "./domain/units";
import {
  ForecastQueryOptionsInput,
  ForecastQueryOptionsSchema,
  HistoricalQueryOptionsInput,
  HistoricalQueryOptionsSchema,
} from "./domain/schemas";
import { ProviderRegistry, getProviderRegistry } from "./providers/registry";
import {
  DEFAULT_CACHE_CONFIG,
  MemoryWeatherCache,
  RequestDeduplicator,
  WeatherCache,
  buildCurrentWeatherCacheKey,
  buildForecastCacheKey,
  buildHistoricalCacheKey,
} from "./cache/cache";
import { WeatherError } from "./errors/weather-error";

export interface ServiceExecutionOptions {
  providerId?: string;
  bypassCache?: boolean;
  units?: UnitPreferences;
  signal?: AbortSignal;
}

/**
 * Main application weather engine orchestrator.
 * Handles provider dispatch, caching, deduplication, and optional unit conversion.
 */
export class WeatherService {
  private readonly registry: ProviderRegistry;
  private readonly cache: WeatherCache;
  private readonly deduplicator: RequestDeduplicator;

  constructor(options?: {
    registry?: ProviderRegistry;
    cache?: WeatherCache;
    deduplicator?: RequestDeduplicator;
  }) {
    this.registry = options?.registry ?? getProviderRegistry();
    this.cache = options?.cache ?? new MemoryWeatherCache();
    this.deduplicator = options?.deduplicator ?? new RequestDeduplicator();
  }

  /**
   * Get current weather conditions for coordinates.
   */
  async getCurrentWeather(
    coords: Coordinates,
    options: ServiceExecutionOptions & { timezone?: string } = {}
  ): Promise<{ current: CurrentWeather; meta: WeatherResponseMeta }> {
    const validated = CoordinatesSchema.safeParse(coords);
    if (!validated.success) {
      throw WeatherError.invalidCoordinates(
        validated.error.issues[0]?.message ?? "Invalid coordinates"
      );
    }

    const provider = this.registry.get(options.providerId);
    const timezone = options.timezone ?? "auto";
    const cacheKey = buildCurrentWeatherCacheKey(
      provider.id,
      validated.data,
      timezone
    );

    // 1. Check cache (canonical data)
    if (!options.bypassCache) {
      const cached = this.cache.get<{
        current: CurrentWeather;
        meta: WeatherResponseMeta;
      }>(cacheKey);
      if (cached) {
        const isStale = Date.now() > cached.staleAt;
        const res = {
          current: { ...cached.value.current },
          meta: {
            ...cached.value.meta,
            isCached: true,
            isStale,
          },
        };
        return this.applyUnitsToCurrent(res, options.units);
      }
    }

    // 2. Coalesce concurrent requests
    const result = await this.deduplicator.execute(cacheKey, async () => {
      const response = await provider.getCurrent(validated.data, {
        timezone,
        signal: options.signal,
      });

      // Cache raw canonical data
      this.cache.set(cacheKey, response, {
        ttlSeconds: DEFAULT_CACHE_CONFIG.current.ttlSeconds,
        staleWhileRevalidateSeconds: DEFAULT_CACHE_CONFIG.current.staleSeconds,
      });

      return response;
    });

    return this.applyUnitsToCurrent(result, options.units);
  }

  /**
   * Get complete weather forecast (current, hourly, daily).
   */
  async getForecast(
    query: ForecastQueryOptionsInput,
    options: ServiceExecutionOptions = {}
  ): Promise<{
    current?: CurrentWeather;
    hourly?: HourlyForecast;
    daily?: DailyForecast;
    meta: WeatherResponseMeta;
  }> {
    const validated = ForecastQueryOptionsSchema.safeParse(query);
    if (!validated.success) {
      throw WeatherError.invalidParameters(
        validated.error.issues[0]?.message ?? "Invalid forecast options"
      );
    }

    const provider = this.registry.get(options.providerId);
    const cacheKey = buildForecastCacheKey(provider.id, validated.data);

    // 1. Check cache
    if (!options.bypassCache) {
      const cached = this.cache.get<{
        current?: CurrentWeather;
        hourly?: HourlyForecast;
        daily?: DailyForecast;
        meta: WeatherResponseMeta;
      }>(cacheKey);

      if (cached) {
        const isStale = Date.now() > cached.staleAt;
        const res = {
          current: cached.value.current
            ? { ...cached.value.current }
            : undefined,
          hourly: cached.value.hourly
            ? { entries: [...cached.value.hourly.entries] }
            : undefined,
          daily: cached.value.daily
            ? { days: [...cached.value.daily.days] }
            : undefined,
          meta: {
            ...cached.value.meta,
            isCached: true,
            isStale,
          },
        };
        return this.applyUnitsToForecast(res, options.units);
      }
    }

    // 2. Coalesce concurrent requests
    const result = await this.deduplicator.execute(cacheKey, async () => {
      const response = await provider.getForecast(validated.data, {
        signal: options.signal,
      });

      this.cache.set(cacheKey, response, {
        ttlSeconds: DEFAULT_CACHE_CONFIG.forecast.ttlSeconds,
        staleWhileRevalidateSeconds: DEFAULT_CACHE_CONFIG.forecast.staleSeconds,
      });

      return response;
    });

    return this.applyUnitsToForecast(result, options.units);
  }

  /**
   * Get historical weather reanalysis data.
   */
  async getHistoricalWeather(
    query: HistoricalQueryOptionsInput,
    options: ServiceExecutionOptions = {}
  ): Promise<HistoricalWeather> {
    const validated = HistoricalQueryOptionsSchema.safeParse(query);
    if (!validated.success) {
      throw WeatherError.invalidParameters(
        validated.error.issues[0]?.message ?? "Invalid historical options"
      );
    }

    const provider = this.registry.get(options.providerId);
    if (!provider.capabilities.supportsHistorical) {
      throw WeatherError.unsupported(provider.id, "getHistorical");
    }

    const cacheKey = buildHistoricalCacheKey(provider.id, validated.data);

    if (!options.bypassCache) {
      const cached = this.cache.get<HistoricalWeather>(cacheKey);
      if (cached) {
        return this.applyUnitsToHistorical(cached.value, options.units);
      }
    }

    const raw = await this.deduplicator.execute(cacheKey, async () => {
      const response = await provider.getHistorical(validated.data, {
        signal: options.signal,
      });

      this.cache.set(cacheKey, response, {
        ttlSeconds: DEFAULT_CACHE_CONFIG.historical.ttlSeconds,
        staleWhileRevalidateSeconds:
          DEFAULT_CACHE_CONFIG.historical.staleSeconds,
      });

      return response;
    });

    return this.applyUnitsToHistorical(raw, options.units);
  }

  /**
   * Batch weather retrieval across multiple locations with bounded concurrency.
   * Catches errors on individual locations so one failure does not drop the entire batch.
   */
  async getBatchWeather(
    items: Array<{
      id?: string;
      name: string;
      latitude: number;
      longitude: number;
      country?: string;
      countryCode?: string;
      adminArea?: string;
      timezone?: string;
    }>,
    options: ServiceExecutionOptions & {
      maxConcurrency?: number;
    } = {}
  ): Promise<
    Array<{
      id?: string;
      location: {
        name: string;
        latitude: number;
        longitude: number;
        country?: string;
        countryCode?: string;
        adminArea?: string;
        timezone?: string;
      };
      bundle?: WeatherBundle;
      error?: string;
    }>
  > {
    const maxConcurrency = Math.min(items.length, options.maxConcurrency ?? 5);
    const results: Array<{
      id?: string;
      location: (typeof items)[number];
      bundle?: WeatherBundle;
      error?: string;
    }> = new Array(items.length);

    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        const item = items[index];
        try {
          const bundle = await this.getWeatherBundle(
            {
              name: item.name,
              country: item.country,
              countryCode: item.countryCode,
              adminArea: item.adminArea,
            },
            { latitude: item.latitude, longitude: item.longitude },
            {
              timezone: item.timezone,
              forecastDays: 3, // Lightweight for card overview
              units: options.units,
              bypassCache: options.bypassCache,
              signal: options.signal,
            }
          );
          results[index] = {
            id: item.id,
            location: item,
            bundle,
          };
        } catch (err: unknown) {
          results[index] = {
            id: item.id,
            location: item,
            error:
              err instanceof Error ? err.message : "Failed to load weather",
          };
        }
      }
    };

    const workers = Array.from({ length: maxConcurrency }, () => worker());
    await Promise.all(workers);

    return results;
  }

  /**
   * Convenience bundle containing current weather, hourly forecast, and daily forecast.
   */
  async getWeatherBundle(
    locationInput:
      | string
      | {
          name: string;
          country?: string;
          countryCode?: string;
          adminArea?: string;
          id?: string;
        },
    coords: Coordinates,
    options: ServiceExecutionOptions & {
      timezone?: string;
      forecastDays?: number;
    } = {}
  ): Promise<WeatherBundle> {
    const norm = normalizeCoordinates(coords);
    const locationObj =
      typeof locationInput === "string"
        ? { name: locationInput }
        : locationInput;

    const forecast = await this.getForecast(
      {
        latitude: norm.latitude,
        longitude: norm.longitude,
        timezone: options.timezone ?? "auto",
        forecastDays: options.forecastDays ?? 7,
        includeCurrent: true,
        includeHourly: true,
        includeDaily: true,
      },
      options
    );

    if (!forecast.current || !forecast.hourly || !forecast.daily) {
      throw WeatherError.invalidPayload(
        forecast.meta.provider,
        "Incomplete forecast bundle returned from provider"
      );
    }

    return {
      location: {
        id: locationObj.id,
        name: locationObj.name,
        country: locationObj.country,
        countryCode: locationObj.countryCode,
        adminArea: locationObj.adminArea,
        latitude: norm.latitude,
        longitude: norm.longitude,
        timezone: forecast.meta.timezone,
        elevation: forecast.meta.elevation,
      },
      current: forecast.current,
      hourly: forecast.hourly,
      daily: forecast.daily,
      meta: forecast.meta,
    };
  }

  /* ─────────────────────────────────────────────────────────────
     Unit Conversion Helpers (applied to presentation copy only)
     ───────────────────────────────────────────────────────────── */

  private applyUnitsToCurrent(
    data: { current: CurrentWeather; meta: WeatherResponseMeta },
    targetUnits?: UnitPreferences
  ): { current: CurrentWeather; meta: WeatherResponseMeta } {
    if (!targetUnits || this.isCanonical(targetUnits)) {
      return data;
    }

    const c = data.current;
    return {
      current: {
        ...c,
        temperature: convertTemperature(c.temperature, targetUnits.temperature),
        apparentTemperature: convertTemperature(
          c.apparentTemperature,
          targetUnits.temperature
        ),
        windSpeed: convertWindSpeed(c.windSpeed, targetUnits.windSpeed),
        windGusts:
          c.windGusts !== null && c.windGusts !== undefined
            ? convertWindSpeed(c.windGusts, targetUnits.windSpeed)
            : null,
        precipitation: convertPrecipitation(
          c.precipitation,
          targetUnits.precipitation
        ),
        rain:
          c.rain !== null && c.rain !== undefined
            ? convertPrecipitation(c.rain, targetUnits.precipitation)
            : null,
        showers:
          c.showers !== null && c.showers !== undefined
            ? convertPrecipitation(c.showers, targetUnits.precipitation)
            : null,
        pressureMsl: convertPressure(c.pressureMsl, targetUnits.pressure),
        surfacePressure:
          c.surfacePressure !== null && c.surfacePressure !== undefined
            ? convertPressure(c.surfacePressure, targetUnits.pressure)
            : null,
      },
      meta: {
        ...data.meta,
        units: targetUnits,
      },
    };
  }

  private applyUnitsToForecast(
    data: {
      current?: CurrentWeather;
      hourly?: HourlyForecast;
      daily?: DailyForecast;
      meta: WeatherResponseMeta;
    },
    targetUnits?: UnitPreferences
  ): {
    current?: CurrentWeather;
    hourly?: HourlyForecast;
    daily?: DailyForecast;
    meta: WeatherResponseMeta;
  } {
    if (!targetUnits || this.isCanonical(targetUnits)) {
      return data;
    }

    let convertedCurrent: CurrentWeather | undefined;
    if (data.current) {
      convertedCurrent = this.applyUnitsToCurrent(
        { current: data.current, meta: data.meta },
        targetUnits
      ).current;
    }

    let convertedHourly: HourlyForecast | undefined;
    if (data.hourly) {
      convertedHourly = {
        entries: data.hourly.entries.map((h) => ({
          ...h,
          temperature: convertTemperature(
            h.temperature,
            targetUnits.temperature
          ),
          apparentTemperature:
            h.apparentTemperature !== null &&
            h.apparentTemperature !== undefined
              ? convertTemperature(
                  h.apparentTemperature,
                  targetUnits.temperature
                )
              : null,
          windSpeed: convertWindSpeed(h.windSpeed, targetUnits.windSpeed),
          windGusts:
            h.windGusts !== null && h.windGusts !== undefined
              ? convertWindSpeed(h.windGusts, targetUnits.windSpeed)
              : null,
          precipitation: convertPrecipitation(
            h.precipitation,
            targetUnits.precipitation
          ),
          pressureMsl:
            h.pressureMsl !== null && h.pressureMsl !== undefined
              ? convertPressure(h.pressureMsl, targetUnits.pressure)
              : null,
          visibility:
            h.visibility !== null && h.visibility !== undefined
              ? convertDistance(h.visibility / 1000, targetUnits.distance)
              : null,
        })),
      };
    }

    let convertedDaily: DailyForecast | undefined;
    if (data.daily) {
      convertedDaily = {
        days: data.daily.days.map((d) => ({
          ...d,
          temperatureMax: convertTemperature(
            d.temperatureMax,
            targetUnits.temperature
          ),
          temperatureMin: convertTemperature(
            d.temperatureMin,
            targetUnits.temperature
          ),
          apparentTemperatureMax:
            d.apparentTemperatureMax !== null &&
            d.apparentTemperatureMax !== undefined
              ? convertTemperature(
                  d.apparentTemperatureMax,
                  targetUnits.temperature
                )
              : null,
          apparentTemperatureMin:
            d.apparentTemperatureMin !== null &&
            d.apparentTemperatureMin !== undefined
              ? convertTemperature(
                  d.apparentTemperatureMin,
                  targetUnits.temperature
                )
              : null,
          windSpeedMax: convertWindSpeed(d.windSpeedMax, targetUnits.windSpeed),
          windGustsMax:
            d.windGustsMax !== null && d.windGustsMax !== undefined
              ? convertWindSpeed(d.windGustsMax, targetUnits.windSpeed)
              : null,
          precipitationSum: convertPrecipitation(
            d.precipitationSum,
            targetUnits.precipitation
          ),
        })),
      };
    }

    return {
      current: convertedCurrent,
      hourly: convertedHourly,
      daily: convertedDaily,
      meta: {
        ...data.meta,
        units: targetUnits,
      },
    };
  }

  private applyUnitsToHistorical(
    data: HistoricalWeather,
    units?: UnitPreferences
  ): HistoricalWeather {
    if (!units || this.isCanonical(units)) {
      return data;
    }

    return {
      ...data,
      dailySummaries: data.dailySummaries.map((day) => ({
        ...day,
        temperatureMax: convertTemperature(
          day.temperatureMax,
          units.temperature
        ),
        temperatureMin: convertTemperature(
          day.temperatureMin,
          units.temperature
        ),
        temperatureMean:
          day.temperatureMean !== null && day.temperatureMean !== undefined
            ? convertTemperature(day.temperatureMean, units.temperature)
            : null,
        precipitationSum: convertPrecipitation(
          day.precipitationSum,
          units.precipitation
        ),
        windSpeedMax:
          day.windSpeedMax !== null && day.windSpeedMax !== undefined
            ? convertWindSpeed(day.windSpeedMax, units.windSpeed)
            : null,
      })),
      hourlyEntries: data.hourlyEntries?.map((entry) => ({
        ...entry,
        temperature: convertTemperature(entry.temperature, units.temperature),
        precipitation: convertPrecipitation(
          entry.precipitation,
          units.precipitation
        ),
        windSpeed:
          entry.windSpeed !== null && entry.windSpeed !== undefined
            ? convertWindSpeed(entry.windSpeed, units.windSpeed)
            : null,
        pressureMsl:
          entry.pressureMsl !== null && entry.pressureMsl !== undefined
            ? convertPressure(entry.pressureMsl, units.pressure)
            : null,
      })),
    };
  }

  private isCanonical(units: UnitPreferences): boolean {
    return (
      units.temperature === CanonicalUnits.temperature &&
      units.windSpeed === CanonicalUnits.windSpeed &&
      units.precipitation === CanonicalUnits.precipitation &&
      units.pressure === CanonicalUnits.pressure &&
      units.distance === CanonicalUnits.distance &&
      units.elevation === CanonicalUnits.elevation
    );
  }
}

// Global default service instance
let globalWeatherService: WeatherService | undefined;

export function getWeatherService(): WeatherService {
  if (!globalWeatherService) {
    globalWeatherService = new WeatherService();
  }
  return globalWeatherService;
}
