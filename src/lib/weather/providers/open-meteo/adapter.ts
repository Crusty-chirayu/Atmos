import { Coordinates, CoordinatesSchema } from "../../domain/location";
import { CanonicalUnits } from "../../domain/units";
import {
  CurrentWeather,
  DailyForecast,
  DailyForecastDay,
  HistoricalWeather,
  HistoricalDailySummary,
  HistoricalWeatherEntry,
  HourlyForecast,
  HourlyForecastEntry,
  WeatherResponseMeta,
  getWeatherConditionInfo,
} from "../../domain/weather";
import {
  ForecastQueryOptionsInput,
  ForecastQueryOptionsSchema,
  HistoricalQueryOptionsInput,
  HistoricalQueryOptionsSchema,
} from "../../domain/schemas";
import { WeatherError } from "../../errors/weather-error";
import {
  DEFAULT_ARCHIVE_ENDPOINT,
  DEFAULT_FORECAST_ENDPOINT,
  OPEN_METEO_CAPABILITIES,
  OPEN_METEO_CURRENT_VARS,
  OPEN_METEO_DAILY_VARS,
  OPEN_METEO_HISTORICAL_DAILY_VARS,
  OPEN_METEO_HISTORICAL_HOURLY_VARS,
  OPEN_METEO_HOURLY_VARS,
  OPEN_METEO_PROVIDER_ID,
} from "./constants";
import {
  OpenMeteoArchiveResponse,
  OpenMeteoCurrentResponse,
  OpenMeteoDailyResponse,
  OpenMeteoForecastResponse,
  OpenMeteoHourlyResponse,
} from "./types";
import {
  ForecastResult,
  ProviderCapabilities,
  WeatherProvider,
} from "../types";

export interface OpenMeteoAdapterOptions {
  forecastEndpoint?: string;
  archiveEndpoint?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchFn?: typeof fetch;
}

const ALLOWED_HOSTS = new Set([
  "api.open-meteo.com",
  "archive-api.open-meteo.com",
]);

/**
 * Validates endpoint URL against allowed Open-Meteo domains to prevent SSRF.
 */
function validateEndpoint(urlStr: string, defaultUrl: string): URL {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return new URL(defaultUrl);
    }
    // In production or test environments, ensure destination host is trusted
    if (
      !ALLOWED_HOSTS.has(parsed.host) &&
      !parsed.host.includes("localhost") &&
      !parsed.host.includes("127.0.0.1")
    ) {
      throw new Error(
        `Untrusted host '${parsed.host}' for Open-Meteo endpoint`
      );
    }
    return parsed;
  } catch {
    return new URL(defaultUrl);
  }
}

export class OpenMeteoAdapter implements WeatherProvider {
  readonly id = OPEN_METEO_PROVIDER_ID;
  readonly capabilities: ProviderCapabilities = OPEN_METEO_CAPABILITIES;

  private readonly forecastEndpoint: string;
  private readonly archiveEndpoint: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetch: typeof fetch;

