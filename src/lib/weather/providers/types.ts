import { Coordinates } from "../domain/location";
import {
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  HistoricalWeather,
  WeatherResponseMeta,
} from "../domain/weather";
import {
  ForecastQueryOptionsInput,
  HistoricalQueryOptionsInput,
} from "../domain/schemas";

export interface ProviderCapabilities {
  id: string;
  name: string;
  supportsCurrent: boolean;
  supportsHourlyForecast: boolean;
  supportsDailyForecast: boolean;
  maxForecastDays: number;
  supportsHistorical: boolean;
  supportsAirQuality: boolean;
  requiresApiKey: boolean;
  attribution: string;
  termsUrl?: string;
}

export interface ForecastResult {
  current?: CurrentWeather;
  hourly?: HourlyForecast;
  daily?: DailyForecast;
  meta: WeatherResponseMeta;
}

/**
 * Universal contract that any weather provider adapter must fulfill.
 * Future providers (e.g., OpenWeather, Tomorrow.io, ECMWF) implement this interface.
 */
export interface WeatherProvider {
  readonly id: string;
  readonly capabilities: ProviderCapabilities;

  getCurrent(
    coords: Coordinates,
    options?: { timezone?: string; signal?: AbortSignal }
  ): Promise<{ current: CurrentWeather; meta: WeatherResponseMeta }>;

  getForecast(
    options: ForecastQueryOptionsInput,
    extra?: { signal?: AbortSignal }
  ): Promise<ForecastResult>;

  getHistorical(
    options: HistoricalQueryOptionsInput,
    extra?: { signal?: AbortSignal }
  ): Promise<HistoricalWeather>;
}
