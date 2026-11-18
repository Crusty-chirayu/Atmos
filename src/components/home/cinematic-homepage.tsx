"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
import { DeveloperFooter } from "@/components/common/developer-credit";
import {
  reverseGeocodeCoordinates,
  formatCoordinateLabel,
} from "@/lib/geocoding/reverse";
import { useCurrentLocation } from "@/lib/location/location-context";

export function CinematicHomepage() {
  const { activeLocation, setActiveLocation } = useCurrentLocation();
  const selectedLocation = activeLocation;
  const [weatherBundle, setWeatherBundle] = useState<WeatherBundle | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [viewMode, setViewMode] = useState<HomeViewMode>("overview");
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const { latitude, longitude } = selectedLocation;

  // Fetch weather data whenever coordinates or units change
  useEffect(() => {
    let isSubscribed = true;
    const controller = new AbortController();

    async function loadWeather() {
      try {
        const params = new URLSearchParams({
          lat: latitude.toString(),
          lon: longitude.toString(),
          units,
          timezone: "auto",
        });

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
        const errorObj = err as Error;
        // Ignore any abort signals resulting from rapid user navigation or re-renders
        if (
          errorObj.name === "AbortError" ||
          errorObj.message?.toLowerCase().includes("abort")
        ) {
          return;
        }
        if (isSubscribed) {
          setError(
            errorObj.message ||
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
  }, [latitude, longitude, units, refreshKey]);

  // Derive effective weather bundle overlaid with any asynchronous geocoding name updates
  const effectiveWeatherBundle = useMemo(() => {
    if (!weatherBundle) return null;
    if (
      selectedLocation.name &&
      weatherBundle.location.name !== selectedLocation.name
    ) {
      return {
        ...weatherBundle,
        location: {
          ...weatherBundle.location,
          name: selectedLocation.name,
          country: selectedLocation.country || weatherBundle.location.country,
          countryCode:
            selectedLocation.countryCode || weatherBundle.location.countryCode,
          adminArea:
            selectedLocation.adminArea || weatherBundle.location.adminArea,
        },
      };
    }
    return weatherBundle;
  }, [weatherBundle, selectedLocation]);

  // Handle location selected from search combobox
  const handleSelectLocation = (location: GeocodingLocation) => {
    setIsLoading(true);
    setError(null);
    setActiveLocation(location);
  };

  // Handle city selected from 3D globe or quick-explore chips
  const handleSelectFeaturedCity = (city: FeaturedCity) => {
    setIsLoading(true);
    setError(null);
    setActiveLocation({
      id: `featured-${city.name.toLowerCase().replace(/\s+/g, "-")}`,
      providerId: `featured:${city.name}`,
      formattedAddress: `${city.name}${city.country ? `, ${city.country}` : ""}`,
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      country: city.country,
      countryCode: city.countryCode,
      adminArea: city.adminArea,
      timezone: city.timezone || "auto",
    });
  };

  // Handle arbitrary coordinate clicked anywhere on Earth
  const handleSelectCoordinates = (coords: {
    latitude: number;
    longitude: number;
  }) => {
    setIsLoading(true);
    setError(null);
    const coordLabel = formatCoordinateLabel(coords.latitude, coords.longitude);

    // Immediately update activeLocation so weather fetching starts without waiting for reverse-geocoding
    setActiveLocation({
      id: `coord-${coords.latitude.toFixed(4)}-${coords.longitude.toFixed(4)}`,
      providerId: `coord:${coords.latitude}:${coords.longitude}`,
      formattedAddress: coordLabel,
      name: coordLabel,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timezone: "auto",
    });

    // Asynchronously resolve locality/maritime name if available
    reverseGeocodeCoordinates(coords.latitude, coords.longitude).then((geo) => {
      if (geo && geo.name && geo.name !== coordLabel) {
        setActiveLocation({
          id: `coord-${coords.latitude.toFixed(4)}-${coords.longitude.toFixed(4)}`,
          providerId: "reverse-geocode",
          formattedAddress: `${geo.name}${geo.country ? `, ${geo.country}` : ""}`,
          name: geo.name,
          latitude: coords.latitude,
          longitude: coords.longitude,
          country: geo.country,
          countryCode: geo.countryCode,
          adminArea: geo.adminArea,
          timezone: "auto",
        });
      }
    });
  };

  const handleToggleUnits = () => {
    setIsLoading(true);
    setUnits((prev) => (prev === "metric" ? "imperial" : "metric"));
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  };

  return (
    <AtmosphericScene
      weatherCode={weatherBundle?.current.weatherCode ?? 0}
      isDay={effectiveWeatherBundle?.current.isDay ?? true}
      className="min-h-screen flex flex-col bg-white text-[#222222]"
    >
      {/* Navigation Header */}
      <HomeNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        units={units}
        onToggleUnits={handleToggleUnits}
      />

      <main id="main-content" className="flex-1 flex flex-col pb-16">
        {/* Clean Hero Search */}
        <HeroSection
          selectedLocation={selectedLocation}
          weatherBundle={effectiveWeatherBundle}
          isLoadingWeather={isLoading}
          onSelectLocation={handleSelectLocation}
          onSelectFeaturedCity={handleSelectFeaturedCity}
        />

        {/* Global Error Banner */}
        {error && (
          <div role="alert" className="w-full max-w-4xl mx-auto px-4 my-4">
            <div className="p-4 rounded-md bg-[#FFF5F5] border border-[#FED7D7] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-[#D94841] shrink-0"
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
                <span className="text-sm font-medium text-[#222222]">
                  {error}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#D94841] text-white hover:bg-[#C62828] transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* View Mode: OVERVIEW (Clean Split: Globe + Weather Dashboard) */}
        {viewMode === "overview" && (
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col gap-6 mt-4">
            {/* Top Split Row: 3D Interactive Globe + Current Conditions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Interactive 3D Earth Globe */}
              <div className="lg:col-span-6 flex flex-col rounded-lg bg-white p-4 sm:p-5 border border-[#E5E7EB] min-h-[380px] sm:min-h-[440px] relative overflow-hidden shadow-xs">
                <div className="flex items-center justify-between mb-2 z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FFC928]" />
                    <h2 className="text-xs font-semibold text-[#222222]">
                      Interactive Globe
                    </h2>
                  </div>
                  <span className="text-xs text-[#6B7280]">
                    Drag to rotate · Click anywhere on Earth
                  </span>
                </div>

                <div className="flex-1 w-full h-full min-h-[320px] flex items-center justify-center">
                  <InteractiveGlobe
                    selectedLocation={selectedLocation}
                    onSelectCity={handleSelectFeaturedCity}
                    onSelectCoordinates={handleSelectCoordinates}
                  />
                </div>
              </div>

              {/* Right Column: Current Weather Conditions */}
              <div className="lg:col-span-6 flex flex-col justify-between">
                {isLoading && !effectiveWeatherBundle ? (
                  <WeatherSkeleton />
                ) : effectiveWeatherBundle ? (
                  <div className="flex flex-col gap-6 h-full justify-between">
                    <CurrentConditions
                      bundle={effectiveWeatherBundle}
                      units={units}
                      onToggleUnits={handleToggleUnits}
                    />
                    <HourlyForecast
                      hourly={effectiveWeatherBundle.hourly}
                      timezone={effectiveWeatherBundle.meta.timezone}
                      units={units}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Bottom Row: 7-Day Outlook & Weather Details */}
            {effectiveWeatherBundle && (
              <>
                <DailyForecast
                  daily={effectiveWeatherBundle.daily}
                  timezone={effectiveWeatherBundle.meta.timezone}
                  units={units}
                />
                <WeatherMetrics bundle={effectiveWeatherBundle} units={units} />
              </>
            )}
          </div>
        )}

        {/* View Mode: GLOBE ONLY */}
        {viewMode === "globe" && (
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col gap-6 mt-4">
            <div className="w-full h-[550px] sm:h-[620px] rounded-lg bg-white p-5 border border-[#E5E7EB] relative overflow-hidden shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4 z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFC928]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#222222]">
                    Global Weather Globe
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#6B7280]">
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
                  onSelectCoordinates={handleSelectCoordinates}
                />
              </div>

              {/* City quick-select bar inside globe mode */}
              <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2 z-10">
                <span className="text-xs text-[#6B7280] font-medium">
                  Select city:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {FEATURED_CITIES.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleSelectFeaturedCity(city)}
                      className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                        selectedLocation.name === city.name
                          ? "bg-[#FFC928] text-[#222222] font-semibold border border-[#F2B900]"
                          : "bg-[#F7F7F7] text-[#6B7280] hover:text-[#222222] border border-[#E5E7EB]"
                      }`}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Compact Weather Summary Card beneath expanded globe */}
            {effectiveWeatherBundle && (
              <div className="w-full">
                <HourlyForecast
                  hourly={effectiveWeatherBundle.hourly}
                  timezone={effectiveWeatherBundle.meta.timezone}
                  units={units}
                />
              </div>
            )}
          </div>
        )}

        {/* View Mode: DASHBOARD ONLY (Full In-Depth Details) */}
        {viewMode === "dashboard" && (
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col gap-6 mt-4">
            {isLoading && !effectiveWeatherBundle ? (
              <WeatherSkeleton />
            ) : effectiveWeatherBundle ? (
              <>
                <div className="p-4 rounded-md bg-[#F7F7F7] border border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-[#222222]">
                      Want comprehensive radar maps and historical data?
                    </span>
                    <span className="text-xs text-[#6B7280]">
                      Open the full dashboard for interactive radar maps,
                      high-resolution charts, and ERA5 reanalysis.
                    </span>
                  </div>
                  <Link
                    href="/dashboard"
                    className="px-3.5 py-2 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] font-semibold text-xs transition-colors shrink-0 shadow-xs"
                  >
                    Open Full Dashboard →
                  </Link>
                </div>

                <CurrentConditions
                  bundle={effectiveWeatherBundle}
                  units={units}
                  onToggleUnits={handleToggleUnits}
                />
                <HourlyForecast
                  hourly={effectiveWeatherBundle.hourly}
                  timezone={effectiveWeatherBundle.meta.timezone}
                  units={units}
                />
                <DailyForecast
                  daily={effectiveWeatherBundle.daily}
                  timezone={effectiveWeatherBundle.meta.timezone}
                  units={units}
                />
                <WeatherMetrics bundle={effectiveWeatherBundle} units={units} />
              </>
            ) : null}
          </div>
        )}

        {/* Data Provenance & Developer Credit Footer */}
        {effectiveWeatherBundle && (
          <footer className="w-full max-w-5xl mx-auto px-4 mt-12 text-center text-xs space-y-2 text-[#626B78]">
            <p>
              Weather Data: Open-Meteo Meteorological Engine (CC-BY 4.0) ·
              Updated:{" "}
              {new Date(
                effectiveWeatherBundle.meta.fetchedAt
              ).toLocaleTimeString()}{" "}
              ({selectedLocation.name})
            </p>
            <div className="pt-2 border-t border-[#E5E7EB]">
              <DeveloperFooter />
            </div>
          </footer>
        )}
      </main>
    </AtmosphericScene>
  );
}
