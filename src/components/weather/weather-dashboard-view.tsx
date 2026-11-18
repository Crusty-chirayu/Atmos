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
import { NotificationCenter } from "@/components/notifications/notification-center";
import {
  formatLocalTime,
  formatLocalDate,
} from "@/lib/weather/utils/date-format";
import { useAuth } from "@/lib/auth/auth-context";
import { DeveloperFooter } from "@/components/common/developer-credit";
import { useCurrentLocation } from "@/lib/location/location-context";

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
  const { activeLocation, setActiveLocation } = useCurrentLocation();
  const selectedLocation = activeLocation || initialLocation;

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
      const newLoc: GeocodingLocation = {
        id: `custom:${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`,
        providerId: "map-click",
        name: `Lat ${coords.latitude.toFixed(2)}°, Lon ${coords.longitude.toFixed(2)}°`,
        latitude: coords.latitude,
        longitude: coords.longitude,
        country: undefined,
        countryCode: undefined,
        adminArea: undefined,
        formattedAddress: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      };
      setActiveLocation(newLoc);
    },
    [setActiveLocation]
  );

  const nowIso = new Date().toISOString();
  const locationTz = selectedLocation.timezone || "UTC";

  return (
    <div className="min-h-screen bg-white text-[#222222] flex flex-col antialiased">
      {/* Top Application Header */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-[#E5E7EB] px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Route Links */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 group focus:outline-none"
              aria-label="ATMOS Homepage"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFC928]" />
              <span className="font-bold text-xl sm:text-2xl tracking-tight text-[#222222]">
                ATMOS
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#F7F7F7] text-[#6B7280] border border-[#E5E7EB]">
                Dashboard
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-[#6B7280]">
              <Link
                href="/"
                className="px-2.5 py-1 rounded-md hover:text-[#222222] hover:bg-[#F7F7F7] transition-colors"
              >
                Globe View
              </Link>
              <Link
                href="/ai"
                className="px-2.5 py-1 rounded-md hover:text-[#222222] hover:bg-[#F7F7F7] transition-colors"
              >
                AI Assistant
              </Link>
              <Link
                href="/about"
                className="px-2.5 py-1 rounded-md hover:text-[#222222] hover:bg-[#F7F7F7] transition-colors"
              >
                About
              </Link>
            </nav>
          </div>

          {/* Location Search Bar in Header */}
          <div className="flex-1 max-w-md min-w-[240px]">
            <LocationSearch
              onSelectLocation={(loc: GeocodingLocation) => {
                setActiveLocation(loc);
              }}
              placeholder="Search city, state, or country..."
            />
          </div>

          {/* Action Utilities (Units, Refresh, Notifications, UserMenu) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => setRefreshCount((c) => c + 1)}
              disabled={isLoading}
              aria-label="Refresh weather data"
              title="Refresh forecast data"
              className="p-1.5 rounded-md bg-[#F7F7F7] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-xs text-[#222222] transition-colors"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? "animate-spin text-[#FFC928]" : ""}`}
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
              className="px-2.5 py-1.5 rounded-md bg-[#F7F7F7] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-xs font-semibold text-[#222222] transition-colors"
            >
              {units === "metric" ? "°C" : "°F"}
            </button>

            {/* Weather Alerts Notification Center */}
            <NotificationCenter />

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
          className="flex flex-wrap items-end justify-between gap-4 pb-3 border-b border-[#E5E7EB]"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFC928]" />
              <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight">
                {selectedLocation.name}
              </h1>
              {selectedLocation.country && (
                <span className="text-sm font-medium text-[#6B7280]">
                  ·{" "}
                  {selectedLocation.adminArea
                    ? `${selectedLocation.adminArea}, `
                    : ""}
                  {selectedLocation.country}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#6B7280] mt-1">
              <span>{formatLocalDate(nowIso, locationTz, "long")}</span>
              <span>·</span>
              <span className="font-semibold text-[#222222]">
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

          {/* Section Navigation Tabs */}
          <div
            role="tablist"
            aria-label="Dashboard sections"
            className="p-0.5 rounded-md bg-[#F7F7F7] border border-[#E5E7EB] flex items-center gap-0.5 overflow-x-auto max-w-full"
          >
            {[
              { id: "all", label: "Full Dashboard" },
              { id: "overview", label: "Conditions" },
              { id: "charts", label: "Charts" },
              { id: "map", label: "Radar & Map" },
              { id: "historical", label: "Historical ERA5" },
              { id: "locations", label: "Saved Cities" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeSection === tab.id}
                onClick={() => setActiveSection(tab.id as DashboardSection)}
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
                  activeSection === tab.id
                    ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                    : "text-[#6B7280] hover:text-[#222222]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-md border border-[#FED7D7] bg-[#FFF5F5] text-[#D94841] text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">Notice:</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setRefreshCount((c) => c + 1)}
              className="px-3 py-1.5 rounded-md bg-[#D94841] text-white font-semibold text-xs hover:bg-[#C62828] transition-colors shrink-0 shadow-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !weatherBundle && <WeatherSkeleton />}

        {/* Active Weather Content */}
        {weatherBundle && (
          <div className="space-y-6">
            {/* Section 1: Overview & Conditions */}
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
                className="rounded-lg bg-white border border-[#E5E7EB] shadow-xs p-5 sm:p-7"
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
                className="rounded-lg bg-white border border-[#E5E7EB] shadow-xs p-5 sm:p-7"
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
                className="rounded-lg bg-white border border-[#E5E7EB] shadow-xs p-5 sm:p-7"
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
                className="rounded-lg bg-white border border-[#E5E7EB] shadow-xs p-5 sm:p-7"
              >
                <SavedLocationsOverview
                  currentLocation={selectedLocation}
                  onSelectLocation={(loc) => {
                    setActiveLocation(loc);
                  }}
                  units={units}
                />
              </section>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#E5E7EB] py-6 px-4 text-center text-xs text-[#626B78] space-y-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FFC928]" />
            <span className="font-semibold text-[#222222]">ATMOS</span>
            <span>· Clean Weather Intelligence</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#222222] transition-colors">
              Globe
            </Link>
            <Link href="/ai" className="hover:text-[#222222] transition-colors">
              AI Assistant
            </Link>
            <Link
              href="/account"
              className="hover:text-[#222222] transition-colors"
            >
              Account
            </Link>
            <span>Open-Meteo & ECMWF ERA5</span>
          </div>
        </div>
        <div className="pt-2 border-t border-[#E5E7EB]/60">
          <DeveloperFooter />
        </div>
      </footer>
    </div>
  );
}
