import React from "react";
import { HourlyForecast } from "@/lib/weather/domain/weather";
import { WeatherIcon } from "./weather-icon";
import { formatHourlyTime } from "@/lib/weather/utils/date-format";

export interface HourlyForecastProps {
  hourly: HourlyForecast;
  timezone: string;
  units: "metric" | "imperial";
}

/**
 * Hourly weather timeline displaying forecast progression for up to 48 hours.
 * Uses keyboard-accessible horizontal scrolling with smooth snapping.
 */
export function HourlyForecastComponent({
  hourly,
  timezone,
  units,
}: HourlyForecastProps) {
  const tempUnit = units === "imperial" ? "°F" : "°C";
  const speedUnit = units === "imperial" ? "mph" : "km/h";

  // Limit display to the next 24 hours for clean readability
  const entries = hourly.entries.slice(0, 24);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Hourly forecast"
      className="glass rounded-3xl p-5 sm:p-6 transition-all duration-300"
      style={{
        background: "var(--surface-overlay)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-base sm:text-lg font-bold font-display tracking-tight flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <span>Hourly Forecast</span>
          <span
            className="text-xs font-mono font-normal px-2 py-0.5 rounded-full"
            style={{
              background: "var(--surface-raised)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            Next 24h
          </span>
        </h2>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Scroll for more →
        </span>
      </div>

      {/* Horizontal scroll container with tabIndex for keyboard users */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Hourly forecast scrollable strip"
        className="flex gap-2.5 overflow-x-auto pb-2 pt-1 focus:outline-none focus:ring-1 focus:ring-accent-500 rounded-xl"
        style={{
          scrollbarWidth: "thin",
        }}
      >
        {entries.map((entry, idx) => {
          const hourLabel =
            idx === 0
              ? "Now"
              : formatHourlyTime(entry.timestamp, timezone, true);

          return (
            <div
              key={entry.timestamp}
              className="flex-shrink-0 w-20 py-3.5 px-2 rounded-2xl flex flex-col items-center justify-between transition-colors duration-200"
              style={{
                background:
                  idx === 0 ? "rgb(0 212 255 / 0.08)" : "var(--surface-raised)",
                border:
                  idx === 0
                    ? "1px solid rgb(0 212 255 / 0.25)"
                    : "1px solid var(--border-subtle)",
              }}
            >
              {/* Hour Label */}
              <span
                className={`text-xs font-mono ${
                  idx === 0 ? "font-bold text-accent-400" : "text-atmos-300"
                }`}
              >
                {hourLabel}
              </span>

              {/* Weather Icon */}
              <div className="my-2.5">
                <WeatherIcon
                  category={entry.conditionCategory}
                  isDay={entry.isDay}
                  size={28}
                />
              </div>

              {/* Temperature */}
              <span
                className="font-bold text-sm tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {Math.round(entry.temperature)}
                <span className="text-[10px] font-normal">{tempUnit}</span>
              </span>

              {/* Precipitation Probability pill */}
              <div className="h-4 mt-1 flex items-center justify-center">
                {entry.precipitationProbability !== null &&
                entry.precipitationProbability !== undefined &&
                entry.precipitationProbability > 0 ? (
                  <span
                    className="text-[10px] font-mono font-semibold px-1 rounded"
                    style={{
                      background: "rgb(0 212 255 / 0.15)",
                      color: "var(--color-accent-400)",
                    }}
                  >
                    {entry.precipitationProbability}%
                  </span>
                ) : (
                  <span
                    className="text-[10px] opacity-40 font-mono"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {Math.round(entry.windSpeed)}
                    {speedUnit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
