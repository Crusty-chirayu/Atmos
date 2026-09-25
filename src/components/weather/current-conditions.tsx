import React from "react";
import { WeatherBundle } from "@/lib/weather/domain/weather";
import { WeatherIcon } from "./weather-icon";
import { formatLocalTime } from "@/lib/weather/utils/date-format";

export interface CurrentConditionsProps {
  bundle: WeatherBundle;
  units: "metric" | "imperial";
  onToggleUnits?: () => void;
}

/**
 * Returns a severity label and badge color for UV index values.
 */
function getUvDescriptor(uv?: number | null): {
  label: string;
  colorClass: string;
} {
  if (uv === null || uv === undefined)
    return { label: "--", colorClass: "text-atmos-300" };
  if (uv <= 2) return { label: "Low", colorClass: "text-success-400" };
  if (uv <= 5) return { label: "Moderate", colorClass: "text-gold-400" };
  if (uv <= 7) return { label: "High", colorClass: "text-warning-400" };
  if (uv <= 10) return { label: "Very High", colorClass: "text-danger-400" };
  return { label: "Extreme", colorClass: "text-danger-500 font-bold" };
}

/**
 * Converts wind direction in degrees (0-360) into compass cardinal directions.
 */
function getCompassDirection(deg?: number | null): string {
  if (deg === null || deg === undefined) return "";
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const val = Math.round(deg / 22.5) % 16;
  return directions[val];
}

/**
 * Hero component displaying current weather conditions with full provenance and metric details.
 */
