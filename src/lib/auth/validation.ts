/**
 * ATMOS M4: Auth & User Data Validation Schemas
 */

import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const SignupSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter")
    .regex(/[0-9]/, "Password must include at least one number"),
  displayName: z
    .string()
    .trim()
    .max(100, "Display name must be 100 characters or fewer")
    .optional(),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
});

export const UpdatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter")
    .regex(/[0-9]/, "Password must include at least one number"),
});

export const SavedLocationInputSchema = z.object({
  name: z.string().trim().min(1, "Location name is required").max(200),
  country: z.string().trim().max(100).nullable().optional(),
  country_code: z.string().trim().max(2).nullable().optional(),
  admin_area: z.string().trim().max(100).nullable().optional(),
  latitude: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  timezone: z.string().trim().max(100).nullable().optional(),
  provider_location_id: z.string().trim().max(100).nullable().optional(),
  label: z.string().trim().max(60).nullable().optional(),
  display_order: z.number().int().min(0).max(1000).default(0),
});

export const UpdateUserPreferencesSchema = z.object({
  temperature_unit: z.enum(["celsius", "fahrenheit"]).optional(),
  wind_speed_unit: z.enum(["kmh", "mph", "ms", "knots"]).optional(),
  precipitation_unit: z.enum(["mm", "inch"]).optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
  reduced_motion: z.boolean().optional(),
  default_location_id: z.string().uuid().nullable().optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
export type PasswordResetRequestInput = z.infer<
  typeof PasswordResetRequestSchema
>;
export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;
export type SavedLocationInput = z.infer<typeof SavedLocationInputSchema>;
export type UpdateUserPreferencesInput = z.infer<
  typeof UpdateUserPreferencesSchema
>;
