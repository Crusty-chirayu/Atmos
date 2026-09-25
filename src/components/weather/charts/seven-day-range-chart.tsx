"use client";

import React, { useState } from "react";
import { DailyForecast, WMO_CODE_MAP } from "@/lib/weather/domain/weather";
import { WeatherIcon } from "../weather-icon";
import {
  formatWeekday,
  formatLocalDate,
} from "@/lib/weather/utils/date-format";

export interface SevenDayRangeChartProps {
  daily: DailyForecast;
  unit: "celsius" | "fahrenheit";
  timezone?: string;
}

export function SevenDayRangeChart({
  daily,
  unit,
  timezone = "auto",
}: SevenDayRangeChartProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const tempUnit = unit === "fahrenheit" ? "°F" : "°C";
  const days = daily.days;

  if (!days || days.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-text-muted text-sm glass rounded-2xl">
        No daily forecast telemetry available
      </div>
    );
  }

  const allMins = days.map((d) => d.temperatureMin);
  const allMaxs = days.map((d) => d.temperatureMax);
  const globalMin = Math.min(...allMins);
  const globalMax = Math.max(...allMaxs);
  const globalRange = Math.max(1, globalMax - globalMin);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Legend & range summary */}
      <div className="flex items-center justify-between text-xs text-text-muted font-mono">
        <span>
          Week Min: {Math.round(globalMin)}
          {tempUnit}
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" /> Cold
          <span className="w-8 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-500" />
          <span className="w-2 h-2 rounded-full bg-orange-500" /> Warm
        </span>
        <span>
          Week Max: {Math.round(globalMax)}
          {tempUnit}
        </span>
      </div>

      <div className="space-y-2">
        {days.map((day, idx) => {
          const weekday = formatWeekday(day.date, timezone, idx);
          const dateLabel = formatLocalDate(day.date, timezone, "short");
          const leftPercent =
            ((day.temperatureMin - globalMin) / globalRange) * 100;
          const widthPercent = Math.max(
            10,
            ((day.temperatureMax - day.temperatureMin) / globalRange) * 100
          );
          const isSelected = selectedDayIndex === idx;

          return (
            <div
              key={day.date}
              onClick={() => setSelectedDayIndex(isSelected ? null : idx)}
              className={`p-3 sm:p-3.5 rounded-2xl flex flex-col gap-2 transition-all cursor-pointer ${
                isSelected
                  ? "glass border-accent-400/50 shadow-lg"
                  : "glass hover:bg-atmos-800/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Date & Weekday */}
                <div className="w-24 sm:w-32 shrink-0">
                  <div className="text-sm font-medium text-text-primary">
                    {weekday}
                  </div>
                  <div className="text-[11px] font-mono text-text-muted">
                    {dateLabel}
                  </div>
                </div>

                {/* Weather Condition Icon & Text */}
                <div className="flex items-center gap-2 w-28 sm:w-36 shrink-0">
                  <WeatherIcon
                    category={
                      WMO_CODE_MAP[day.weatherCode]?.category ?? "clear"
                    }
                    isDay={true}
                    className="w-5 h-5 shrink-0"
                  />
                  <span className="text-xs text-text-secondary truncate hidden sm:inline">
                    {day.conditionText}
                  </span>
                </div>

                {/* Precipitation chance */}
                <div className="w-14 text-center shrink-0">
                  {(day.precipitationProbabilityMax ?? 0) > 0 ? (
                    <span className="text-xs font-mono text-cyan-400 font-medium">
                      {day.precipitationProbabilityMax}%
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-text-muted">—</span>
                  )}
                </div>

                {/* Range Bar */}
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs font-mono text-text-muted w-8 text-right shrink-0">
                    {Math.round(day.temperatureMin)}°
                  </span>

                  <div className="flex-1 h-2 rounded-full bg-atmos-800/60 relative overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-400 transition-all duration-300"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                    />
                  </div>

                  <span className="text-xs font-mono font-semibold text-text-primary w-8 text-left shrink-0">
                    {Math.round(day.temperatureMax)}°
                  </span>
                </div>
              </div>

              {/* Expanded details when clicked */}
              {isSelected && (
                <div className="pt-2 border-t border-atmos-700/30 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-xl bg-atmos-900/40">
                    <span className="text-text-muted text-[10px] block">
                      PRECIPITATION
                    </span>
                    <span className="text-cyan-400 font-medium">
                      {day.precipitationSum} mm
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-atmos-900/40">
                    <span className="text-text-muted text-[10px] block">
                      PEAK WIND
                    </span>
                    <span className="text-emerald-400 font-medium">
                      {Math.round(day.windSpeedMax)} km/h
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-atmos-900/40">
                    <span className="text-text-muted text-[10px] block">
                      MAX UV INDEX
                    </span>
                    <span className="text-amber-400 font-medium">
                      {day.uvIndexMax ?? "N/A"}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-atmos-900/40">
                    <span className="text-text-muted text-[10px] block">
                      FEELS LIKE
                    </span>
                    <span className="text-text-primary font-medium">
                      {day.apparentTemperatureMin !== null &&
                      day.apparentTemperatureMin !== undefined &&
                      day.apparentTemperatureMax !== null &&
                      day.apparentTemperatureMax !== undefined
                        ? `${Math.round(day.apparentTemperatureMin)}° / ${Math.round(day.apparentTemperatureMax)}°`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
