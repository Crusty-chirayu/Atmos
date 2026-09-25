import { z } from "zod";

/**
 * Geographic coordinates with strict validation.
 * Latitude must be within [-90, 90].
 * Longitude must be within [-180, 180].
 */
export const CoordinatesSchema = z.object({
  latitude: z
    .number()
    .min(-90, "Latitude must be >= -90")
    .max(90, "Latitude must be <= 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be >= -180")
    .max(180, "Longitude must be <= 180"),
});

export type Coordinates = z.infer<typeof CoordinatesSchema>;

/**
 * Validated geographic location model.
 * Does not assume place names are unique.
 * Tracks optional country, administrative region, elevation, and IANA timezone.
 */
export const LocationSchema = CoordinatesSchema.extend({
  id: z.string().optional(),
  name: z.string().min(1, "Location name cannot be empty"),
  country: z.string().optional(),
  countryCode: z.string().length(2).toUpperCase().optional(),
  adminArea: z.string().optional(),
  timezone: z.string().optional(),
  elevation: z.number().optional(), // meters above sea level
});

export type Location = z.infer<typeof LocationSchema>;

/**
 * Helper to normalize coordinates to a fixed precision (e.g. 2 decimal places ~1.1km)
 * to prevent cache key fragmentation while retaining weather forecast accuracy.
 */
export function normalizeCoordinates(
  coords: Coordinates,
  precision = 2
): Coordinates {
  const factor = Math.pow(10, precision);
  return {
    latitude: Math.round(coords.latitude * factor) / factor,
    longitude: Math.round(coords.longitude * factor) / factor,
  };
}
