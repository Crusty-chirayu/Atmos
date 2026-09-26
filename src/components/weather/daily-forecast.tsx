import React from "react";
import type { DailyForecast } from "@/lib/weather/domain/weather";
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
 * 7-day forecast component with clean visual temperature range bars.
 * Conforms to authoritative clean consumer weather directive.
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
      className="rounded-lg bg-white p-5 sm:p-6 border border-[#E5E7EB] shadow-xs"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#222222] flex items-center gap-2">
          <span>7-Day Outlook</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#F7F7F7] text-[#6B7280] border border-[#E5E7EB]">
            Daily Forecast
          </span>
        </h2>
        <span className="text-xs text-[#6B7280]">
          Low / High
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

          const isToday = idx === 0;

          return (
            <div
              key={day.date}
              className={`p-3 sm:p-3.5 rounded-md flex items-center justify-between gap-3 transition-colors ${
                isToday
                  ? "bg-[#FFF8E1] border border-[#FFC928] shadow-xs"
                  : "bg-white border border-[#E5E7EB] hover:bg-[#F7F8FA]"
              }`}
            >
              {/* Day & Date info */}
              <div className="w-24 sm:w-28 flex flex-col shrink-0">
                <span
                  className={`text-sm ${
                    isToday
                      ? "font-bold text-[#222222]"
                      : "font-semibold text-[#222222]"
                  }`}
                >
                  {weekday}
                </span>
                <span className="text-xs text-[#626B78]">
                  {dateLabel}
                </span>
              </div>

              {/* Weather Condition Icon & Text */}
              <div className="flex items-center gap-2 sm:gap-3 w-36 sm:w-44 shrink-0">
                <WeatherIcon
                  category={day.conditionCategory}
                  code={day.weatherCode}
                  isDay={true}
                  size={24}
                />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs truncate font-medium text-[#222222]">
                    {day.conditionText}
                  </span>
                  {day.precipitationProbabilityMax !== null &&
                    day.precipitationProbabilityMax !== undefined &&
                    day.precipitationProbabilityMax > 0 && (
                      <span className="text-xs text-[#3984D6] font-semibold tabular-nums">
                        {day.precipitationProbabilityMax}% rain
                      </span>
                    )}
                </div>
              </div>

              {/* Min Temperature */}
              <span className="w-10 text-right text-xs sm:text-sm font-medium text-[#6B7280] tabular-nums shrink-0">
                {Math.round(day.temperatureMin)}
                {tempUnit}
              </span>

              {/* Clean Temperature Range Bar (No Rainbow) */}
              <div
                aria-hidden="true"
                className="hidden sm:block flex-1 h-2 rounded-full relative mx-2 bg-[#E5E7EB]"
              >
                <div
                  className="absolute h-full rounded-full bg-[#FFC928]"
                  style={{
                    left: `${Math.max(0, leftPercent)}%`,
                    width: `${Math.min(100 - leftPercent, widthPercent)}%`,
                  }}
                />
              </div>

              {/* Max Temperature */}
              <span className="w-10 text-right text-xs sm:text-sm font-bold text-[#222222] tabular-nums shrink-0">
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

export { DailyForecastComponent as DailyForecast };
