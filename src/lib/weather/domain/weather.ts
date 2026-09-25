import { Location } from "./location";
import { UnitPreferences } from "./units";

/**
 * WMO Weather interpretation code descriptions (0-99).
 * Standardized across meteorological organizations.
 */
export const WMO_CODE_MAP: Record<
  number,
  { label: string; category: WeatherCategory; isSevere: boolean }
> = {
  0: { label: "Clear sky", category: "clear", isSevere: false },
  1: { label: "Mainly clear", category: "partly_cloudy", isSevere: false },
  2: { label: "Partly cloudy", category: "partly_cloudy", isSevere: false },
  3: { label: "Overcast", category: "cloudy", isSevere: false },
  45: { label: "Fog", category: "fog", isSevere: false },
  48: { label: "Depositing rime fog", category: "fog", isSevere: false },
  51: { label: "Light drizzle", category: "drizzle", isSevere: false },
  53: { label: "Moderate drizzle", category: "drizzle", isSevere: false },
  55: { label: "Dense drizzle", category: "drizzle", isSevere: false },
  56: { label: "Light freezing drizzle", category: "drizzle", isSevere: false },
  57: { label: "Dense freezing drizzle", category: "drizzle", isSevere: false },
  61: { label: "Slight rain", category: "rain", isSevere: false },
  63: { label: "Moderate rain", category: "rain", isSevere: false },
  65: { label: "Heavy rain", category: "rain", isSevere: true },
  66: { label: "Light freezing rain", category: "rain", isSevere: false },
  67: { label: "Heavy freezing rain", category: "rain", isSevere: true },
  71: { label: "Slight snow fall", category: "snow", isSevere: false },
  73: { label: "Moderate snow fall", category: "snow", isSevere: false },
  75: { label: "Heavy snow fall", category: "snow", isSevere: true },
  77: { label: "Snow grains", category: "snow", isSevere: false },
  80: { label: "Slight rain showers", category: "showers", isSevere: false },
  81: { label: "Moderate rain showers", category: "showers", isSevere: false },
  82: { label: "Violent rain showers", category: "showers", isSevere: true },
  85: { label: "Slight snow showers", category: "snow", isSevere: false },
  86: { label: "Heavy snow showers", category: "snow", isSevere: true },
  95: { label: "Thunderstorm", category: "thunderstorm", isSevere: true },
  96: {
    label: "Thunderstorm with slight hail",
    category: "thunderstorm",
    isSevere: true,
  },
  99: {
    label: "Thunderstorm with heavy hail",
    category: "thunderstorm",
    isSevere: true,
  },
};

export type WeatherCategory =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "showers"
  | "snow"
  | "thunderstorm"
  | "unknown";

export function getWeatherConditionInfo(code: number): {
  label: string;
  category: WeatherCategory;
  isSevere: boolean;
} {
  const match = WMO_CODE_MAP[code];
  if (match) {
    return match;
  }
  return {
    label: `Unknown condition (${code})`,
    category: "unknown",
    isSevere: false,
  };
}

/**
 * Standard metadata attached to all weather responses for provenance and trust.
 */
export interface WeatherResponseMeta {
  provider: string;
  fetchedAt: string; // ISO 8601
  validAt?: string; // ISO 8601
  isCached: boolean;
  isStale: boolean;
  units: UnitPreferences;
  timezone: string;
  elevation?: number;
  warnings?: string[];
  coverageLimitations?: string[];
}

/**
 * Normalized current weather conditions.
 * Canonical units: Celsius, km/h, mm, hPa, % (0-100), degrees (0-360).
 */
export interface CurrentWeather {
  timestamp: string; // ISO 8601
  temperature: number; // Celsius
  apparentTemperature: number; // Celsius
  relativeHumidity: number; // %
  precipitation: number; // mm
  rain?: number | null; // mm
  showers?: number | null; // mm
  snowfall?: number | null; // cm or mm
  weatherCode: number; // WMO code
  conditionText: string;
  conditionCategory: WeatherCategory;
  cloudCover: number; // %
  pressureMsl: number; // hPa
  surfacePressure?: number | null; // hPa
  windSpeed: number; // km/h
  windDirection: number; // degrees
  windGusts?: number | null; // km/h
  isDay: boolean;
  uvIndex?: number | null;
}

/**
 * Hourly forecast entry.
 */
export interface HourlyForecastEntry {
  timestamp: string; // ISO 8601
  temperature: number;
  apparentTemperature?: number | null;
  relativeHumidity?: number | null;
  precipitationProbability?: number | null; // % (0-100)
  precipitation: number; // mm
  weatherCode: number;
  conditionText: string;
  conditionCategory: WeatherCategory;
  cloudCover?: number | null;
  windSpeed: number;
  windDirection: number;
  windGusts?: number | null;
  pressureMsl?: number | null;
  visibility?: number | null; // meters
  uvIndex?: number | null;
  isDay?: boolean | null;
}

export interface HourlyForecast {
  entries: HourlyForecastEntry[];
}

/**
 * Daily forecast summary.
 */
export interface DailyForecastDay {
  date: string; // YYYY-MM-DD
  weatherCode: number;
  conditionText: string;
  conditionCategory: WeatherCategory;
  temperatureMax: number;
  temperatureMin: number;
  apparentTemperatureMax?: number | null;
  apparentTemperatureMin?: number | null;
  precipitationSum: number; // mm
  precipitationProbabilityMax?: number | null; // %
  precipitationHours?: number | null;
  sunrise?: string | null; // ISO 8601
  sunset?: string | null; // ISO 8601
  uvIndexMax?: number | null;
  windSpeedMax: number;
  windGustsMax?: number | null;
  windDirectionDominant?: number | null;
}

export interface DailyForecast {
  days: DailyForecastDay[];
}

/**
 * Historical weather data model.
 */
export interface HistoricalDailySummary {
  date: string; // YYYY-MM-DD
  weatherCode?: number | null;
  conditionText?: string | null;
  temperatureMax: number;
  temperatureMin: number;
  temperatureMean?: number | null;
  precipitationSum: number;
  windSpeedMax?: number | null;
}

export interface HistoricalWeatherEntry {
  timestamp: string; // ISO 8601
  temperature: number;
  relativeHumidity?: number | null;
  precipitation: number;
  weatherCode?: number | null;
  conditionText?: string | null;
  windSpeed?: number | null;
  pressureMsl?: number | null;
}

export interface HistoricalWeather {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  dataSource: string;
  qualityNotes?: string;
  dailySummaries: HistoricalDailySummary[];
  hourlyEntries?: HistoricalWeatherEntry[];
}

/**
 * Complete weather bundle containing location, current conditions, forecasts, and provenance.
 */
export interface WeatherBundle {
  location: Location;
  current: CurrentWeather;
  hourly: HourlyForecast;
  daily: DailyForecast;
  meta: WeatherResponseMeta;
}
