"use client";

import React, { useState, useEffect } from "react";
import { HistoricalWeather } from "@/lib/weather/domain/weather";
import { HistoricalTrendChart } from "./charts/historical-trend-chart";
import {
  formatTemperature,
  formatPrecipitation,
  formatWindSpeed,
} from "@/lib/weather/domain/units";

export interface HistoricalExplorerProps {
  latitude: number;
  longitude: number;
  locationName: string;
  units: "metric" | "imperial";
  timezone?: string;
}

// Compute safe default dates (ERA5 has ~5 days latency, so safe endDate is today - 5 days)
function getSafeDateOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function HistoricalExplorer({
  latitude,
  longitude,
  locationName,
  units,
  timezone,
}: HistoricalExplorerProps) {
  // Safe default: 12 days ago to 5 days ago (past 7 days in ERA5 archive)
  const [startDate, setStartDate] = useState<string>(() =>
    getSafeDateOffset(12)
  );
  const [endDate, setEndDate] = useState<string>(() => getSafeDateOffset(5));
  const [activePreset, setActivePreset] = useState<string>("7d");

  const [data, setData] = useState<HistoricalWeather | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const tempUnit = units === "imperial" ? "fahrenheit" : "celsius";
  const precipUnit = units === "imperial" ? "inch" : "mm";
  const windUnit = units === "imperial" ? "mph" : "kmh";

  // Fetch historical data
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function fetchHistorical() {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          lat: latitude.toString(),
          lon: longitude.toString(),
          startDate,
          endDate,
          units,
          timezone: timezone || "auto",
        });

        const res = await fetch(
          `/api/weather/historical?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          throw new Error(
            errData.error?.message ||
              `Historical API returned HTTP ${res.status}`
          );
        }

        const json = (await res.json()) as HistoricalWeather;
        if (!ignore) {
          setData(json);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to retrieve historical reanalysis data"
          );
          setIsLoading(false);
        }
      }
    }

    fetchHistorical();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [latitude, longitude, startDate, endDate, units, timezone]);

  const handleApplyPreset = (preset: "7d" | "14d" | "30d" | "lastYear") => {
    setActivePreset(preset);
    if (preset === "7d") {
      setStartDate(getSafeDateOffset(12));
      setEndDate(getSafeDateOffset(5));
    } else if (preset === "14d") {
      setStartDate(getSafeDateOffset(19));
      setEndDate(getSafeDateOffset(5));
    } else if (preset === "30d") {
      setStartDate(getSafeDateOffset(35));
      setEndDate(getSafeDateOffset(5));
    } else if (preset === "lastYear") {
      // Exactly 1 year ago, 7 days span
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() - 7);
      const end = new Date();
      end.setFullYear(end.getFullYear() - 1);

      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
    }
  };

  // Compute aggregate stats from daily summaries
  const summaries = data?.dailySummaries ?? [];
  const avgTemp =
    summaries.length > 0
      ? summaries.reduce(
          (acc, cur) =>
            acc +
            (cur.temperatureMean ??
              (cur.temperatureMax + cur.temperatureMin) / 2),
          0
        ) / summaries.length
      : null;
  const maxTemp =
    summaries.length > 0
      ? Math.max(...summaries.map((s) => s.temperatureMax))
      : null;
  const minTemp =
    summaries.length > 0
      ? Math.min(...summaries.map((s) => s.temperatureMin))
      : null;
  const totalPrecip =
    summaries.length > 0
      ? summaries.reduce((acc, cur) => acc + cur.precipitationSum, 0)
      : null;
  const maxWind =
    summaries.length > 0
      ? Math.max(...summaries.map((s) => s.windSpeedMax ?? 0))
      : null;

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Historical Explorer Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#222222]">
            Historical Weather (ERA5)
          </h3>
          <p className="text-xs text-[#6B7280]">
            Past atmospheric observations for {locationName}
          </p>
        </div>

        {/* Date Presets */}
        <div className="flex items-center gap-1 p-1 rounded-md bg-[#F7F7F7] border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => handleApplyPreset("7d")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activePreset === "7d"
                ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                : "text-[#6B7280] hover:text-[#222222]"
            }`}
          >
            Past 7D
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset("14d")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activePreset === "14d"
                ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                : "text-[#6B7280] hover:text-[#222222]"
            }`}
          >
            Past 14D
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset("30d")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activePreset === "30d"
                ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                : "text-[#6B7280] hover:text-[#222222]"
            }`}
          >
            Past 30D
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset("lastYear")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activePreset === "lastYear"
                ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                : "text-[#6B7280] hover:text-[#222222]"
            }`}
          >
            1 Year Ago
          </button>
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-[#F7F7F7] border border-[#E5E7EB] p-3 rounded-lg">
        <span className="font-medium text-[#6B7280]">Custom Range:</span>
        <div className="flex items-center gap-2">
          <label
            htmlFor="hist-start-date"
            className="text-[#6B7280] font-medium"
          >
            From:
          </label>
          <input
            id="hist-start-date"
            type="date"
            min="1940-01-01"
            max={getSafeDateOffset(3)}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setActivePreset("custom");
            }}
            className="px-2.5 py-1 rounded-md bg-white border border-[#E5E7EB] text-[#222222] text-xs focus:outline-none focus:border-[#FFC928] focus:ring-1 focus:ring-[#FFC928]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="hist-end-date" className="text-[#6B7280] font-medium">
            To:
          </label>
          <input
            id="hist-end-date"
            type="date"
            min="1940-01-01"
            max={getSafeDateOffset(2)}
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setActivePreset("custom");
            }}
            className="px-2.5 py-1 rounded-md bg-white border border-[#E5E7EB] text-[#222222] text-xs focus:outline-none focus:border-[#FFC928] focus:ring-1 focus:ring-[#FFC928]"
          />
        </div>

        {startDate > endDate && (
          <span className="text-[#D94841] text-xs font-medium">
            Start date must precede end date
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-[#6B7280] text-sm bg-[#F7F7F7] border border-[#E5E7EB] rounded-lg">
          <span className="w-6 h-6 border-2 border-[#E5E7EB] border-t-[#FFC928] rounded-full animate-spin" />
          <span>Retrieving ECMWF ERA5 reanalysis data...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4 rounded-lg border border-[#FED7D7] bg-[#FFF5F5] text-[#D94841] text-xs flex flex-col gap-1">
          <span className="font-bold">Historical Query Notice:</span>
          <span>{error}</span>
          <span className="text-[#6B7280] mt-1">
            Note: Open-Meteo ERA5 reanalysis data covers 1940 up to
            approximately 5 days prior to today.
          </span>
        </div>
      )}

      {/* Analytics Summary Metric Cards */}
      {!isLoading && !error && data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-lg bg-white border border-[#E5E7EB] flex flex-col gap-1 shadow-xs">
              <span className="text-xs text-[#6B7280] font-medium">
                Mean Temp
              </span>
              <span className="text-lg font-bold tabular-nums text-[#222222]">
                {avgTemp !== null
                  ? formatTemperature(avgTemp, tempUnit)
                  : "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-[#E5E7EB] flex flex-col gap-1 shadow-xs">
              <span className="text-xs text-[#6B7280] font-medium">
                Max Temp
              </span>
              <span className="text-lg font-bold tabular-nums text-[#222222]">
                {maxTemp !== null
                  ? formatTemperature(maxTemp, tempUnit)
                  : "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-[#E5E7EB] flex flex-col gap-1 shadow-xs">
              <span className="text-xs text-[#6B7280] font-medium">
                Min Temp
              </span>
              <span className="text-lg font-bold tabular-nums text-[#222222]">
                {minTemp !== null
                  ? formatTemperature(minTemp, tempUnit)
                  : "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-[#E5E7EB] flex flex-col gap-1 shadow-xs">
              <span className="text-xs text-[#6B7280] font-medium">
                Total Rain
              </span>
              <span className="text-lg font-bold tabular-nums text-[#4A90E2]">
                {totalPrecip !== null
                  ? formatPrecipitation(totalPrecip, precipUnit)
                  : "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-[#E5E7EB] flex flex-col gap-1 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-xs text-[#6B7280] font-medium">
                Max Wind
              </span>
              <span className="text-lg font-bold tabular-nums text-[#222222]">
                {maxWind !== null ? formatWindSpeed(maxWind, windUnit) : "N/A"}
              </span>
            </div>
          </div>

          {/* Chart Display */}
          <HistoricalTrendChart
            data={data}
            tempUnit={tempUnit}
            precipUnit={precipUnit}
          />

          {/* Provenance Note */}
          <div className="p-4 rounded-lg bg-[#F7F7F7] border border-[#E5E7EB] text-xs text-[#6B7280] flex flex-col gap-1">
            <span className="font-semibold text-[#222222]">
              About ERA5 Historical Reanalysis
            </span>
            <p className="leading-relaxed">
              Historical weather presented here is derived from the ECMWF ERA5
              Atmospheric Reanalysis model via Open-Meteo. Reanalysis combines
              historical satellite, weather balloon, and ground station
              observations with advanced atmospheric physics simulations to
              create a globally complete, consistent historical record. Values
              represent spatial grid estimates (approx. 25km resolution).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
