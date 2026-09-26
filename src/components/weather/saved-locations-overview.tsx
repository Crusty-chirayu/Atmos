"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { GeocodingLocation } from "@/lib/geocoding/domain/types";
import { WeatherBundle, WMO_CODE_MAP } from "@/lib/weather/domain/weather";
import { WeatherIcon } from "./weather-icon";
import { formatLocalTime } from "@/lib/weather/utils/date-format";
import { formatTemperature } from "@/lib/weather/domain/units";
import { FEATURED_CITIES } from "@/lib/globe/coordinates";
import Link from "next/link";

export interface SavedLocationsOverviewProps {
  currentLocation: GeocodingLocation;
  onSelectLocation: (loc: GeocodingLocation) => void;
  units: "metric" | "imperial";
}

interface SavedLocationItem {
  id: string;
  name: string;
  country?: string;
  country_code?: string;
  admin_area?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  label?: string;
}

interface LocationWeatherState {
  bundle?: WeatherBundle;
  error?: string;
  isLoading: boolean;
}

export function SavedLocationsOverview({
  currentLocation,
  onSelectLocation,
  units,
}: SavedLocationsOverviewProps) {
  const { user } = useAuth();
  const [savedLocations, setSavedLocations] = useState<SavedLocationItem[]>([]);
  const [weatherMap, setWeatherMap] = useState<
    Record<string, LocationWeatherState>
  >({});
  const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(() =>
    Boolean(user)
  );
  const [isSavingCurrent, setIsSavingCurrent] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const tempUnit = units === "imperial" ? "fahrenheit" : "celsius";

  // Reload saved locations callback for manual refresh after mutation
  const loadSavedLocations = useCallback(async () => {
    if (!user) {
      setSavedLocations([]);
      setIsLoadingLocations(false);
      return;
    }
    try {
      const res = await fetch("/api/user/locations");
      if (res.ok) {
        const json = (await res.json()) as { locations: SavedLocationItem[] };
        setSavedLocations(json.locations || []);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoadingLocations(false);
    }
  }, [user]);

  // Load saved locations for authenticated users without synchronous setState in effect body
  useEffect(() => {
    let ignore = false;
    if (!user) {
      return;
    }
    fetch("/api/user/locations")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!ignore && json?.locations) {
          setSavedLocations(json.locations);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setIsLoadingLocations(false);
      });

    return () => {
      ignore = true;
    };
  }, [user]);

  // Fetch batch weather for display items
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadBatchWeather() {
      // If user is authenticated and has saved locations, query them
      // Otherwise, query featured metropolises
      const targetItems =
        user && savedLocations.length > 0
          ? savedLocations.slice(0, 10).map((loc) => ({
              id: loc.id,
              name: loc.name,
              latitude: loc.latitude,
              longitude: loc.longitude,
              country: loc.country,
              countryCode: loc.country_code,
              adminArea: loc.admin_area,
              timezone: loc.timezone,
            }))
          : FEATURED_CITIES.slice(0, 6).map((city) => ({
              id: city.name,
              name: city.name,
              latitude: city.latitude,
              longitude: city.longitude,
              country: city.country,
              timezone: city.timezone || "auto",
            }));

      if (targetItems.length === 0) return;

      try {
        const res = await fetch("/api/weather/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locations: targetItems,
            units,
          }),
          signal: controller.signal,
        });

        if (res.ok) {
          const json = (await res.json()) as {
            items: Array<{
              id?: string;
              bundle?: WeatherBundle;
              error?: string;
            }>;
          };

          if (!ignore) {
            const nextMap: Record<string, LocationWeatherState> = {};
            for (const item of json.items) {
              const key = item.id || "";
              if (key) {
                nextMap[key] = {
                  bundle: item.bundle,
                  error: item.error,
                  isLoading: false,
                };
              }
            }
            setWeatherMap(nextMap);
          }
        }
      } catch {
        // Fallback: silently ignore abort or network interruption
      }
    }

    loadBatchWeather();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [user, savedLocations, units]);

  // Check if current location is already saved
  const isCurrentSaved = savedLocations.some(
    (loc) =>
      Math.abs(loc.latitude - currentLocation.latitude) < 0.001 &&
      Math.abs(loc.longitude - currentLocation.longitude) < 0.001
  );

  // Quick save current location
  const handleSaveCurrent = async () => {
    if (!user) return;
    setIsSavingCurrent(true);
    setActionError(null);
    try {
      const res = await fetch("/api/user/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentLocation.name,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          country: currentLocation.country,
          countryCode: currentLocation.countryCode,
          adminArea: currentLocation.adminArea,
          timezone: currentLocation.timezone,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(data.error?.message || "Failed to save location");
      }

      await loadSavedLocations();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Unable to save location"
      );
    } finally {
      setIsSavingCurrent(false);
    }
  };

  // Remove saved location
  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/user/locations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSavedLocations((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      // Ignored
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header and Quick Add */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#222222]">
            {user ? "Saved Locations Overview" : "Explore Featured Cities"}
          </h3>
          <p className="text-xs text-[#6B7280]">
            {user
              ? "Live conditions for your bookmarked locations"
              : "Explore live conditions across major global cities"}
          </p>
        </div>

        {user && !isCurrentSaved && (
          <button
            type="button"
            onClick={handleSaveCurrent}
            disabled={isSavingCurrent}
            className="px-3.5 py-1.5 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>+ Bookmark {currentLocation.name}</span>
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-3 rounded-md bg-[#FFF5F5] border border-[#FED7D7] text-[#D94841] text-xs">
          {actionError}
        </div>
      )}

      {/* Authenticated with Saved Locations Grid */}
      {user && savedLocations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {savedLocations.map((loc) => {
            const state = weatherMap[loc.id];
            const current = state?.bundle?.current;
            const isSelected =
              Math.abs(loc.latitude - currentLocation.latitude) < 0.001 &&
              Math.abs(loc.longitude - currentLocation.longitude) < 0.001;

            return (
              <div
                key={loc.id}
                onClick={() =>
                  onSelectLocation({
                    id: loc.id,
                    providerId: "open-meteo",
                    name: loc.name,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    country: loc.country,
                    countryCode: loc.country_code,
                    adminArea: loc.admin_area,
                    timezone: loc.timezone,
                    formattedAddress: `${loc.name}${loc.country ? `, ${loc.country}` : ""}`,
                  })
                }
                className={`p-4 rounded-lg flex items-center justify-between gap-3 transition-colors cursor-pointer shadow-xs ${
                  isSelected
                    ? "bg-[#FFF9E6] border border-[#FFC928]"
                    : "bg-white border border-[#E5E7EB] hover:bg-[#F7F7F7]"
                }`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-[#222222] truncate">
                      {loc.name}
                    </span>
                    {loc.label && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                        {loc.label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#6B7280] truncate">
                    {loc.country || loc.admin_area || "Earth"}
                  </span>
                  {loc.timezone && (
                    <span className="text-xs text-[#6B7280] tabular-nums">
                      {formatLocalTime(new Date().toISOString(), loc.timezone)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {current ? (
                    <div className="flex items-center gap-2 text-right">
                      <WeatherIcon
                        category={
                          WMO_CODE_MAP[current.weatherCode]?.category ?? "clear"
                        }
                        isDay={current.isDay ?? true}
                        className="w-7 h-7"
                      />
                      <div className="flex flex-col">
                        <span className="text-base font-bold tabular-nums text-[#222222]">
                          {formatTemperature(current.temperature, tempUnit)}
                        </span>
                        <span className="text-xs text-[#6B7280] truncate max-w-[80px]">
                          {current.conditionText}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-[#6B7280] animate-pulse">
                      Loading...
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleRemove(e, loc.id)}
                    aria-label={`Remove ${loc.name} from saved`}
                    title="Remove from saved"
                    className="p-1.5 text-[#9CA3AF] hover:text-[#D94841] rounded-md hover:bg-[#FFF5F5] transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Authenticated Empty State */}
      {user && savedLocations.length === 0 && !isLoadingLocations && (
        <div className="p-8 rounded-lg bg-[#F7F7F7] border border-dashed border-[#E5E7EB] flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center text-xl">
            📍
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#222222]">
              No Saved Locations Yet
            </h4>
            <p className="text-xs text-[#6B7280] mt-1 max-w-sm">
              Bookmark cities you monitor frequently to view instant weather
              cards and switch between them seamlessly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveCurrent}
            disabled={isSavingCurrent}
            className="px-4 py-2 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] font-semibold text-xs transition-colors shadow-xs"
          >
            Bookmark Current Location ({currentLocation.name})
          </button>
        </div>
      )}

      {/* Anonymous Visitors Quick Explore Grid */}
      {!user && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURED_CITIES.slice(0, 6).map((city) => {
              const state = weatherMap[city.name];
              const current = state?.bundle?.current;
              const isSelected =
                Math.abs(city.latitude - currentLocation.latitude) < 0.01 &&
                Math.abs(city.longitude - currentLocation.longitude) < 0.01;

              return (
                <div
                  key={city.name}
                  onClick={() =>
                    onSelectLocation({
                      id: `featured:${city.name}`,
                      providerId: "open-meteo",
                      name: city.name,
                      latitude: city.latitude,
                      longitude: city.longitude,
                      country: city.country,
                      formattedAddress: `${city.name}, ${city.country}`,
                    })
                  }
                  className={`p-4 rounded-lg flex items-center justify-between gap-3 transition-colors cursor-pointer shadow-xs ${
                    isSelected
                      ? "bg-[#FFF9E6] border border-[#FFC928]"
                      : "bg-white border border-[#E5E7EB] hover:bg-[#F7F7F7]"
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold text-sm text-[#222222] truncate">
                      {city.name}
                    </span>
                    <span className="text-xs text-[#6B7280] truncate">
                      {city.country}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-right shrink-0">
                    {current ? (
                      <>
                        <WeatherIcon
                          category={
                            WMO_CODE_MAP[current.weatherCode]?.category ??
                            "clear"
                          }
                          isDay={current.isDay ?? true}
                          className="w-7 h-7"
                        />
                        <div className="flex flex-col">
                          <span className="text-base font-bold tabular-nums text-[#222222]">
                            {formatTemperature(current.temperature, tempUnit)}
                          </span>
                          <span className="text-xs text-[#6B7280] truncate max-w-[80px]">
                            {current.conditionText}
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-[#6B7280] animate-pulse">
                        Loading...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Anonymous Sign-in Invitation Banner */}
          <div className="p-4 rounded-lg bg-[#F7F7F7] border border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-[#222222] block">
                Want to save custom locations?
              </span>
              <span className="text-xs text-[#6B7280]">
                Create a free ATMOS account to save your favorite cities and
                synchronize display units across devices.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] font-semibold text-xs transition-colors shadow-xs"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-3.5 py-1.5 rounded-md bg-white hover:bg-[#E5E7EB] border border-[#E5E7EB] text-xs font-medium text-[#222222] transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
