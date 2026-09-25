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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-atmos-700/30 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-display font-bold text-text-primary">
            Historical Weather Reanalysis (ERA5)
          </h3>
          <p className="text-xs text-text-muted">
            Retrospective atmospheric observations for {locationName}
          </p>
        </div>

        {/* Date Presets */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl glass">
          <button
            type="button"
            onClick={() => handleApplyPreset("7d")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activePreset === "7d"
                ? "bg-accent-500 text-atmos-950 font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Past 7D
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset("14d")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activePreset === "14d"
                ? "bg-accent-500 text-atmos-950 font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Past 14D
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset("30d")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activePreset === "30d"
                ? "bg-accent-500 text-atmos-950 font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Past 30D
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset("lastYear")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              activePreset === "lastYear"
                ? "bg-accent-500 text-atmos-950 font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            1 Year Ago
          </button>
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="flex flex-wrap items-center gap-3 text-xs glass p-3 rounded-2xl">
        <span className="font-mono text-text-muted">Custom Period:</span>
        <div className="flex items-center gap-2">
          <label
            htmlFor="hist-start-date"
            className="text-text-secondary font-medium"
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
            className="px-2.5 py-1 rounded-lg glass font-mono text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="hist-end-date"
            className="text-text-secondary font-medium"
          >
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
            className="px-2.5 py-1 rounded-lg glass font-mono text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent-400"
          />
        </div>

        {startDate > endDate && (
          <span className="text-rose-400 font-mono text-[11px]">
            Start date must precede end date
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-text-muted text-sm glass rounded-3xl animate-pulse">
          <span className="w-6 h-6 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />
          <span>Retrieving ECMWF ERA5 reanalysis dataset...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex flex-col gap-1">
          <span className="font-bold">Historical Query Notice:</span>
          <span>{error}</span>
          <span className="text-text-muted mt-1">
            Note: Open-Meteo ERA5 reanalysis data covers 1940 up to
            approximately 5 days prior to today.
          </span>
        </div>
      )}

      {/* Analytics Summary Metric Cards */}
      {!isLoading && !error && data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-2xl glass flex flex-col gap-1">
              <span className="text-[10px] font-mono text-text-muted tracking-wider">
                MEAN TEMP
              </span>
              <span className="text-lg font-bold font-mono text-text-primary">
                {avgTemp !== null
                  ? formatTemperature(avgTemp, tempUnit)
                  : "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl glass flex flex-col gap-1">
              <span className="text-[10px] font-mono text-text-muted tracking-wider">
                RECORD HIGH
              </span>
              <span className="text-lg font-bold font-mono text-amber-400">
                {maxTemp !== null
                  ? formatTemperature(maxTemp, tempUnit)
                  : "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl glass flex flex-col gap-1">
              <span className="text-[10px] font-mono text-text-muted tracking-wider">
                RECORD LOW
              </span>
              <span className="text-lg font-bold font-mono text-cyan-400">
                {minTemp !== null
                  ? formatTemperature(minTemp, tempUnit)
                  : "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl glass flex flex-col gap-1">
              <span className="text-[10px] font-mono text-text-muted tracking-wider">
                TOTAL RAIN
              </span>
              <span className="text-lg font-bold font-mono text-blue-400">
                {totalPrecip !== null
                  ? formatPrecipitation(totalPrecip, precipUnit)
                  : "N/A"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl glass flex flex-col gap-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-mono text-text-muted tracking-wider">
                MAX WIND
              </span>
              <span className="text-lg font-bold font-mono text-emerald-400">
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

          {/* Provenance and Educational Note */}
          <div className="p-4 rounded-2xl glass border border-atmos-700/30 text-xs text-text-secondary flex flex-col gap-1.5 bg-atmos-900/40">
            <span className="font-semibold text-accent-400">
              About ERA5 Reanalysis vs. Station Observations
            </span>
            <p className="leading-relaxed">
              Historical weather presented here is derived from the **ECMWF ERA5
              Atmospheric Reanalysis** model via Open-Meteo. Reanalysis combines
              historical satellite, weather balloon, and ground station
              observations with advanced meteorological physics simulations to
              create a globally complete, consistent historical record. Values
              represent spatial grid estimates (approx. 25km resolution) rather
              than a single direct physical thermometer.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
