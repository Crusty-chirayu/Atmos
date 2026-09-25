import React from "react";
import { DailyForecast } from "@/lib/weather/domain/weather";
import { WeatherIcon } from "./weather-icon";
import {
  formatLocalDate,
  formatWeekday,
} from "@/lib/weather/utils/date-format";

export interface DailyForecastProps {
  daily: DailyForecast;
  timezone: string;
  units: "metric" | "imperial";
}

/**
 * 7-to-14 day forecast component with visual temperature range bars.
 */
export function DailyForecastComponent({
  daily,
  timezone,
  units,
}: DailyForecastProps) {
  const tempUnit = units === "imperial" ? "°F" : "°C";
  const days = daily.days;

  if (days.length === 0) return null;

  // Calculate global min and max temperature across all days for normalized visual bars
  const allMins = days.map((d) => d.temperatureMin);
  const allMaxs = days.map((d) => d.temperatureMax);
  const globalMin = Math.min(...allMins);
  const globalMax = Math.max(...allMaxs);
  const globalRange = Math.max(1, globalMax - globalMin);

  return (
    <section
      aria-label="Daily weather forecast"
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
          <span>7-Day Outlook</span>
          <span
            className="text-xs font-mono font-normal px-2 py-0.5 rounded-full"
            style={{
              background: "var(--surface-raised)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            Daily
          </span>
        </h2>
        <span
          className="text-xs font-mono"
          style={{ color: "var(--text-muted)" }}
        >
          Min / Max
        </span>
      </div>

      <div className="space-y-2">
        {days.map((day, idx) => {
          const weekday = formatWeekday(day.date, timezone, idx);
          const dateLabel = formatLocalDate(day.date, timezone, "short");

          // Calculate bar offsets percentage relative to global week range
          const leftPercent =
            ((day.temperatureMin - globalMin) / globalRange) * 100;
          const widthPercent = Math.max(
            8,
            ((day.temperatureMax - day.temperatureMin) / globalRange) * 100
          );

          return (
            <div
              key={day.date}
              className="p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-colors duration-200"
              style={{
                background:
                  idx === 0 ? "rgb(0 212 255 / 0.04)" : "var(--surface-raised)",
                border:
                  idx === 0
                    ? "1px solid rgb(0 212 255 / 0.18)"
                    : "1px solid var(--border-subtle)",
              }}
            >
              {/* Day & Date info */}
              <div className="w-24 sm:w-32 flex flex-col shrink-0">
                <span
                  className={`text-sm font-medium ${
                    idx === 0
                      ? "font-bold text-accent-400"
                      : "text-text-primary"
                  }`}
                  style={{
                    color:
                      idx === 0
                        ? "var(--color-accent-400)"
                        : "var(--text-primary)",
                  }}
                >
                  {weekday}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {dateLabel}
                </span>
              </div>

              {/* Weather Condition Icon & Text */}
              <div className="flex items-center gap-2 sm:gap-3 w-36 sm:w-44 shrink-0">
                <WeatherIcon
                  category={day.conditionCategory}
                  isDay={true}
                  size={24}
                />
                <div className="flex flex-col overflow-hidden">
                  <span
                    className="text-xs truncate font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {day.conditionText}
                  </span>
                  {day.precipitationProbabilityMax !== null &&
                    day.precipitationProbabilityMax !== undefined &&
                    day.precipitationProbabilityMax > 0 && (
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: "var(--color-accent-400)" }}
                      >
                        {day.precipitationProbabilityMax}% rain
                      </span>
                    )}
                </div>
              </div>

              {/* Min Temperature */}
              <span
                className="w-10 text-right text-xs sm:text-sm font-mono shrink-0"
                style={{ color: "var(--text-muted)" }}
              >
                {Math.round(day.temperatureMin)}
                {tempUnit}
              </span>

              {/* Visual Temperature Range Bar */}
              <div
                aria-hidden="true"
                className="hidden sm:block flex-1 h-2 rounded-full relative mx-2"
                style={{ background: "var(--surface-overlay)" }}
              >
                <div
                  className="absolute h-full rounded-full"
                  style={{
                    left: `${Math.max(0, leftPercent)}%`,
                    width: `${Math.min(100 - leftPercent, widthPercent)}%`,
                    background:
                      "linear-gradient(90deg, #00d4ff 0%, #f5c842 100%)",
                  }}
                />
              </div>

              {/* Max Temperature */}
              <span
                className="w-10 text-right text-xs sm:text-sm font-mono font-bold shrink-0"
                style={{ color: "var(--text-primary)" }}
              >
                {Math.round(day.temperatureMax)}
                {tempUnit}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
