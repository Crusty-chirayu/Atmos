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
      <div className="h-48 flex items-center justify-center text-[#6B7280] text-sm bg-[#F7F7F7] border border-[#E5E7EB] rounded-md">
        No daily forecast data available
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
      <div className="flex items-center justify-between text-xs text-[#6B7280]">
        <span>
          Week Low:{" "}
          <strong className="text-[#222222] tabular-nums">
            {Math.round(globalMin)}
            {tempUnit}
          </strong>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[#6B7280]">
          <span className="w-3 h-1.5 rounded-full bg-[#FFC928]" /> Temperature
          Range
        </span>
        <span>
          Week High:{" "}
          <strong className="text-[#222222] tabular-nums">
            {Math.round(globalMax)}
            {tempUnit}
          </strong>
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
              className={`p-3 sm:p-3.5 rounded-md flex flex-col gap-2 transition-colors cursor-pointer ${
                isSelected
                  ? "bg-[#FFF8E1] border border-[#FFC928] shadow-xs"
                  : "bg-white border border-[#E5E7EB] hover:bg-[#F7F8FA]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Date & Weekday */}
                <div className="w-24 sm:w-32 shrink-0">
                  <div className="text-sm font-semibold text-[#222222]">
                    {weekday}
                  </div>
                  <div className="text-xs text-[#626B78]">{dateLabel}</div>
                </div>

                {/* Weather Condition Icon */}
                <div className="flex items-center gap-2 w-28 sm:w-36 shrink-0">
                  <WeatherIcon
                    code={day.weatherCode}
                    category={
                      WMO_CODE_MAP[day.weatherCode]?.category ?? "clear"
                    }
                    isDay={true}
                    className="w-5 h-5 shrink-0"
                  />
                  <span className="text-xs text-[#626B78] truncate hidden sm:inline">
                    {day.conditionText}
                  </span>
                </div>

                {/* Precipitation chance */}
                <div className="w-14 text-center shrink-0">
                  {(day.precipitationProbabilityMax ?? 0) > 0 ? (
                    <span className="text-xs tabular-nums text-[#3984D6] font-semibold">
                      {day.precipitationProbabilityMax}%
                    </span>
                  ) : (
                    <span className="text-xs text-[#737D8A]">—</span>
                  )}
                </div>

                {/* Range Bar */}
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs tabular-nums text-[#626B78] w-8 text-right shrink-0">
                    {Math.round(day.temperatureMin)}°
                  </span>

                  <div className="flex-1 h-2 rounded-full bg-[#E5E7EB] relative overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 rounded-full bg-[#FFC928] transition-all duration-300"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                    />
                  </div>

                  <span className="text-xs tabular-nums font-bold text-[#222222] w-8 text-left shrink-0">
                    {Math.round(day.temperatureMax)}°
                  </span>
                </div>
              </div>

              {/* Expanded details when clicked */}
              {isSelected && (
                <div className="pt-2 border-t border-[#E5E7EB] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-md bg-[#F7F8FA] border border-[#E5E7EB]">
                    <span className="text-[#626B78] text-xs block font-medium">
                      Precipitation
                    </span>
                    <span className="text-[#3984D6] font-semibold tabular-nums">
                      {day.precipitationSum} mm
                    </span>
                  </div>
                  <div className="p-2 rounded-md bg-[#F7F8FA] border border-[#E5E7EB]">
                    <span className="text-[#626B78] text-xs block font-medium">
                      Peak Wind
                    </span>
                    <span className="text-[#222222] font-semibold tabular-nums">
                      {Math.round(day.windSpeedMax)} km/h
                    </span>
                  </div>
                  <div className="p-2 rounded-md bg-[#F7F8FA] border border-[#E5E7EB]">
                    <span className="text-[#626B78] text-xs block font-medium">
                      Max UV Index
                    </span>
                    <span className="text-[#222222] font-semibold tabular-nums">
                      {day.uvIndexMax ?? "N/A"}
                    </span>
                  </div>
                  <div className="p-2 rounded-md bg-[#F7F8FA] border border-[#E5E7EB]">
                    <span className="text-[#626B78] text-xs block font-medium">
                      Feels Like
                    </span>
                    <span className="text-[#222222] font-semibold tabular-nums">
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
