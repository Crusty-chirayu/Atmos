import React from "react";
import { WeatherBundle } from "@/lib/weather/domain/weather";
import { formatLocalTime } from "@/lib/weather/utils/date-format";

export interface WeatherMetricsProps {
  bundle: WeatherBundle;
  units: "metric" | "imperial";
}

/**
 * Auxiliary weather metrics cards for in-depth meteorological telemetry.
 */
export function WeatherMetricsComponent({
  bundle,
  units,
}: WeatherMetricsProps) {
  const { current, daily, meta } = bundle;
  const today = daily.days[0];

  const speedUnit = units === "imperial" ? "mph" : "km/h";
  const pressUnit = units === "imperial" ? "inHg" : "hPa";
  const precipUnit = units === "imperial" ? "in" : "mm";

  // Calculate daylight duration if sunrise and sunset are available
  let daylightHours = "";
  if (today?.sunrise && today?.sunset) {
    const rise = new Date(today.sunrise).getTime();
    const set = new Date(today.sunset).getTime();
    if (!isNaN(rise) && !isNaN(set) && set > rise) {
      const diffMs = set - rise;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      daylightHours = `${hours}h ${mins}m of daylight`;
    }
  }

  return (
    <section aria-label="Detailed weather telemetry" className="space-y-4">
      <h2
        className="text-base sm:text-lg font-bold font-display tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Meteorological Telemetry
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Wind Dynamics & Gusts */}
        <div
          className="glass rounded-3xl p-5 flex flex-col justify-between"
          style={{
            background: "var(--surface-overlay)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs uppercase font-mono tracking-wider font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              Wind & Gusts
            </span>
            <svg
              className="w-4 h-4 text-atmos-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1 my-1">
              <span
                className="text-2xl font-bold font-display"
                style={{ color: "var(--text-primary)" }}
              >
                {Math.round(current.windSpeed)}
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                {speedUnit}
              </span>
            </div>
            {current.windGusts !== null && current.windGusts !== undefined ? (
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Gusts up to{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {Math.round(current.windGusts)} {speedUnit}
                </span>
              </p>
            ) : today?.windGustsMax ? (
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Peak gusts: {Math.round(today.windGustsMax)} {speedUnit}
              </p>
            ) : (
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Steady wind pattern
              </p>
            )}
          </div>
          <div
            className="pt-3 border-t border-atmos-700/20 text-xs flex items-center justify-between"
            style={{ color: "var(--text-muted)" }}
          >
            <span>Direction: {current.windDirection}°</span>
            <span>
              Dominant:{" "}
              {today?.windDirectionDominant
                ? `${today.windDirectionDominant}°`
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Card 2: Barometric System */}
        <div
          className="glass rounded-3xl p-5 flex flex-col justify-between"
          style={{
            background: "var(--surface-overlay)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs uppercase font-mono tracking-wider font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              Pressure System
            </span>
            <svg
              className="w-4 h-4 text-atmos-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1 my-1">
              <span
                className="text-2xl font-bold font-display"
                style={{ color: "var(--text-primary)" }}
              >
                {Math.round(current.pressureMsl)}
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                {pressUnit}
              </span>
            </div>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {current.pressureMsl > 1015
                ? "High pressure: typically settled & dry"
                : current.pressureMsl < 1005
                  ? "Low pressure: unsettled & active"
                  : "Standard atmospheric pressure"}
            </p>
          </div>
          <div
            className="pt-3 border-t border-atmos-700/20 text-xs flex items-center justify-between"
            style={{ color: "var(--text-muted)" }}
          >
            <span>
              Surface:{" "}
              {current.surfacePressure
                ? `${Math.round(current.surfacePressure)} ${pressUnit}`
                : "Standard"}
            </span>
            <span>MSL ref</span>
          </div>
        </div>

        {/* Card 3: Precipitation & Moisture */}
        <div
          className="glass rounded-3xl p-5 flex flex-col justify-between"
          style={{
            background: "var(--surface-overlay)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs uppercase font-mono tracking-wider font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              Precipitation
            </span>
            <svg
              className="w-4 h-4 text-accent-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1 my-1">
              <span
                className="text-2xl font-bold font-display"
                style={{ color: "var(--text-primary)" }}
              >
                {today?.precipitationSum ?? current.precipitation}
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                {precipUnit} today
              </span>
            </div>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {today?.precipitationProbabilityMax
                ? `${today.precipitationProbabilityMax}% probability of rain`
                : "No significant accumulation"}
            </p>
          </div>
          <div
            className="pt-3 border-t border-atmos-700/20 text-xs flex items-center justify-between"
            style={{ color: "var(--text-muted)" }}
          >
            <span>
              Rain: {current.rain ?? 0} {precipUnit}
            </span>
            <span>
              Showers: {current.showers ?? 0} {precipUnit}
            </span>
          </div>
        </div>

        {/* Card 4: Celestial & Solar Progression */}
        <div
          className="glass rounded-3xl p-5 flex flex-col justify-between"
          style={{
            background: "var(--surface-overlay)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs uppercase font-mono tracking-wider font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              Sun Progression
            </span>
            <svg
              className="w-4 h-4 text-gold-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </div>
          <div>
            <div className="flex justify-between items-baseline my-1">
              <div>
                <span
                  className="text-[11px] block"
                  style={{ color: "var(--text-muted)" }}
                >
                  Sunrise
                </span>
                <span
                  className="text-sm font-mono font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {today?.sunrise
                    ? formatLocalTime(today.sunrise, meta.timezone, {
                        hour12: true,
                      })
                    : "--"}
                </span>
              </div>
              <div className="text-right">
                <span
                  className="text-[11px] block"
                  style={{ color: "var(--text-muted)" }}
                >
                  Sunset
                </span>
                <span
                  className="text-sm font-mono font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {today?.sunset
                    ? formatLocalTime(today.sunset, meta.timezone, {
                        hour12: true,
                      })
                    : "--"}
                </span>
              </div>
            </div>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {daylightHours ||
                (current.isDay ? "Daytime phase" : "Nighttime phase")}
            </p>
          </div>
          <div
            className="pt-3 border-t border-atmos-700/20 text-xs flex items-center justify-between"
            style={{ color: "var(--text-muted)" }}
          >
            <span>UV Max: {today?.uvIndexMax ?? "--"}</span>
            <span>{current.isDay ? "Sun active" : "Dusk / Night"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
