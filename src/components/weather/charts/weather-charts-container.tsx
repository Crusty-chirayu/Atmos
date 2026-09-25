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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-atmos-700/30 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-display font-bold text-text-primary tracking-tight">
            Meteorological Charts
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/20">
            24H Telemetry
          </span>
        </div>

        {/* Tab Controls */}
        <div
          role="tablist"
          aria-label="Weather telemetry charts"
          className="p-1 rounded-xl glass flex items-center gap-1 overflow-x-auto max-w-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "temperature"}
            onClick={() => setActiveTab("temperature")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "temperature"
                ? "bg-accent-500 text-atmos-950 font-semibold shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-atmos-700/30"
            }`}
          >
            Temperature
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "precipitation"}
            onClick={() => setActiveTab("precipitation")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "precipitation"
                ? "bg-accent-500 text-atmos-950 font-semibold shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-atmos-700/30"
            }`}
          >
            Precipitation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "wind"}
            onClick={() => setActiveTab("wind")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "wind"
                ? "bg-accent-500 text-atmos-950 font-semibold shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-atmos-700/30"
            }`}
          >
            Wind & Direction
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pressure"}
            onClick={() => setActiveTab("pressure")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "pressure"
                ? "bg-accent-500 text-atmos-950 font-semibold shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-atmos-700/30"
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === "weekly"
                  ? "bg-accent-500 text-atmos-950 font-semibold shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-atmos-700/30"
              }`}
            >
              7-Day Range
            </button>
          )}
        </div>
      </div>

      {/* Active Chart Panel */}
      <div role="tabpanel" className="w-full transition-opacity duration-300">
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
