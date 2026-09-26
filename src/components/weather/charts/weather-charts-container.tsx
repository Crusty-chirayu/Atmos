"use client";

import React, { useState } from "react";
import { HourlyForecast, DailyForecast } from "@/lib/weather/domain/weather";
import { TemperatureTrendChart } from "./temperature-trend-chart";
import { PrecipitationChart } from "./precipitation-chart";
import { WindChart } from "./wind-chart";
import { PressureHumidityChart } from "./pressure-humidity-chart";
import { SevenDayRangeChart } from "./seven-day-range-chart";

export type ChartType =
  "temperature" | "precipitation" | "wind" | "pressure" | "weekly";

export interface WeatherChartsContainerProps {
  hourly?: HourlyForecast;
  daily?: DailyForecast;
  units: "metric" | "imperial";
  timezone?: string;
  defaultChart?: ChartType;
}

export function WeatherChartsContainer({
  hourly,
  daily,
  units,
  timezone,
  defaultChart = "temperature",
}: WeatherChartsContainerProps) {
  const [activeTab, setActiveTab] = useState<ChartType>(defaultChart);

  const tempUnit = units === "imperial" ? "fahrenheit" : "celsius";
  const precipUnit = units === "imperial" ? "inch" : "mm";
  const windUnit = units === "imperial" ? "mph" : "kmh";
  const pressUnit = units === "imperial" ? "inhg" : "hpa";

  const hourlyEntries = hourly?.entries ?? [];

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Chart Selector Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#222222]">
            Forecast Charts
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-[#F7F7F7] text-[#6B7280] border border-[#E5E7EB]">
            24h View
          </span>
        </div>

        {/* Tab Controls */}
        <div
          role="tablist"
          aria-label="Weather telemetry charts"
          className="p-0.5 rounded-md bg-[#F7F7F7] border border-[#E5E7EB] flex items-center gap-0.5 overflow-x-auto max-w-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "temperature"}
            onClick={() => setActiveTab("temperature")}
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "temperature"
                ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                : "text-[#6B7280] hover:text-[#222222]"
            }`}
          >
            Temperature
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "precipitation"}
            onClick={() => setActiveTab("precipitation")}
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "precipitation"
                ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                : "text-[#6B7280] hover:text-[#222222]"
            }`}
          >
            Precipitation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "wind"}
            onClick={() => setActiveTab("wind")}
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "wind"
                ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                : "text-[#6B7280] hover:text-[#222222]"
            }`}
          >
            Wind & Direction
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pressure"}
            onClick={() => setActiveTab("pressure")}
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "pressure"
                ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                : "text-[#6B7280] hover:text-[#222222]"
            }`}
          >
            Pressure & Humidity
          </button>
          {daily && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "weekly"}
              onClick={() => setActiveTab("weekly")}
              className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === "weekly"
                  ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                  : "text-[#6B7280] hover:text-[#222222]"
              }`}
            >
              7-Day Range
            </button>
          )}
        </div>
      </div>

      {/* Active Chart Panel */}
      <div role="tabpanel" className="w-full transition-opacity duration-200">
        {activeTab === "temperature" && (
          <TemperatureTrendChart
            entries={hourlyEntries}
            unit={tempUnit}
            timezone={timezone}
          />
        )}
        {activeTab === "precipitation" && (
          <PrecipitationChart
            entries={hourlyEntries}
            unit={precipUnit}
            timezone={timezone}
          />
        )}
        {activeTab === "wind" && (
          <WindChart
            entries={hourlyEntries}
            unit={windUnit}
            timezone={timezone}
          />
        )}
        {activeTab === "pressure" && (
          <PressureHumidityChart
            entries={hourlyEntries}
            unit={pressUnit}
            timezone={timezone}
          />
        )}
        {activeTab === "weekly" && daily && (
          <SevenDayRangeChart
            daily={daily}
            unit={tempUnit}
            timezone={timezone}
          />
        )}
      </div>
    </div>
  );
}
