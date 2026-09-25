import { GeocodingLocation, formatLocationLabel } from "../../domain/types";
import {
  GeocodingQueryInput,
  GeocodingQuerySchema,
} from "../../domain/schemas";
import { GeocodingProvider, GeocodingProviderCapabilities } from "../types";
import {
  ALLOWED_GEOCODING_HOSTS,
  DEFAULT_GEOCODING_ENDPOINT,
  DEFAULT_GEOCODING_GET_ENDPOINT,
  OPEN_METEO_GEOCODING_CAPABILITIES,
  OPEN_METEO_GEOCODING_PROVIDER_ID,
} from "./constants";
import {
  OpenMeteoGeocodingRawItem,
  OpenMeteoGeocodingSearchResponse,
} from "./types";
import { WeatherError } from "../../../weather/errors/weather-error";

export interface OpenMeteoGeocodingAdapterOptions {
  searchEndpoint?: string;
  getEndpoint?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchFn?: typeof fetch;
}

/**
 * Validates endpoint URL against allowed Open-Meteo domains to prevent SSRF.
 */
function validateEndpoint(urlStr: string, defaultUrl: string): URL {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return new URL(defaultUrl);
    }
    if (
      !ALLOWED_GEOCODING_HOSTS.has(parsed.host) &&
      !parsed.host.includes("localhost") &&
      !parsed.host.includes("127.0.0.1")
    ) {
      throw new Error(
        `Untrusted host '${parsed.host}' for Open-Meteo Geocoding`
      );
    }
    return parsed;
  } catch {
    return new URL(defaultUrl);
  }
}

export class OpenMeteoGeocodingAdapter implements GeocodingProvider {
  readonly id = OPEN_METEO_GEOCODING_PROVIDER_ID;
  readonly capabilities: GeocodingProviderCapabilities =
    OPEN_METEO_GEOCODING_CAPABILITIES;

  private readonly searchEndpoint: string;
  private readonly getEndpoint: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetch: typeof fetch;

  constructor(options: OpenMeteoGeocodingAdapterOptions = {}) {
    this.searchEndpoint = options.searchEndpoint ?? DEFAULT_GEOCODING_ENDPOINT;
    this.getEndpoint = options.getEndpoint ?? DEFAULT_GEOCODING_GET_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? 6000;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetch = options.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Search for locations matching query term.
   */
  async search(
    query: GeocodingQueryInput,
    options?: { signal?: AbortSignal }
  ): Promise<{ results: GeocodingLocation[]; generationTimeMs?: number }> {
    const validated = GeocodingQuerySchema.safeParse(query);
    if (!validated.success) {
      throw WeatherError.invalidParameters(
        validated.error.issues[0]?.message ?? "Invalid search query"
      );
    }

    const { query: searchTerm, count, language, countryCode } = validated.data;
    const url = validateEndpoint(
      this.searchEndpoint,
      DEFAULT_GEOCODING_ENDPOINT
    );

    url.searchParams.set("name", searchTerm);
    url.searchParams.set("count", Math.min(count, 100).toString());
    url.searchParams.set("language", language);
    url.searchParams.set("format", "json");

    if (countryCode) {
      url.searchParams.set("countryCode", countryCode);
    }

    const raw = await this.executeRequest<OpenMeteoGeocodingSearchResponse>(
      url,
      options?.signal
    );

    if (
      !raw.results ||
      !Array.isArray(raw.results) ||
      raw.results.length === 0
    ) {
      return {
        results: [],
        generationTimeMs: raw.generationtime_ms,
      };
    }

    const locations = raw.results
      .map((item) => this.mapRawItemToLocation(item))
      .filter((loc): loc is GeocodingLocation => loc !== null);

    return {
      results: locations,
      generationTimeMs: raw.generationtime_ms,
    };
  }

  /**
   * Direct location lookup by upstream Open-Meteo / GeoNames ID.
   */
  async getById(
    id: string | number,
    options?: { signal?: AbortSignal }
  ): Promise<GeocodingLocation | null> {
    const rawId =
      typeof id === "string" && id.startsWith("open-meteo:")
        ? id.replace("open-meteo:", "")
        : id.toString();

    const numericId = parseInt(rawId, 10);
    if (isNaN(numericId) || numericId <= 0) {
      throw WeatherError.invalidParameters(`Invalid location ID: '${id}'`);
    }

    const url = validateEndpoint(
      this.getEndpoint,
      DEFAULT_GEOCODING_GET_ENDPOINT
    );
    url.searchParams.set("id", numericId.toString());

    try {
      const raw = await this.executeRequest<OpenMeteoGeocodingRawItem>(
        url,
        options?.signal
      );
      if (!raw || !raw.id) {
        return null;
      }
      return this.mapRawItemToLocation(raw);
    } catch (err) {
      if (err instanceof WeatherError && err.statusCode === 404) {
        return null;
      }
      throw err;
    }
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
        externalSignal.addEventListener(
          "abort",
          () => timeoutController.abort(),
          {
            once: true,
          }
        );
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
            data.reason ?? "Open-Meteo Geocoding returned an error payload"
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

        if (timeoutController.signal.aborted) {
          if (attempt > this.maxRetries) {
            throw WeatherError.providerTimeout(this.id, this.timeoutMs);
          }
          await this.delay(this.getBackoffDelay(attempt));
          continue;
        }

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

    if (status === 404) {
      throw new WeatherError({
        message: reason || "Location not found",
        code: "NOT_FOUND",
        statusCode: 404,
        provider: this.id,
        isRetryable: false,
      });
    }

    if (status >= 400 && status < 500) {
      throw WeatherError.invalidParameters(
        reason || `Open-Meteo rejected search with HTTP ${status}`
      );
    }

    if (status >= 500) {
      throw WeatherError.providerUnavailable(
        this.id,
        status,
        reason || `Upstream Open-Meteo error (${status})`
      );
    }

    throw WeatherError.providerUnavailable(this.id, status, reason);
  }

  private getBackoffDelay(attempt: number, retryAfterSec?: number): number {
    if (retryAfterSec && retryAfterSec > 0) {
      return retryAfterSec * 1000;
    }
    const base = Math.min(1000, 150 * Math.pow(2, attempt - 1));
    const jitter = Math.random() * 50;
    return base + jitter;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* ─────────────────────────────────────────────────────────────
     Domain Model Mapping
     ───────────────────────────────────────────────────────────── */

  private mapRawItemToLocation(
    item: OpenMeteoGeocodingRawItem
  ): GeocodingLocation | null {
    if (
      typeof item.latitude !== "number" ||
      typeof item.longitude !== "number" ||
      item.latitude < -90 ||
      item.latitude > 90 ||
      item.longitude < -180 ||
      item.longitude > 180 ||
      !item.name
    ) {
      return null;
    }

    const countryCode = item.country_code
      ? item.country_code.toUpperCase()
      : undefined;

    const formattedAddress = formatLocationLabel({
      name: item.name,
      adminArea: item.admin1,
      country: item.country,
      countryCode,
    });

    return {
      id: `open-meteo:${item.id}`,
      providerId: this.id,
      sourceId: item.id,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      country: item.country,
      countryCode,
      adminArea: item.admin1,
      adminArea2: item.admin2,
      adminArea3: item.admin3,
      elevation: item.elevation,
      timezone: item.timezone,
      population: item.population,
      postcodes: item.postcodes,
      featureCode: item.feature_code,
      formattedAddress,
    };
  }
}