  constructor(options: OpenMeteoAdapterOptions = {}) {
    this.forecastEndpoint =
      options.forecastEndpoint ?? DEFAULT_FORECAST_ENDPOINT;
    this.archiveEndpoint = options.archiveEndpoint ?? DEFAULT_ARCHIVE_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetch = options.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Fetch current weather conditions for the specified coordinates.
   */
  async getCurrent(
    coords: Coordinates,
    options?: { timezone?: string; signal?: AbortSignal }
  ): Promise<{ current: CurrentWeather; meta: WeatherResponseMeta }> {
    const validatedCoords = CoordinatesSchema.safeParse(coords);
    if (!validatedCoords.success) {
      throw WeatherError.invalidCoordinates(
        validatedCoords.error.issues[0]?.message ?? "Invalid coordinates"
      );
    }

    const forecast = await this.getForecast(
      {
        latitude: validatedCoords.data.latitude,
        longitude: validatedCoords.data.longitude,
        timezone: options?.timezone ?? "auto",
        forecastDays: 1,
        includeCurrent: true,
        includeHourly: false,
        includeDaily: false,
      },
      { signal: options?.signal }
    );

    if (!forecast.current) {
      throw WeatherError.invalidPayload(
        this.id,
        "Current weather was requested but omitted from provider response"
      );
    }

    return {
      current: forecast.current,
      meta: forecast.meta,
    };
  }

  /**
   * Fetch current conditions, hourly forecast, and daily forecast.
   */
  async getForecast(
    options: ForecastQueryOptionsInput,
    extra?: { signal?: AbortSignal }
  ): Promise<ForecastResult> {
    const validated = ForecastQueryOptionsSchema.safeParse(options);
    if (!validated.success) {
      throw WeatherError.invalidParameters(
        validated.error.issues[0]?.message ?? "Invalid forecast options"
      );
    }

    const query = validated.data;
    const url = validateEndpoint(
      this.forecastEndpoint,
      DEFAULT_FORECAST_ENDPOINT
    );

    url.searchParams.set("latitude", query.latitude.toString());
    url.searchParams.set("longitude", query.longitude.toString());
    url.searchParams.set("timezone", query.timezone);
    url.searchParams.set(
      "forecast_days",
      Math.min(query.forecastDays, 16).toString()
    );

    if (query.includeCurrent) {
      url.searchParams.set("current", OPEN_METEO_CURRENT_VARS.join(","));
    }
    if (query.includeHourly) {
      url.searchParams.set("hourly", OPEN_METEO_HOURLY_VARS.join(","));
    }
    if (query.includeDaily) {
      url.searchParams.set("daily", OPEN_METEO_DAILY_VARS.join(","));
    }

    const raw = await this.executeRequest<OpenMeteoForecastResponse>(
      url,
      extra?.signal
    );

    const meta: WeatherResponseMeta = {
      provider: this.id,
      fetchedAt: new Date().toISOString(),
      timezone: raw.timezone ?? query.timezone,
      elevation: raw.elevation,
      isCached: false,
      isStale: false,
      units: CanonicalUnits,
      coverageLimitations:
        query.forecastDays > 16
          ? ["Open-Meteo forecast horizon is capped at 16 days."]
          : undefined,
    };

    let current: CurrentWeather | undefined;
    if (raw.current) {
      current = this.mapCurrentWeather(raw.current);
    }

    let hourly: HourlyForecast | undefined;
    if (raw.hourly && raw.hourly.time && raw.hourly.time.length > 0) {
      hourly = this.mapHourlyForecast(raw.hourly);
    }

    let daily: DailyForecast | undefined;
    if (raw.daily && raw.daily.time && raw.daily.time.length > 0) {
      daily = this.mapDailyForecast(raw.daily);
    }

    return {
      current,
      hourly,
      daily,
      meta,
    };
  }

  /**
   * Fetch historical reanalysis weather data for a given date range.
   */
  async getHistorical(
    options: HistoricalQueryOptionsInput,
    extra?: { signal?: AbortSignal }
  ): Promise<HistoricalWeather> {
    const validated = HistoricalQueryOptionsSchema.safeParse(options);
    if (!validated.success) {
      throw WeatherError.invalidParameters(
        validated.error.issues[0]?.message ?? "Invalid historical options"
      );
    }

    const query = validated.data;
    const url = validateEndpoint(
      this.archiveEndpoint,
      DEFAULT_ARCHIVE_ENDPOINT
    );

    url.searchParams.set("latitude", query.latitude.toString());
    url.searchParams.set("longitude", query.longitude.toString());
    url.searchParams.set("start_date", query.startDate);
    url.searchParams.set("end_date", query.endDate);
    url.searchParams.set("timezone", query.timezone);
    url.searchParams.set("daily", OPEN_METEO_HISTORICAL_DAILY_VARS.join(","));

    if (query.includeHourly) {
      url.searchParams.set(
        "hourly",
        OPEN_METEO_HISTORICAL_HOURLY_VARS.join(",")
      );
    }

    const raw = await this.executeRequest<OpenMeteoArchiveResponse>(
      url,
      extra?.signal
    );

    return this.mapHistoricalWeather(raw, query.startDate, query.endDate);
  }

  /* ─────────────────────────────────────────────────────────────
     Network Execution with Bounded Retry, Timeout & Error Mapping
     ───────────────────────────────────────────────────────────── */

  private async executeRequest<T>(
    url: URL,
    externalSignal?: AbortSignal
  ): Promise<T> {
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      attempt++;
      const timeoutController = new AbortController();
      const timer = setTimeout(() => {
        timeoutController.abort();
      }, this.timeoutMs);

      // Link external signal if provided
      const combinedSignal: AbortSignal = timeoutController.signal;
      if (externalSignal) {
        if (externalSignal.aborted) {
          clearTimeout(timer);
          throw new WeatherError({
            message: "Request aborted by caller",
            code: "PROVIDER_TIMEOUT",
            statusCode: 499,
            isRetryable: false,
            provider: this.id,
          });
        }
        // Handle abort from either controller
        const onAbort = () => timeoutController.abort();
        externalSignal.addEventListener("abort", onAbort, { once: true });
      }

      try {
        const response = await this.fetch(url.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "ATMOS-WeatherPlatform/0.1.0",
          },
          signal: combinedSignal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          await this.handleHttpError(response);
        }

        const data = (await response.json()) as T & {
          error?: boolean;
          reason?: string;
        };

        if (data && typeof data === "object" && data.error === true) {
          throw WeatherError.invalidParameters(
            data.reason ?? "Open-Meteo returned an error payload"
          );
        }

        return data;
      } catch (err: unknown) {
        clearTimeout(timer);

        if (err instanceof WeatherError) {
          if (!err.isRetryable || attempt > this.maxRetries) {
            throw err;
          }
          await this.delay(
            this.getBackoffDelay(attempt, err.retryAfterSeconds)
          );
          continue;
        }

        // Check if aborted due to timeout
        if (timeoutController.signal.aborted) {
          if (attempt > this.maxRetries) {
            throw WeatherError.providerTimeout(this.id, this.timeoutMs);
          }
          await this.delay(this.getBackoffDelay(attempt));
          continue;
        }

        // Generic network error
        if (attempt > this.maxRetries) {
          throw WeatherError.networkError(this.id, err);
        }
        await this.delay(this.getBackoffDelay(attempt));
      }
    }

