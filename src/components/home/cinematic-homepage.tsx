"use client";

import React, { useState, useEffect } from "react";
import { HomeNav, HomeViewMode } from "./home-nav";

import { HeroSection } from "./hero-section";
import { InteractiveGlobe } from "@/components/globe/interactive-globe";
import { AtmosphericScene } from "@/components/atmosphere/atmospheric-scene";
import { CurrentConditions } from "@/components/weather/current-conditions";
import { HourlyForecast } from "@/components/weather/hourly-forecast";
import { DailyForecast } from "@/components/weather/daily-forecast";
import { WeatherMetrics } from "@/components/weather/weather-metrics";
import { WeatherSkeleton } from "@/components/weather/weather-skeleton";
import { GeocodingLocation } from "@/lib/geocoding/domain/types";
import { FeaturedCity, FEATURED_CITIES } from "@/lib/globe/coordinates";
import { WeatherBundle } from "@/lib/weather/domain/weather";

interface SelectedLocationState {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
  countryCode?: string;
  adminArea?: string;
  timezone?: string;
}

const DEFAULT_LOCATION: SelectedLocationState = {
  latitude: 51.5074,
  longitude: -0.1278,
  name: "London",
  country: "United Kingdom",
  countryCode: "GB",
  adminArea: "Greater London",
  timezone: "Europe/London",
};

