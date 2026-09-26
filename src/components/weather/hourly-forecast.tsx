import React from "react";
import type { HourlyForecast } from "@/lib/weather/domain/weather";
import { WeatherIcon } from "./weather-icon";
import { formatHourlyTime } from "@/lib/weather/utils/date-format";

export interface HourlyForecastProps {
  hourly: HourlyForecast;
  timezone: string;
  units: "metric" | "imperial";
}

/**
 * Hourly weather timeline displaying forecast progression for up to 24 hours.
 * Uses clean consumer styling with keyboard-accessible horizontal scrolling.
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
      className="rounded-lg bg-white p-5 sm:p-6 border border-[#E5E7EB] shadow-xs"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#222222] flex items-center gap-2">
          <span>Hourly Forecast</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#F7F7F7] text-[#6B7280] border border-[#E5E7EB]">
            Next 24 Hours
          </span>
        </h2>
        <span className="text-xs text-[#6B7280]">
          Scroll for timeline →
        </span>
      </div>

      {/* Horizontal scroll container with tabIndex for keyboard users */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Hourly forecast scrollable strip"
        className="flex gap-2 overflow-x-auto pb-2 pt-1 focus:outline-none focus:ring-1 focus:ring-[#FFC928] rounded-md"
        style={{
          scrollbarWidth: "thin",
        }}
      >
        {entries.map((entry, idx) => {
          const hourLabel =
            idx === 0
              ? "Now"
              : formatHourlyTime(entry.timestamp, timezone, true);

          const isCurrent = idx === 0;

          return (
            <div
              key={entry.timestamp}
              className={`shrink-0 w-20 py-3 px-2 rounded-md flex flex-col items-center justify-between transition-colors ${
                isCurrent
                  ? "bg-[#FFF8E1] border border-[#FFC928] shadow-xs"
                  : "bg-white border border-[#E5E7EB] hover:bg-[#F7F8FA]"
              }`}
            >
              {/* Hour Label */}
              <span
                className={`text-xs ${
                  isCurrent ? "font-bold text-[#222222]" : "text-[#626B78]"
                }`}
              >
                {hourLabel}
              </span>

              {/* Weather Icon */}
              <div className="my-2">
                <WeatherIcon
                  category={entry.conditionCategory}
                  code={entry.weatherCode}
                  isDay={entry.isDay ?? true}
                  size={26}
                />
              </div>

              {/* Temperature */}
              <span className="font-bold text-sm text-[#222222] tabular-nums tracking-tight">
                {Math.round(entry.temperature)}
                <span className="text-xs font-normal text-[#626B78]">
                  {tempUnit}
                </span>
              </span>

              {/* Precipitation Probability pill or Wind */}
              <div className="h-4 mt-1 flex items-center justify-center">
                {entry.precipitationProbability !== null &&
                entry.precipitationProbability !== undefined &&
                entry.precipitationProbability > 0 ? (
                  <span className="text-xs font-semibold px-1 rounded bg-[#EBF3FC] text-[#3984D6] tabular-nums">
                    {entry.precipitationProbability}%
                  </span>
                ) : (
                  <span className="text-xs text-[#737D8A] tabular-nums">
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

export { HourlyForecastComponent as HourlyForecast };
