import { z } from "zod";

export const TemperatureUnitSchema = z.enum(["celsius", "fahrenheit"]);
export type TemperatureUnit = z.infer<typeof TemperatureUnitSchema>;

export const WindSpeedUnitSchema = z.enum(["kmh", "ms", "mph", "kn"]);
export type WindSpeedUnit = z.infer<typeof WindSpeedUnitSchema>;

export const PrecipitationUnitSchema = z.enum(["mm", "inch"]);
export type PrecipitationUnit = z.infer<typeof PrecipitationUnitSchema>;

export const PressureUnitSchema = z.enum(["hpa", "inhg"]);
export type PressureUnit = z.infer<typeof PressureUnitSchema>;

export const DistanceUnitSchema = z.enum(["km", "mi", "m"]);
export type DistanceUnit = z.infer<typeof DistanceUnitSchema>;

export const ElevationUnitSchema = z.enum(["m", "ft"]);
export type ElevationUnit = z.infer<typeof ElevationUnitSchema>;

export const UnitSystemSchema = z.enum(["metric", "imperial"]);
export type UnitSystem = z.infer<typeof UnitSystemSchema>;

export interface UnitPreferences {
  temperature: TemperatureUnit;
  windSpeed: WindSpeedUnit;
  precipitation: PrecipitationUnit;
  pressure: PressureUnit;
  distance: DistanceUnit;
  elevation: ElevationUnit;
}

export const CanonicalUnits: UnitPreferences = {
  temperature: "celsius",
  windSpeed: "kmh",
  precipitation: "mm",
  pressure: "hpa",
  distance: "km",
  elevation: "m",
} as const;

export const MetricUnits = CanonicalUnits;

export const ImperialUnits: UnitPreferences = {
  temperature: "fahrenheit",
  windSpeed: "mph",
  precipitation: "inch",
  pressure: "inhg",
  distance: "mi",
  elevation: "ft",
} as const;

/* ─────────────────────────────────────────────────────────────
   Exact Conversion Functions (no premature rounding)
   ───────────────────────────────────────────────────────────── */

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function kmhToMph(kmh: number): number {
  return kmh * 0.621371192237334;
}

export function mphToKmh(mph: number): number {
  return mph / 0.621371192237334;
}

export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

export function msToKmh(ms: number): number {
  return ms * 3.6;
}

export function kmhToKnots(kmh: number): number {
  return kmh * 0.5399568034557235;
}

export function knotsToKmh(kn: number): number {
  return kn / 0.5399568034557235;
}

export function mmToInches(mm: number): number {
  return mm * 0.03937007874015748;
}

export function inchesToMm(inch: number): number {
  return inch / 0.03937007874015748;
}

export function hpaToInhg(hpa: number): number {
  return hpa * 0.029529983071445;
}

export function inhgToHpa(inhg: number): number {
  return inhg / 0.029529983071445;
}

export function metersToFeet(m: number): number {
  return m * 3.280839895013123;
}

export function feetToMeters(ft: number): number {
  return ft / 3.280839895013123;
}

export function kmToMiles(km: number): number {
  return km * 0.621371192237334;
}

export function milesToKm(mi: number): number {
  return mi / 0.621371192237334;
}

/* ─────────────────────────────────────────────────────────────
   Generic conversion from canonical units to target preference
   ───────────────────────────────────────────────────────────── */

export function convertTemperature(value: number, to: TemperatureUnit): number {
  if (to === "fahrenheit") {
    return celsiusToFahrenheit(value);
  }
  return value;
}

export function convertWindSpeed(value: number, to: WindSpeedUnit): number {
  switch (to) {
    case "ms":
      return kmhToMs(value);
    case "mph":
      return kmhToMph(value);
    case "kn":
      return kmhToKnots(value);
    case "kmh":
    default:
      return value;
  }
}

export function convertPrecipitation(
  value: number,
  to: PrecipitationUnit
): number {
  if (to === "inch") {
    return mmToInches(value);
  }
  return value;
}

export function convertPressure(value: number, to: PressureUnit): number {
  if (to === "inhg") {
    return hpaToInhg(value);
  }
  return value;
}

export function convertDistance(value: number, to: DistanceUnit): number {
  switch (to) {
    case "mi":
      return kmToMiles(value);
    case "m":
      return value * 1000;
    case "km":
    default:
      return value;
  }
}

/* ─────────────────────────────────────────────────────────────
   Presentation Display Helpers (explicit rounding for UI)
   ───────────────────────────────────────────────────────────── */

export function formatTemperature(
  value: number,
  unit: TemperatureUnit = "celsius",
  precision = 0
): string {
  const converted = convertTemperature(value, unit);
  const rounded =
    precision === 0 ? Math.round(converted) : converted.toFixed(precision);
  const symbol = unit === "celsius" ? "°C" : "°F";
  return `${rounded}${symbol}`;
}

export function formatWindSpeed(
  value: number,
  unit: WindSpeedUnit = "kmh",
  precision = 0
): string {
  const converted = convertWindSpeed(value, unit);
  const rounded =
    precision === 0 ? Math.round(converted) : converted.toFixed(precision);
  const labels: Record<WindSpeedUnit, string> = {
    kmh: "km/h",
    ms: "m/s",
    mph: "mph",
    kn: "kn",
  };
  return `${rounded} ${labels[unit]}`;
}

export function formatPrecipitation(
  value: number,
  unit: PrecipitationUnit = "mm",
  precision = 1
): string {
  const converted = convertPrecipitation(value, unit);
  const rounded = converted.toFixed(precision);
  const symbol = unit === "mm" ? "mm" : "in";
  return `${rounded} ${symbol}`;
}

export function formatPressure(
  value: number,
  unit: PressureUnit = "hpa",
  precision = 2
): string {
  const converted = convertPressure(value, unit);
  const rounded =
    unit === "inhg"
      ? converted.toFixed(precision)
      : Math.round(converted).toString();
  const label = unit === "inhg" ? "inHg" : "hPa";
  return `${rounded} ${label}`;
}
