/**
 * ATMOS M4: Authentication & User Data Domain Types
 */

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedLocation {
  id: string;
  user_id: string;
  name: string;
  country: string | null;
  country_code: string | null;
  admin_area: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
  provider_location_id: string | null;
  label: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type TemperatureUnit = "celsius" | "fahrenheit";
export type WindSpeedUnit = "kmh" | "mph" | "ms" | "knots";
export type PrecipitationUnit = "mm" | "inch";
export type ThemePreference = "dark" | "light" | "system";

export interface UserPreferences {
  user_id: string;
  temperature_unit: TemperatureUnit;
  wind_speed_unit: WindSpeedUnit;
  precipitation_unit: PrecipitationUnit;
  theme: ThemePreference;
  reduced_motion: boolean;
  default_location_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_USER_PREFERENCES: Omit<
  UserPreferences,
  "user_id" | "created_at" | "updated_at"
> = {
  temperature_unit: "celsius",
  wind_speed_unit: "kmh",
  precipitation_unit: "mm",
  theme: "system",
  reduced_motion: false,
  default_location_id: null,
};

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "USER_ALREADY_EXISTS"
  | "WEAK_PASSWORD"
  | "EMAIL_NOT_CONFIRMED"
  | "RATE_LIMITED"
  | "SESSION_EXPIRED"
  | "NOT_AUTHENTICATED"
  | "UNAUTHORIZED"
  | "NOT_CONFIGURED"
  | "INTERNAL_ERROR";

export interface AuthErrorInfo {
  code: AuthErrorCode;
  message: string;
  statusCode: number;
}
