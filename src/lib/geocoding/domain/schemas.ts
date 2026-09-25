import { z } from "zod";
import { CoordinatesSchema } from "../../weather/domain/location";

/**
 * Validates search input query parameters.
 * - Trims whitespace automatically.
 * - Enforces minimum 2 characters (Open-Meteo API requirement).
 * - Enforces maximum 100 characters (sensible UX limit).
 * - Enforces count between 1 and 100 (Open-Meteo upper bound).
 * - Normalizes language code to lowercase.
 * - Validates 2-letter uppercase countryCode if supplied.
 */
export const GeocodingQuerySchema = z.object({
  query: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val.length >= 2, {
      message: "Search query must be at least 2 characters long",
    })
    .refine((val) => val.length <= 100, {
      message: "Search query cannot exceed 100 characters",
    }),
  count: z
    .number()
    .int()
    .min(1, "Count must be at least 1")
    .max(100, "Count cannot exceed 100")
    .default(10),
  language: z
    .string()
    .min(2)
    .max(5)
    .transform((val) => val.toLowerCase())
    .default("en"),
  countryCode: z
    .string()
    .length(2, "Country code must be a 2-letter ISO-3166-1 alpha-2 code")
    .transform((val) => val.toUpperCase())
    .optional(),
});

export type GeocodingQuery = z.output<typeof GeocodingQuerySchema>;
export type GeocodingQueryInput = z.input<typeof GeocodingQuerySchema>;

/**
 * Zod schema validating a normalized GeocodingLocation at external boundaries.
 */
export const GeocodingLocationSchema = CoordinatesSchema.extend({
  id: z.string().min(1),
  providerId: z.string().min(1),
  sourceId: z.union([z.number(), z.string()]).optional(),
  name: z.string().min(1),
  country: z.string().optional(),
  countryCode: z.string().length(2).toUpperCase().optional(),
  adminArea: z.string().optional(),
  adminArea2: z.string().optional(),
  adminArea3: z.string().optional(),
  elevation: z.number().optional(),
  timezone: z.string().optional(),
  population: z.number().int().min(0).optional(),
  postcodes: z.array(z.string()).optional(),
  featureCode: z.string().optional(),
  formattedAddress: z.string().min(1),
});