export function CinematicHomepage() {
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocationState>(DEFAULT_LOCATION);
  const [weatherBundle, setWeatherBundle] = useState<WeatherBundle | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [viewMode, setViewMode] = useState<HomeViewMode>("overview");

  // Fetch weather data whenever selectedLocation or units change
  useEffect(() => {
    let isSubscribed = true;
    const controller = new AbortController();

    async function loadWeather() {
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

        const res = await fetch(`/api/weather?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData?.error?.message ||
              `Weather service returned HTTP ${res.status}`
          );
        }

        const data = (await res.json()) as WeatherBundle;
        if (isSubscribed) {
          setWeatherBundle(data);
          setError(null);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        if (isSubscribed) {
          setError(
            (err as Error).message ||
              "Unable to load weather data. Please check connection."
          );
          setIsLoading(false);
        }
      }
    }

    loadWeather();
    return () => {
      isSubscribed = false;
      controller.abort();
    };
  }, [selectedLocation, units]);

  // Handle location selected from search combobox
  const handleSelectLocation = (location: GeocodingLocation) => {
    setIsLoading(true);
    setError(null);
    setSelectedLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name,
      country: location.country,
      countryCode: location.countryCode,
      adminArea: location.adminArea,
      timezone: location.timezone,
    });
  };

  // Handle city selected from 3D globe or quick-explore chips
  const handleSelectFeaturedCity = (city: FeaturedCity) => {
    setIsLoading(true);
    setError(null);
    setSelectedLocation({
      latitude: city.latitude,
      longitude: city.longitude,
      name: city.name,
      country: city.country,
      countryCode: city.countryCode,
      adminArea: city.adminArea,
      timezone: city.timezone,
    });
  };

  const handleToggleUnits = () => {
    setIsLoading(true);
    setUnits((prev) => (prev === "metric" ? "imperial" : "metric"));
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // Force a re-fetch by triggering a refresh with a copy of selectedLocation
    setSelectedLocation((prev) => ({ ...prev }));
  };

  return (
    <AtmosphericScene
      weatherCode={weatherBundle?.current.weatherCode ?? 0}
      isDay={weatherBundle?.current.isDay ?? true}
      className="min-h-screen flex flex-col"
    >
      {/* Navigation Header */}
      <HomeNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        units={units}
        onToggleUnits={handleToggleUnits}
      />

      <main id="main-content" className="flex-1 flex flex-col pb-16">
        {/* Cinematic Hero */}
        <HeroSection
          selectedLocation={selectedLocation}
          weatherBundle={weatherBundle}
          isLoadingWeather={isLoading}
          onSelectLocation={handleSelectLocation}
          onSelectFeaturedCity={handleSelectFeaturedCity}
        />

        {/* Global Error Banner */}
        {error && (
          <div role="alert" className="w-full max-w-4xl mx-auto px-4 mb-6">
            <div
              className="p-4 rounded-2xl glass flex items-center justify-between gap-4 border"
              style={{
                borderColor: "var(--color-danger-500)",
                background: "rgb(255 77 77 / 0.1)",
              }}
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: "var(--color-danger-400)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {error}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-danger-500 text-white hover:bg-danger-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* View Mode: OVERVIEW (Cinematic Split: Globe + Weather Dashboard) */}
        {viewMode === "overview" && (
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col gap-8">
            {/* Top Split Row: 3D Interactive Globe + Hero Current Conditions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Interactive 3D Earth Globe */}
              <div className="lg:col-span-6 flex flex-col rounded-3xl glass p-4 sm:p-6 border border-border-default/50 min-h-[380px] sm:min-h-[440px] relative overflow-hidden shadow-xl">
                <div className="flex items-center justify-between mb-2 z-10">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full bg-accent-400 animate-pulse"
                    />
                    <h2
                      className="text-xs font-mono font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Interactive 3D Globe
                    </h2>
                  </div>
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Drag to rotate · Click city
                  </span>
                </div>

                <div className="flex-1 w-full h-full min-h-[320px] flex items-center justify-center">
                  <InteractiveGlobe
                    selectedLocation={selectedLocation}
                    onSelectCity={handleSelectFeaturedCity}
                  />
                </div>
              </div>

              {/* Right Column: Hero Current Weather Conditions */}
              <div className="lg:col-span-6 flex flex-col justify-between">
                {isLoading && !weatherBundle ? (
                  <WeatherSkeleton />
                ) : weatherBundle ? (
                  <div className="flex flex-col gap-6 h-full justify-between">
                    <CurrentConditions
                      bundle={weatherBundle}
                      units={units}
                      onToggleUnits={handleToggleUnits}
                    />
                    <HourlyForecast
                      hourly={weatherBundle.hourly}
                      timezone={weatherBundle.meta.timezone}
                      units={units}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Bottom Row: 7-Day Synoptic Outlook & Deep Telemetry Metrics */}
            {weatherBundle && (
              <>
                <DailyForecast
                  daily={weatherBundle.daily}
                  timezone={weatherBundle.meta.timezone}
                  units={units}
                />
                <WeatherMetrics bundle={weatherBundle} units={units} />
              </>
            )}
          </div>
        )}

        {/* View Mode: GLOBE ONLY (Expanded Planetary Observatory) */}
        {viewMode === "globe" && (
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col gap-6">
            <div className="w-full h-[550px] sm:h-[620px] rounded-3xl glass p-6 border border-border-default/50 relative overflow-hidden shadow-2xl flex flex-col">
              <div className="flex items-center justify-between mb-4 z-10">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full bg-accent-400 animate-pulse"
                  />
                  <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary">
                    Planetary Mesh Observatory
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-accent-400">
                    {selectedLocation.name} (
                    {selectedLocation.latitude.toFixed(2)}°,{" "}
                    {selectedLocation.longitude.toFixed(2)}°)
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full h-full">
                <InteractiveGlobe
                  selectedLocation={selectedLocation}
                  onSelectCity={handleSelectFeaturedCity}
                />
              </div>

              {/* City quick-select bar inside globe mode */}
              <div className="mt-4 pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-2 z-10">
                <span className="text-xs font-mono text-text-muted">
                  Quick Focus:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {FEATURED_CITIES.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleSelectFeaturedCity(city)}
                      className={`px-2 py-0.5 rounded-full text-xs font-mono transition-colors ${
                        selectedLocation.name === city.name
                          ? "bg-accent-500 text-atmos-950 font-bold"
                          : "bg-surface-raised text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Compact Weather Summary Card beneath expanded globe */}
            {weatherBundle && (
              <div className="w-full">
                <HourlyForecast
                  hourly={weatherBundle.hourly}
                  timezone={weatherBundle.meta.timezone}
                  units={units}
                />
              </div>
            )}
          </div>
        )}

        {/* View Mode: DASHBOARD ONLY (Full In-Depth Telemetry) */}
        {viewMode === "dashboard" && (
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col gap-6">
            {isLoading && !weatherBundle ? (
              <WeatherSkeleton />
            ) : weatherBundle ? (
              <>
                <CurrentConditions
                  bundle={weatherBundle}
                  units={units}
                  onToggleUnits={handleToggleUnits}
                />
                <HourlyForecast
                  hourly={weatherBundle.hourly}
                  timezone={weatherBundle.meta.timezone}
                  units={units}
                />
                <DailyForecast
                  daily={weatherBundle.daily}
                  timezone={weatherBundle.meta.timezone}
                  units={units}
                />
                <WeatherMetrics bundle={weatherBundle} units={units} />
              </>
            ) : null}
          </div>
        )}

        {/* Data Provenance Footer */}
        {weatherBundle && (
          <footer className="w-full max-w-5xl mx-auto px-4 mt-12 text-center text-xs font-mono space-y-1 text-text-muted">
            <p>
              Data Source: Open-Meteo Meteorological Reanalysis & Forecast
              Engine (CC-BY 4.0)
            </p>
            <p>
              Observation Timestamp:{" "}
              {new Date(weatherBundle.meta.fetchedAt).toUTCString()} · Lat/Lon:{" "}
              {selectedLocation.latitude.toFixed(4)}°,{" "}
              {selectedLocation.longitude.toFixed(4)}°
            </p>
          </footer>
        )}
      </main>
    </AtmosphericScene>
  );
}
