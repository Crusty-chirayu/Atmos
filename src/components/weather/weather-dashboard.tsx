"use client";

import React, { useState, useEffect } from "react";
import { WeatherBundle } from "@/lib/weather/domain/weather";
import { GeocodingLocation } from "@/lib/geocoding/domain/types";
import { LocationSearch } from "./location-search";
import { CurrentConditions } from "./current-conditions";
import { HourlyForecastComponent } from "./hourly-forecast";
import { DailyForecastComponent } from "./daily-forecast";
import { WeatherMetricsComponent } from "./weather-metrics";
import { WeatherSkeleton } from "./weather-skeleton";
import { formatLocalTime } from "@/lib/weather/utils/date-format";

// Default initial location: London, UK
const DEFAULT_INITIAL_LOCATION: GeocodingLocation = {
  id: "open-meteo:2643743",
  providerId: "open-meteo",
  name: "London",
  latitude: 51.50853,
  longitude: -0.12574,
  country: "United Kingdom",
  countryCode: "GB",
  adminArea: "England",
  timezone: "Europe/London",
  elevation: 25,
  formattedAddress: "London, England, United Kingdom",
};

export interface WeatherDashboardProps {
  initialLocation?: GeocodingLocation;
  initialUnits?: "metric" | "imperial";
}

/**
 * Master Weather Dashboard coordinator component for ATMOS.
 * Connects location search, unit preferences, data fetching, cancellation,
 * skeleton loading, error recovery, and telemetry components.
 */
export function WeatherDashboard({
  initialLocation = DEFAULT_INITIAL_LOCATION,
  initialUnits = "metric",
}: WeatherDashboardProps) {
  const [selectedLocation, setSelectedLocation] =
    useState<GeocodingLocation>(initialLocation);
  const [units, setUnits] = useState<"metric" | "imperial">(initialUnits);
  const [weatherBundle, setWeatherBundle] = useState<WeatherBundle | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [refreshIndex, setRefreshIndex] = useState<number>(0);

  // Fetch whenever selected location, units, or refreshIndex change
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function execute() {
      try {
        const params = new URLSearchParams({
          lat: selectedLocation.latitude.toString(),
          lon: selectedLocation.longitude.toString(),
          name: selectedLocation.name,
          units,
          timezone: selectedLocation.timezone || "auto",
        });

        if (selectedLocation.country)
          params.set("country", selectedLocation.country);
        if (selectedLocation.countryCode)
          params.set("countryCode", selectedLocation.countryCode);
        if (selectedLocation.adminArea)
          params.set("adminArea", selectedLocation.adminArea);

        const response = await fetch(`/api/weather?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          const errData = (await response.json().catch(() => ({}))) as {
            error?: { message?: string; code?: string };
          };
          throw new Error(
            errData.error?.message ||
              `Failed to retrieve weather data (${response.status})`
          );
        }

        const data = (await response.json()) as WeatherBundle;
        if (!ignore) {
          setWeatherBundle(data);
          setLastUpdated(new Date());
          setError(null);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; // Ignore intentional cancellation
        }
        if (!ignore) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to retrieve weather forecast";
          setError(message);
          setIsLoading(false);
        }
      }
    }

    execute();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedLocation, units, refreshIndex]);

  const handleSelectLocation = (loc: GeocodingLocation) => {
    setIsLoading(true);
    setSelectedLocation(loc);
  };

  const handleToggleUnits = () => {
    setIsLoading(true);
    setUnits((prev) => (prev === "metric" ? "imperial" : "metric"));
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Top Action Bar: Search Combobox & Quick Unit Switcher */}
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="w-full sm:max-w-md">
          <LocationSearch
            onSelectLocation={handleSelectLocation}
            placeholder="Search global cities, regions..."
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Unit Toggle Pill */}
          <div
            className="glass rounded-full p-1 flex items-center gap-1 text-xs font-mono font-medium"
            style={{
              background: "var(--surface-overlay)",
              border: "1px solid var(--border-default)",
            }}
          >
            <button
              type="button"
              onClick={() => setUnits("metric")}
              className={`px-3 py-1 rounded-full transition-all duration-150 ${
                units === "metric"
                  ? "bg-accent-500 text-atmos-950 font-bold shadow-sm"
                  : "text-atmos-300 hover:text-white"
              }`}
              aria-pressed={units === "metric"}
            >
              °C
            </button>
            <button
              type="button"
              onClick={() => setUnits("imperial")}
              className={`px-3 py-1 rounded-full transition-all duration-150 ${
                units === "imperial"
                  ? "bg-accent-500 text-atmos-950 font-bold shadow-sm"
                  : "text-atmos-300 hover:text-white"
              }`}
              aria-pressed={units === "imperial"}
            >
              °F
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh current forecast"
            aria-label="Refresh forecast"
            className="p-2 rounded-full glass hover:opacity-80 transition-opacity focus:outline-none disabled:opacity-50"
            style={{
              background: "var(--surface-overlay)",
              border: "1px solid var(--border-default)",
              color: "var(--text-secondary)",
            }}
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading && !weatherBundle && <WeatherSkeleton />}

      {/* Error State */}
      {error && !isLoading && (
        <div
          role="alert"
          className="glass rounded-3xl p-8 text-center max-w-lg mx-auto space-y-4"
          style={{
            background: "var(--surface-overlay)",
            border: "1px solid rgb(255 77 77 / 0.3)",
          }}
        >
          <div
            className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
            style={{
              background: "rgb(255 77 77 / 0.15)",
              color: "var(--color-danger-400)",
            }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2
            className="text-xl font-bold font-display"
            style={{ color: "var(--text-primary)" }}
          >
            Weather Forecast Unavailable
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {error}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200"
            style={{
              background: "var(--color-accent-500)",
              color: "#04060d",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Success State */}
      {weatherBundle && (
        <div className="space-y-8 transition-opacity duration-300">
          {/* Current Conditions Card */}
          <CurrentConditions
            bundle={weatherBundle}
            units={units}
            onToggleUnits={handleToggleUnits}
          />

          {/* Hourly Timeline */}
          <HourlyForecastComponent
            hourly={weatherBundle.hourly}
            timezone={weatherBundle.meta.timezone}
            units={units}
          />

          {/* Daily Outlook */}
          <DailyForecastComponent
            daily={weatherBundle.daily}
            timezone={weatherBundle.meta.timezone}
            units={units}
          />

          {/* Auxiliary Telemetry Metrics */}
          <WeatherMetricsComponent bundle={weatherBundle} units={units} />

          {/* Provenance & Freshness Footer */}
          <footer
            className="text-center text-xs py-4 space-y-1.5 border-t border-atmos-700/20"
            style={{ color: "var(--text-muted)" }}
          >
            <p>
              Data provided by{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-accent-400 transition-colors"
              >
                Open-Meteo
              </a>{" "}
              under CC BY 4.0. Geocoding via GeoNames.
            </p>
            {lastUpdated && (
              <p className="font-mono text-[11px] opacity-75">
                Last updated at{" "}
                {formatLocalTime(lastUpdated, weatherBundle.meta.timezone, {
                  hour12: true,
                  includeSeconds: true,
                })}{" "}
                local time
              </p>
            )}
          </footer>
        </div>
      )}
    </div>
  );
}
