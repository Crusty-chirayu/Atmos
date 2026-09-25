"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { WeatherBundle } from "@/lib/weather/domain/weather";
import { GeocodingLocation } from "@/lib/geocoding/domain/types";
import { LocationSearch } from "./location-search";
import { CurrentConditions } from "./current-conditions";
import { HourlyForecastComponent } from "./hourly-forecast";
import { DailyForecastComponent } from "./daily-forecast";
import { WeatherMetricsComponent } from "./weather-metrics";
import { WeatherSkeleton } from "./weather-skeleton";
import { WeatherChartsContainer } from "./charts/weather-charts-container";
import { WeatherMap2D } from "@/components/maps/weather-map-2d";
import { HistoricalExplorer } from "./historical-explorer";
import { SavedLocationsOverview } from "./saved-locations-overview";
import { UserMenu } from "@/components/auth/user-menu";
import {
  formatLocalTime,
  formatLocalDate,
} from "@/lib/weather/utils/date-format";
import { useAuth } from "@/lib/auth/auth-context";

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

export type DashboardSection =
  "all" | "overview" | "charts" | "map" | "historical" | "locations";

export interface WeatherDashboardViewProps {
  initialLocation?: GeocodingLocation;
  initialUnits?: "metric" | "imperial";
}

export function WeatherDashboardView({
  initialLocation = DEFAULT_INITIAL_LOCATION,
  initialUnits = "metric",
}: WeatherDashboardViewProps) {
  const { preferences, updatePreferences } = useAuth();
  const [selectedLocation, setSelectedLocation] =
    useState<GeocodingLocation>(initialLocation);
  const [userUnitOverride, setUserUnitOverride] = useState<
    "metric" | "imperial" | null
  >(null);
  const units: "metric" | "imperial" =
    userUnitOverride ??
    (preferences?.temperature_unit === "fahrenheit"
      ? "imperial"
      : initialUnits);

  const [activeSection, setActiveSection] = useState<DashboardSection>("all");
  const [weatherBundle, setWeatherBundle] = useState<WeatherBundle | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshCount, setRefreshCount] = useState<number>(0);

  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";
    }
    return "dark";
  });

  const toggleTheme = () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("atmos-theme", nextTheme);
    } catch {
      // Ignored
    }
  };

  const handleToggleUnits = () => {
    const nextUnits = units === "metric" ? "imperial" : "metric";
    setUserUnitOverride(nextUnits);
    if (updatePreferences) {
      updatePreferences({
        temperature_unit: nextUnits === "imperial" ? "fahrenheit" : "celsius",
        wind_speed_unit: nextUnits === "imperial" ? "mph" : "kmh",
        precipitation_unit: nextUnits === "imperial" ? "inch" : "mm",
      }).catch(() => {
        // Ignored
      });
    }
  };

  // Fetch weather data for selected location
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadWeather() {
      setIsLoading(true);
      setError(null);
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
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          throw new Error(
            errData.error?.message ||
              `Weather service returned HTTP ${res.status}`
          );
        }

        const data = (await res.json()) as WeatherBundle;
        if (!ignore) {
          setWeatherBundle(data);
          setLastRefreshed(new Date());
          setError(null);
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
              : "Unable to retrieve meteorological forecast data"
          );
          setIsLoading(false);
        }
      }
    }

    loadWeather();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedLocation, units, refreshCount]);

  // Handle map coordinate click
  const handleMapSelect = useCallback(
    (coords: { latitude: number; longitude: number }) => {
      setSelectedLocation((prev) => ({
        ...prev,
        id: `custom:${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`,
        name: `Lat ${coords.latitude.toFixed(2)}°, Lon ${coords.longitude.toFixed(2)}°`,
        latitude: coords.latitude,
        longitude: coords.longitude,
        country: undefined,
        countryCode: undefined,
        adminArea: undefined,
        formattedAddress: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      }));
    },
    []
  );

  const nowIso = new Date().toISOString();
  const locationTz = selectedLocation.timezone || "UTC";

  return (
    <div className="min-h-screen bg-atmos-950 text-text-primary flex flex-col antialiased selection:bg-accent-500/20 selection:text-accent-400">
      {/* Top Application Header */}
      <header className="sticky top-0 z-30 w-full glass border-b border-atmos-700/20 px-4 sm:px-8 py-3 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Route Links */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 group focus:outline-none"
              aria-label="ATMOS Homepage"
            >
              <span className="font-display font-black text-2xl tracking-tight text-gradient">
                ATMOS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-accent-500/10 text-accent-400 border border-accent-500/20">
                Dashboard
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-2 text-xs font-medium text-text-secondary">
              <Link
                href="/"
                className="px-2.5 py-1 rounded-lg hover:text-text-primary hover:bg-atmos-800/40 transition-colors"
              >
                Planetary View
              </Link>
              <span className="text-atmos-700">/</span>
              <span className="text-text-primary font-semibold">
                Weather Intelligence
              </span>
            </nav>
          </div>

          {/* Location Search Bar in Header */}
          <div className="flex-1 max-w-md min-w-[240px]">
            <LocationSearch
              onSelectLocation={(loc: GeocodingLocation) =>
                setSelectedLocation(loc)
              }
              placeholder="Search city, region, or coordinates..."
            />
          </div>

          {/* Action Utilities (Units, Theme, UserMenu, Refresh) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => setRefreshCount((c) => c + 1)}
              disabled={isLoading}
              aria-label="Refresh weather data"
              title="Refresh forecast data"
              className="p-2 rounded-xl glass text-xs text-text-secondary hover:text-text-primary hover:bg-atmos-700/40 transition-colors"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? "animate-spin text-accent-400" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* Metric/Imperial Unit Switcher */}
            <button
              type="button"
              onClick={handleToggleUnits}
              aria-label={`Switch units to ${units === "metric" ? "Imperial (°F)" : "Metric (°C)"}`}
              title="Toggle Metric / Imperial"
              className="px-2.5 py-1.5 rounded-xl glass text-xs font-mono font-medium hover:bg-atmos-700/40 transition-colors text-text-secondary hover:text-text-primary"
            >
              {units === "metric" ? "°C · km/h" : "°F · mph"}
            </button>

            {/* Dark/Light Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${currentTheme === "dark" ? "light" : "dark"} theme`}
              className="p-2 rounded-xl glass text-xs hover:bg-atmos-700/40 transition-colors text-text-secondary hover:text-text-primary"
            >
              {currentTheme === "dark" ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            {/* Authenticated User Menu */}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 flex flex-col gap-6">
        {/* Selected Location Banner & Local Time */}
        <section
          aria-label="Location and time header"
          className="flex flex-wrap items-end justify-between gap-4 pb-2 border-b border-atmos-700/20"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-400 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-text-primary tracking-tight">
                {selectedLocation.name}
              </h1>
              {selectedLocation.country && (
                <span className="text-sm font-medium text-text-muted">
                  ·{" "}
                  {selectedLocation.adminArea
                    ? `${selectedLocation.adminArea}, `
                    : ""}
                  {selectedLocation.country}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-text-muted mt-1">
              <span>{formatLocalDate(nowIso, locationTz, "long")}</span>
              <span>·</span>
              <span className="text-text-secondary font-semibold">
                {formatLocalTime(nowIso, locationTz)} ({locationTz})
              </span>
              {lastRefreshed && (
                <>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline">
                    Updated{" "}
                    {formatLocalTime(lastRefreshed.toISOString(), "auto")}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Section Navigation Pills */}
          <div
            role="tablist"
            aria-label="Dashboard sections"
            className="p-1 rounded-2xl glass flex items-center gap-1 overflow-x-auto max-w-full"
          >
            {[
              { id: "all", label: "Full Dashboard" },
              { id: "overview", label: "Conditions" },
              { id: "charts", label: "Telemetry Charts" },
              { id: "map", label: "2D Radar" },
              { id: "historical", label: "Historical ERA5" },
              { id: "locations", label: "Multi-City" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeSection === tab.id}
                onClick={() => setActiveSection(tab.id as DashboardSection)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  activeSection === tab.id
                    ? "bg-accent-500 text-atmos-950 font-bold shadow-md"
                    : "text-text-secondary hover:text-text-primary hover:bg-atmos-700/30"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="font-bold">Forecast Notice:</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setRefreshCount((c) => c + 1)}
              className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-400 transition-colors shrink-0 shadow-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !weatherBundle && <WeatherSkeleton />}

        {/* Active Weather Content */}
        {weatherBundle && (
          <div className="space-y-8">
            {/* Section 1: Overview & Hero Conditions */}
            {(activeSection === "all" || activeSection === "overview") && (
              <section
                id="section-overview"
                aria-label="Current conditions and forecast"
                className="space-y-6"
              >
                <CurrentConditions
                  bundle={weatherBundle}
                  units={units}
                  onToggleUnits={handleToggleUnits}
                />

                <HourlyForecastComponent
                  hourly={weatherBundle.hourly}
                  timezone={selectedLocation.timezone || "auto"}
                  units={units}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <DailyForecastComponent
                    daily={weatherBundle.daily}
                    timezone={selectedLocation.timezone || "auto"}
                    units={units}
                  />

                  <WeatherMetricsComponent
                    bundle={weatherBundle}
                    units={units}
                  />
                </div>
              </section>
            )}

            {/* Section 2: Interactive Meteorological Charts */}
            {(activeSection === "all" || activeSection === "charts") && (
              <section
                id="section-charts"
                aria-label="Interactive weather charts"
                className="glass rounded-3xl p-5 sm:p-7 border border-atmos-700/30"
              >
                <WeatherChartsContainer
                  hourly={weatherBundle.hourly}
                  daily={weatherBundle.daily}
                  units={units}
                  timezone={selectedLocation.timezone || "auto"}
                />
              </section>
            )}

            {/* Section 3: 2D Interactive Radar & Weather Map */}
            {(activeSection === "all" || activeSection === "map") && (
              <section
                id="section-map"
                aria-label="Interactive weather map"
                className="glass rounded-3xl p-5 sm:p-7 border border-atmos-700/30"
              >
                <WeatherMap2D
                  location={selectedLocation}
                  onSelectLocation={handleMapSelect}
                  currentTemp={weatherBundle.current.temperature}
                  tempUnit={units === "imperial" ? "°F" : "°C"}
                  conditionText={weatherBundle.current.conditionText}
                />
              </section>
            )}

            {/* Section 4: Historical Reanalysis Explorer */}
            {(activeSection === "all" || activeSection === "historical") && (
              <section
                id="section-historical"
                aria-label="Historical reanalysis explorer"
                className="glass rounded-3xl p-5 sm:p-7 border border-atmos-700/30"
              >
                <HistoricalExplorer
                  latitude={selectedLocation.latitude}
                  longitude={selectedLocation.longitude}
                  locationName={selectedLocation.name}
                  units={units}
                  timezone={selectedLocation.timezone || "auto"}
                />
              </section>
            )}

            {/* Section 5: Saved Locations Multi-City Overview */}
            {(activeSection === "all" || activeSection === "locations") && (
              <section
                id="section-locations"
                aria-label="Saved locations overview"
                className="glass rounded-3xl p-5 sm:p-7 border border-atmos-700/30"
              >
                <SavedLocationsOverview
                  currentLocation={selectedLocation}
                  onSelectLocation={(loc) => setSelectedLocation(loc)}
                  units={units}
                />
              </section>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-atmos-700/20 py-6 px-4 text-center text-xs font-mono text-text-muted">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>ATMOS · Premium Global Weather Intelligence</span>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hover:text-text-primary transition-colors"
            >
              Planetary Globe
            </Link>
            <Link
              href="/account"
              className="hover:text-text-primary transition-colors"
            >
              Account Settings
            </Link>
            <span>Open-Meteo & ECMWF ERA5</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
