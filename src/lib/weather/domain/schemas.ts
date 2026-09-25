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
export type ForecastQueryOptionsInput = z.input<
  typeof ForecastQueryOptionsSchema
>;

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

/**
 * Schema for validating incoming HTTP request query parameters to the Weather API route.
 * Handles string-to-number/boolean conversions safely.
 */
export const WeatherApiQuerySchema = z.object({
  lat: z.preprocess(
    (val) =>
      val === null || val === undefined || val === "" ? NaN : Number(val),
    z
      .number()
      .min(-90, "Latitude must be >= -90")
      .max(90, "Latitude must be <= 90")
  ),
  lon: z.preprocess(
    (val) =>
      val === null || val === undefined || val === "" ? NaN : Number(val),
    z
      .number()
      .min(-180, "Longitude must be >= -180")
      .max(180, "Longitude must be <= 180")
  ),
  name: z.string().max(200).optional().default("Selected Location"),
  country: z.string().max(100).optional(),
  countryCode: z.string().length(2).toUpperCase().optional(),
  adminArea: z.string().max(100).optional(),
  timezone: z.string().max(100).default("auto"),
  forecastDays: z.coerce
    .number()
    .int()
    .min(1, "Forecast days must be at least 1")
    .max(16, "Forecast days cannot exceed 16")
    .default(7),
  units: z.enum(["metric", "imperial", "canonical"]).default("metric"),
  bypassCache: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
});

export type WeatherApiQuery = z.infer<typeof WeatherApiQuerySchema>;
export type WeatherApiQueryInput = z.input<typeof WeatherApiQuerySchema>;

/**
 * Schema for validating incoming HTTP request query parameters to the Historical Weather API route.
 * Enforces:
 * - Latitude (-90..90) & Longitude (-180..180)
 * - Valid YYYY-MM-DD format
 * - startDate <= endDate
 * - startDate >= 1940-01-01 (ERA5 archive limit)
 * - Maximum query duration of 90 days to prevent oversized payloads
 */
export const HistoricalApiQuerySchema = z
  .object({
    lat: z.preprocess(
      (val) =>
        val === null || val === undefined || val === "" ? NaN : Number(val),
      z
        .number()
        .min(-90, "Latitude must be >= -90")
        .max(90, "Latitude must be <= 90")
    ),
    lon: z.preprocess(
      (val) =>
        val === null || val === undefined || val === "" ? NaN : Number(val),
      z
        .number()
        .min(-180, "Longitude must be >= -180")
        .max(180, "Longitude must be <= 180")
    ),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be in YYYY-MM-DD format"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be in YYYY-MM-DD format"),
    timezone: z.string().max(100).default("auto"),
    units: z.enum(["metric", "imperial", "canonical"]).default("metric"),
    includeHourly: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .optional()
      .transform((val) => val === true || val === "true"),
    bypassCache: z
      .enum(["true", "false"])
      .optional()
      .transform((val) => val === "true"),
  })
  .refine((data) => data.startDate >= "1940-01-01", {
    message: "startDate cannot be earlier than 1940-01-01 (ERA5 archive limit)",
    path: ["startDate"],
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "startDate must be before or equal to endDate",
    path: ["startDate"],
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      const diffDays = (end - start) / (1000 * 60 * 60 * 24);
      return diffDays <= 90;
    },
    {
      message: "Historical date range cannot exceed 90 days per query",
      path: ["endDate"],
    }
  );

export type HistoricalApiQuery = z.infer<typeof HistoricalApiQuerySchema>;
export type HistoricalApiQueryInput = z.input<typeof HistoricalApiQuerySchema>;

/**
 * Schema for batch weather queries across multiple saved locations.
 */
export const BatchWeatherQuerySchema = z.object({
  locations: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().max(200).default("Selected Location"),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        country: z.string().optional(),
        countryCode: z.string().optional(),
        adminArea: z.string().optional(),
        timezone: z.string().optional().default("auto"),
      })
    )
    .min(1, "At least one location is required")
    .max(12, "Maximum 12 locations can be queried in a single batch"),
  units: z.enum(["metric", "imperial", "canonical"]).default("metric"),
});

export type BatchWeatherQuery = z.infer<typeof BatchWeatherQuerySchema>;