export function CurrentConditions({
  bundle,
  units,
  onToggleUnits,
}: CurrentConditionsProps) {
  const { current, location, meta, daily } = bundle;
  const tempUnit = units === "imperial" ? "°F" : "°C";
  const speedUnit = units === "imperial" ? "mph" : "km/h";
  const precipUnit = units === "imperial" ? "in" : "mm";
  const pressUnit = units === "imperial" ? "inHg" : "hPa";

  // Today's forecast high and low
  const todayForecast = daily?.days?.[0];
  const uvDescriptor = getUvDescriptor(
    current.uvIndex ?? todayForecast?.uvIndexMax
  );

  // Time in the location's specific timezone
  const localTimeString = formatLocalTime(current.timestamp, meta.timezone, {
    hour12: true,
  });

  return (
    <section
      aria-label={`Current weather conditions for ${location.name}`}
      className="glass rounded-3xl p-6 sm:p-8 transition-all duration-300 relative overflow-hidden"
      style={{
        background: "var(--surface-overlay)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Background radial atmosphere glow */}
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-20 w-80 h-80 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{
          background:
            current.conditionCategory === "clear"
              ? "radial-gradient(circle, #f5c842 0%, transparent 70%)"
              : current.conditionCategory === "thunderstorm"
                ? "radial-gradient(circle, #ff4d4d 0%, transparent 70%)"
                : "radial-gradient(circle, #00d4ff 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-8">
        {/* Left Column: Location, Local Time, Temperature, Condition */}
        <div className="flex flex-col justify-between space-y-5 max-w-lg">
          <div>
            {/* Header: Location & Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-mono tracking-wider uppercase font-semibold"
                style={{
                  background: "rgb(0 212 255 / 0.12)",
                  color: "var(--color-accent-400)",
                  border: "1px solid rgb(0 212 255 / 0.2)",
                }}
              >
                Live Weather
              </span>
              {location.countryCode && (
                <span
                  className="px-2 py-0.5 rounded text-xs font-mono"
                  style={{
                    background: "var(--surface-raised)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {location.countryCode}
                </span>
              )}
              {meta.isCached && (
                <span
                  title="Cached response with fresh background revalidation"
                  className="text-[11px] px-2 py-0.5 rounded font-mono"
                  style={{
                    color: "var(--text-muted)",
                    background: "var(--surface-raised)",
                  }}
                >
                  Cached
                </span>
              )}
            </div>

            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-display"
              style={{ color: "var(--text-primary)" }}
            >
              {location.name}
            </h1>

            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {[location.adminArea, location.country]
                .filter(Boolean)
                .join(", ")}
              {" · "}
              <span className="font-mono text-xs">
                Local time {localTimeString} (
                {meta.timezone.split("/").pop()?.replace(/_/g, " ")})
              </span>
            </p>
          </div>

          {/* Primary Temperature & Weather Icon */}
          <div className="flex items-center gap-6 py-1">
            <div className="flex items-start">
              <span
                className="font-display font-extrabold tracking-tighter"
                style={{
                  fontSize: "clamp(3.5rem, 8vw, 6rem)",
                  lineHeight: 1,
                  color: "var(--text-primary)",
                }}
              >
                {Math.round(current.temperature)}
              </span>
              <button
                type="button"
                onClick={onToggleUnits}
                title={`Current units: ${units}. Click to toggle.`}
                className="text-xl sm:text-2xl font-bold ml-1 hover:opacity-80 transition-opacity focus:outline-none"
                style={{ color: "var(--color-accent-400)" }}
              >
                {tempUnit}
              </button>
            </div>

            <div className="flex flex-col items-center">
              <WeatherIcon
                category={current.conditionCategory}
                isDay={current.isDay}
                size={64}
              />
              <span
                className="text-sm sm:text-base font-medium capitalize mt-1.5 text-center"
                style={{ color: "var(--text-primary)" }}
              >
                {current.conditionText}
              </span>
            </div>
          </div>

          {/* High / Low & Apparent Temp Sub-bar */}
          <div
            className="flex flex-wrap items-center gap-4 text-xs sm:text-sm pt-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <div>
              <span>Feels like </span>
              <span
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {Math.round(current.apparentTemperature)}
                {tempUnit}
              </span>
            </div>
            {todayForecast && (
              <>
                <span style={{ color: "var(--border-strong)" }}>•</span>
                <div>
                  <span>High </span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {Math.round(todayForecast.temperatureMax)}
                    {tempUnit}
                  </span>
                  <span className="mx-1">/</span>
                  <span>Low </span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {Math.round(todayForecast.temperatureMin)}
                    {tempUnit}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Environmental Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 self-center w-full lg:w-auto">
          {/* Wind */}
          <div
            className="p-3.5 rounded-2xl flex flex-col justify-between"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="text-xs uppercase font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              Wind
            </span>
            <div className="my-1">
              <span
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {Math.round(current.windSpeed)}
              </span>{" "}
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {speedUnit}
              </span>
            </div>
            <div
              className="text-[11px] flex items-center gap-1"
              style={{ color: "var(--text-secondary)" }}
            >
              <span
                className="inline-block transform"
                style={{ transform: `rotate(${current.windDirection}deg)` }}
              >
                ↓
              </span>
              <span>
                {getCompassDirection(current.windDirection)} (
                {current.windDirection}°)
              </span>
            </div>
          </div>

          {/* Humidity */}
          <div
            className="p-3.5 rounded-2xl flex flex-col justify-between"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="text-xs uppercase font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              Humidity
            </span>
            <div className="my-1">
              <span
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {Math.round(current.relativeHumidity)}
              </span>{" "}
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                %
              </span>
            </div>
            <span
              className="text-[11px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Cloud cover {current.cloudCover}%
            </span>
          </div>

          {/* UV Index */}
          <div
            className="p-3.5 rounded-2xl flex flex-col justify-between"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="text-xs uppercase font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              UV Index
            </span>
            <div className="my-1">
              <span
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {current.uvIndex !== null && current.uvIndex !== undefined
                  ? current.uvIndex
                  : (todayForecast?.uvIndexMax ?? "--")}
              </span>
            </div>
            <span
              className={`text-[11px] font-medium ${uvDescriptor.colorClass}`}
            >
              {uvDescriptor.label}
            </span>
          </div>

          {/* Atmospheric Pressure */}
          <div
            className="p-3.5 rounded-2xl flex flex-col justify-between"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="text-xs uppercase font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              Pressure
            </span>
            <div className="my-1">
              <span
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {Math.round(current.pressureMsl)}
              </span>{" "}
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {pressUnit}
              </span>
            </div>
            <span
              className="text-[11px]"
              style={{ color: "var(--text-secondary)" }}
            >
              Mean sea level
            </span>
          </div>

          {/* Precipitation */}
          <div
            className="p-3.5 rounded-2xl flex flex-col justify-between"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="text-xs uppercase font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              Precipitation
            </span>
            <div className="my-1">
              <span
                className="text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {current.precipitation}
              </span>{" "}
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {precipUnit}
              </span>
            </div>
            <span
              className="text-[11px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {todayForecast?.precipitationProbabilityMax !== undefined &&
              todayForecast?.precipitationProbabilityMax !== null
                ? `${todayForecast.precipitationProbabilityMax}% chance`
                : "Current rate"}
            </span>
          </div>

          {/* Sun Cycle */}
          <div
            className="p-3.5 rounded-2xl flex flex-col justify-between"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="text-xs uppercase font-mono"
              style={{ color: "var(--text-muted)" }}
            >
              Sun Cycle
            </span>
            <div className="my-1 text-xs space-y-0.5">
              {todayForecast?.sunrise ? (
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Rise: </span>
                  <span
                    className="font-mono font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatLocalTime(todayForecast.sunrise, meta.timezone, {
                      hour12: true,
                    })}
                  </span>
                </div>
              ) : null}
              {todayForecast?.sunset ? (
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Set: </span>
                  <span
                    className="font-mono font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {formatLocalTime(todayForecast.sunset, meta.timezone, {
                      hour12: true,
                    })}
                  </span>
                </div>
              ) : null}
            </div>
            <span
              className="text-[11px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {current.isDay ? "Daylight active" : "Nighttime"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