    throw WeatherError.providerUnavailable(this.id, 502, "Exhausted retries");
  }

  private async handleHttpError(response: Response): Promise<never> {
    const status = response.status;
    let reason = "";

    try {
      const errBody = (await response.json()) as {
        reason?: string;
        message?: string;
      };
      reason = errBody.reason || errBody.message || "";
    } catch {
      // Body not JSON
    }

    if (status === 429) {
      const retryAfterHeader = response.headers.get("Retry-After");
      const retryAfterSec = retryAfterHeader
        ? parseInt(retryAfterHeader, 10)
        : undefined;
      throw WeatherError.rateLimited(
        this.id,
        !isNaN(Number(retryAfterSec)) ? retryAfterSec : undefined
      );
    }

    if (status >= 400 && status < 500) {
      throw WeatherError.invalidParameters(
        reason || `Open-Meteo rejected request with HTTP ${status}`
      );
    }

    if (status >= 500) {
      throw WeatherError.providerUnavailable(
        this.id,
        status,
        reason || `Upstream Open-Meteo 5xx error (${status})`
      );
    }

    throw WeatherError.providerUnavailable(this.id, status, reason);
  }

  private getBackoffDelay(attempt: number, retryAfterSec?: number): number {
    if (retryAfterSec && retryAfterSec > 0) {
      return retryAfterSec * 1000;
    }
    // Exponential backoff: 200ms, 400ms, 800ms with small jitter
    const base = Math.min(1000, 200 * Math.pow(2, attempt - 1));
    const jitter = Math.random() * 50;
    return base + jitter;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* ─────────────────────────────────────────────────────────────
     Domain Model Mapping
     ───────────────────────────────────────────────────────────── */

  private mapCurrentWeather(raw: OpenMeteoCurrentResponse): CurrentWeather {
    const condition = getWeatherConditionInfo(raw.weather_code);

    return {
      timestamp: raw.time,
      temperature: raw.temperature_2m,
      apparentTemperature: raw.apparent_temperature,
      relativeHumidity: raw.relative_humidity_2m,
      precipitation: raw.precipitation ?? 0,
      rain: raw.rain ?? null,
      showers: raw.showers ?? null,
      snowfall: raw.snowfall ?? null,
      weatherCode: raw.weather_code,
      conditionText: condition.label,
      conditionCategory: condition.category,
      cloudCover: raw.cloud_cover ?? 0,
      pressureMsl: raw.pressure_msl,
      surfacePressure: raw.surface_pressure ?? null,
      windSpeed: raw.wind_speed_10m,
      windDirection: raw.wind_direction_10m,
      windGusts: raw.wind_gusts_10m ?? null,
      isDay: raw.is_day === 1,
    };
  }

  private mapHourlyForecast(raw: OpenMeteoHourlyResponse): HourlyForecast {
    const entries: HourlyForecastEntry[] = [];
    const count = raw.time.length;

    for (let i = 0; i < count; i++) {
      const code = raw.weather_code?.[i] ?? 0;
      const condition = getWeatherConditionInfo(code);
      const temp = raw.temperature_2m?.[i];

      // Skip entries where critical temperature is missing entirely
      if (temp === undefined || temp === null) {
        continue;
      }

      entries.push({
        timestamp: raw.time[i]!,
        temperature: temp,
        apparentTemperature: raw.apparent_temperature?.[i] ?? null,
        relativeHumidity: raw.relative_humidity_2m?.[i] ?? null,
        precipitationProbability: raw.precipitation_probability?.[i] ?? null,
        precipitation: raw.precipitation?.[i] ?? 0,
        weatherCode: code,
        conditionText: condition.label,
        conditionCategory: condition.category,
        cloudCover: raw.cloud_cover?.[i] ?? null,
        windSpeed: raw.wind_speed_10m?.[i] ?? 0,
        windDirection: raw.wind_direction_10m?.[i] ?? 0,
        windGusts: raw.wind_gusts_10m?.[i] ?? null,
        pressureMsl: raw.pressure_msl?.[i] ?? null,
        visibility: raw.visibility?.[i] ?? null,
        uvIndex: raw.uv_index?.[i] ?? null,
        isDay:
          raw.is_day?.[i] !== undefined && raw.is_day[i] !== null
            ? raw.is_day[i] === 1
            : null,
      });
    }

    return { entries };
  }

  private mapDailyForecast(raw: OpenMeteoDailyResponse): DailyForecast {
    const days: DailyForecastDay[] = [];
    const count = raw.time.length;

    for (let i = 0; i < count; i++) {
      const code = raw.weather_code?.[i] ?? 0;
      const condition = getWeatherConditionInfo(code);
      const tempMax = raw.temperature_2m_max?.[i];
      const tempMin = raw.temperature_2m_min?.[i];

      if (
        tempMax === undefined ||
        tempMax === null ||
        tempMin === undefined ||
        tempMin === null
      ) {
        continue;
      }

      days.push({
        date: raw.time[i]!,
        weatherCode: code,
        conditionText: condition.label,
        conditionCategory: condition.category,
        temperatureMax: tempMax,
        temperatureMin: tempMin,
        apparentTemperatureMax: raw.apparent_temperature_max?.[i] ?? null,
        apparentTemperatureMin: raw.apparent_temperature_min?.[i] ?? null,
        precipitationSum: raw.precipitation_sum?.[i] ?? 0,
        precipitationProbabilityMax:
          raw.precipitation_probability_max?.[i] ?? null,
        precipitationHours: raw.precipitation_hours?.[i] ?? null,
        sunrise: raw.sunrise?.[i] ?? null,
        sunset: raw.sunset?.[i] ?? null,
        uvIndexMax: raw.uv_index_max?.[i] ?? null,
        windSpeedMax: raw.wind_speed_10m_max?.[i] ?? 0,
        windGustsMax: raw.wind_gusts_10m_max?.[i] ?? null,
        windDirectionDominant: raw.wind_direction_10m_dominant?.[i] ?? null,
      });
    }

    return { days };
  }

  private mapHistoricalWeather(
    raw: OpenMeteoArchiveResponse,
    startDate: string,
    endDate: string
  ): HistoricalWeather {
    const dailySummaries: HistoricalDailySummary[] = [];

    if (raw.daily && raw.daily.time) {
      const count = raw.daily.time.length;
      for (let i = 0; i < count; i++) {
        const code = raw.daily.weather_code?.[i];
        const condition =
          code !== undefined && code !== null
            ? getWeatherConditionInfo(code).label
            : null;
        const tempMax = raw.daily.temperature_2m_max?.[i];
        const tempMin = raw.daily.temperature_2m_min?.[i];

        if (
          tempMax === undefined ||
          tempMax === null ||
          tempMin === undefined ||
          tempMin === null
        ) {
          continue;
        }

        dailySummaries.push({
          date: raw.daily.time[i]!,
          weatherCode: code ?? null,
          conditionText: condition,
          temperatureMax: tempMax,
          temperatureMin: tempMin,
          temperatureMean: raw.daily.temperature_2m_mean?.[i] ?? null,
          precipitationSum: raw.daily.precipitation_sum?.[i] ?? 0,
          windSpeedMax: raw.daily.wind_speed_10m_max?.[i] ?? null,
        });
      }
    }

    const hourlyEntries: HistoricalWeatherEntry[] = [];
    if (raw.hourly && raw.hourly.time) {
      const count = raw.hourly.time.length;
      for (let i = 0; i < count; i++) {
        const temp = raw.hourly.temperature_2m?.[i];
        if (temp === undefined || temp === null) {
          continue;
        }
        const code = raw.hourly.weather_code?.[i];
        hourlyEntries.push({
          timestamp: raw.hourly.time[i]!,
          temperature: temp,
          relativeHumidity: raw.hourly.relative_humidity_2m?.[i] ?? null,
          precipitation: raw.hourly.precipitation?.[i] ?? 0,
          weatherCode: code ?? null,
          conditionText:
            code !== undefined && code !== null
              ? getWeatherConditionInfo(code).label
              : null,
          windSpeed: raw.hourly.wind_speed_10m?.[i] ?? null,
          pressureMsl: raw.hourly.pressure_msl?.[i] ?? null,
        });
      }
    }

    return {
      startDate,
      endDate,
      dataSource: "Open-Meteo Historical Weather API (ERA5 Reanalysis)",
      qualityNotes:
        "High-resolution atmospheric reanalysis model data from ECMWF / Open-Meteo.",
      dailySummaries,
      hourlyEntries: hourlyEntries.length > 0 ? hourlyEntries : undefined,
    };
  }
}
