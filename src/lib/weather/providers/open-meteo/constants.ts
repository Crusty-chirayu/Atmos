import { ProviderCapabilities } from "../types";

export const OPEN_METEO_PROVIDER_ID = "open-meteo";

export const DEFAULT_FORECAST_ENDPOINT =
  "https://api.open-meteo.com/v1/forecast";
export const DEFAULT_ARCHIVE_ENDPOINT =
  "https://archive-api.open-meteo.com/v1/archive";

export const OPEN_METEO_CAPABILITIES: ProviderCapabilities = {
  id: OPEN_METEO_PROVIDER_ID,
  name: "Open-Meteo",
  supportsCurrent: true,
  supportsHourlyForecast: true,
  supportsDailyForecast: true,
  maxForecastDays: 16,
  supportsHistorical: true,
  supportsAirQuality: false, // Handled by separate Open-Meteo Air Quality API
  requiresApiKey: false,
  attribution: "Weather data by Open-Meteo.com (CC BY 4.0)",
  termsUrl: "https://open-meteo.com/en/terms",
};

export const OPEN_METEO_CURRENT_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "rain",
  "showers",
  "snowfall",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
] as const;

export const OPEN_METEO_HOURLY_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "pressure_msl",
  "surface_pressure",
  "cloud_cover",
  "visibility",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
  "is_day",
] as const;

export const OPEN_METEO_DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "sunrise",
  "sunset",
  "uv_index_max",
  "precipitation_sum",
  "rain_sum",
  "showers_sum",
  "snowfall_sum",
  "precipitation_hours",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
] as const;

export const OPEN_METEO_HISTORICAL_DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "temperature_2m_mean",
  "precipitation_sum",
  "wind_speed_10m_max",
] as const;

export const OPEN_METEO_HISTORICAL_HOURLY_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation",
  "weather_code",
  "pressure_msl",
  "wind_speed_10m",
] as const;
