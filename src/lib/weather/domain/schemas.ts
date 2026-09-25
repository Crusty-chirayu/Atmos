import { z } from "zod";
import { CoordinatesSchema } from "./location";
import {
  TemperatureUnitSchema,
  WindSpeedUnitSchema,
  PrecipitationUnitSchema,
  PressureUnitSchema,
  DistanceUnitSchema,
  ElevationUnitSchema,
} from "./units";

export const WeatherCategorySchema = z.enum([
  "clear",
  "partly_cloudy",
  "cloudy",
  "fog",
  "drizzle",
  "rain",
  "showers",
  "snow",
  "thunderstorm",
  "unknown",
]);

export const WeatherResponseMetaSchema = z.object({
  provider: z.string().min(1),
  fetchedAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  validAt: z.string().optional(),
  isCached: z.boolean(),
  isStale: z.boolean(),
  units: z.object({
    temperature: TemperatureUnitSchema,
    windSpeed: WindSpeedUnitSchema,
    precipitation: PrecipitationUnitSchema,
    pressure: PressureUnitSchema,
    distance: DistanceUnitSchema,
    elevation: ElevationUnitSchema,
  }),
  timezone: z.string(),
  elevation: z.number().optional(),
  warnings: z.array(z.string()).optional(),
  coverageLimitations: z.array(z.string()).optional(),
});

export const CurrentWeatherSchema = z.object({
  timestamp: z.string(),
  temperature: z.number(),
  apparentTemperature: z.number(),
  relativeHumidity: z.number().min(0).max(100),
  precipitation: z.number().min(0),
  rain: z.number().min(0).nullable().optional(),
  showers: z.number().min(0).nullable().optional(),
  snowfall: z.number().min(0).nullable().optional(),
  weatherCode: z.number().int().min(0).max(99),
  conditionText: z.string(),
  conditionCategory: WeatherCategorySchema,
  cloudCover: z.number().min(0).max(100),
  pressureMsl: z.number().positive(),
  surfacePressure: z.number().positive().nullable().optional(),
  windSpeed: z.number().min(0),
  windDirection: z.number().min(0).max(360),
  windGusts: z.number().min(0).nullable().optional(),
  isDay: z.boolean(),
  uvIndex: z.number().min(0).nullable().optional(),
});

export const HourlyForecastEntrySchema = z.object({
  timestamp: z.string(),
  temperature: z.number(),
  apparentTemperature: z.number().nullable().optional(),
  relativeHumidity: z.number().min(0).max(100).nullable().optional(),
  precipitationProbability: z.number().min(0).max(100).nullable().optional(),
  precipitation: z.number().min(0),
  weatherCode: z.number().int().min(0).max(99),
  conditionText: z.string(),
  conditionCategory: WeatherCategorySchema,
  cloudCover: z.number().min(0).max(100).nullable().optional(),
  windSpeed: z.number().min(0),
  windDirection: z.number().min(0).max(360),
  windGusts: z.number().min(0).nullable().optional(),
  pressureMsl: z.number().positive().nullable().optional(),
  visibility: z.number().min(0).nullable().optional(),
  uvIndex: z.number().min(0).nullable().optional(),
  isDay: z.boolean().nullable().optional(),
});

export const DailyForecastDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  weatherCode: z.number().int().min(0).max(99),
  conditionText: z.string(),
  conditionCategory: WeatherCategorySchema,
  temperatureMax: z.number(),
  temperatureMin: z.number(),
  apparentTemperatureMax: z.number().nullable().optional(),
  apparentTemperatureMin: z.number().nullable().optional(),
  precipitationSum: z.number().min(0),
  precipitationProbabilityMax: z.number().min(0).max(100).nullable().optional(),
  precipitationHours: z.number().min(0).max(24).nullable().optional(),
  sunrise: z.string().nullable().optional(),
  sunset: z.string().nullable().optional(),
  uvIndexMax: z.number().min(0).nullable().optional(),
  windSpeedMax: z.number().min(0),
  windGustsMax: z.number().min(0).nullable().optional(),
  windDirectionDominant: z.number().min(0).max(360).nullable().optional(),
});

/**
 * Options schema for querying weather forecasts.
 */
export const ForecastQueryOptionsSchema = CoordinatesSchema.extend({
  timezone: z.string().default("auto"),
  forecastDays: z.number().int().min(1).max(16).default(7),
  includeHourly: z.boolean().default(true),
  includeDaily: z.boolean().default(true),
  includeCurrent: z.boolean().default(true),
});

export type ForecastQueryOptions = z.infer<typeof ForecastQueryOptionsSchema>;
export type ForecastQueryOptionsInput = z.input<typeof ForecastQueryOptionsSchema>;

/**
 * Options schema for querying historical weather.
 * Requires YYYY-MM-DD start and end dates.
 * Enforces start <= end and sensible date boundaries.
 */
export const HistoricalQueryOptionsSchema = CoordinatesSchema.extend({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
  timezone: z.string().default("UTC"),
  includeHourly: z.boolean().default(false),
}).refine((data) => data.startDate <= data.endDate, {
  message: "startDate must be before or equal to endDate",
  path: ["startDate"],
});

export type HistoricalQueryOptions = z.infer<
  typeof HistoricalQueryOptionsSchema
>;
export type HistoricalQueryOptionsInput = z.input<
  typeof HistoricalQueryOptionsSchema
>;
