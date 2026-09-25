/**
 * Raw upstream response shapes from Open-Meteo APIs.
 * Kept strictly isolated from application domain types.
 */

export interface OpenMeteoCurrentResponse {
  time: string;
  interval?: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
  weather_code: number;
  cloud_cover: number;
  pressure_msl: number;
  surface_pressure?: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m?: number;
}

export interface OpenMeteoHourlyResponse {
  time: string[];
  temperature_2m?: (number | null)[];
  relative_humidity_2m?: (number | null)[];
  apparent_temperature?: (number | null)[];
  precipitation_probability?: (number | null)[];
  precipitation?: (number | null)[];
  weather_code?: (number | null)[];
  pressure_msl?: (number | null)[];
  surface_pressure?: (number | null)[];
  cloud_cover?: (number | null)[];
  visibility?: (number | null)[];
  wind_speed_10m?: (number | null)[];
  wind_direction_10m?: (number | null)[];
  wind_gusts_10m?: (number | null)[];
  uv_index?: (number | null)[];
  is_day?: (number | null)[];
}

export interface OpenMeteoDailyResponse {
  time: string[];
  weather_code?: (number | null)[];
  temperature_2m_max?: (number | null)[];
  temperature_2m_min?: (number | null)[];
  apparent_temperature_max?: (number | null)[];
  apparent_temperature_min?: (number | null)[];
  sunrise?: (string | null)[];
  sunset?: (string | null)[];
  uv_index_max?: (number | null)[];
  precipitation_sum?: (number | null)[];
  rain_sum?: (number | null)[];
  showers_sum?: (number | null)[];
  snowfall_sum?: (number | null)[];
  precipitation_hours?: (number | null)[];
  precipitation_probability_max?: (number | null)[];
  wind_speed_10m_max?: (number | null)[];
  wind_gusts_10m_max?: (number | null)[];
  wind_direction_10m_dominant?: (number | null)[];
}

export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation?: string;
  elevation: number;
  current_units?: Record<string, string>;
  current?: OpenMeteoCurrentResponse;
  hourly_units?: Record<string, string>;
  hourly?: OpenMeteoHourlyResponse;
  daily_units?: Record<string, string>;
  daily?: OpenMeteoDailyResponse;
  error?: boolean;
  reason?: string;
}

export interface OpenMeteoArchiveResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  elevation: number;
  daily_units?: Record<string, string>;
  daily?: {
    time: string[];
    weather_code?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    temperature_2m_mean?: (number | null)[];
    precipitation_sum?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
  };
  hourly_units?: Record<string, string>;
  hourly?: {
    time: string[];
    temperature_2m?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    precipitation?: (number | null)[];
    weather_code?: (number | null)[];
    pressure_msl?: (number | null)[];
    wind_speed_10m?: (number | null)[];
  };
  error?: boolean;
  reason?: string;
}
