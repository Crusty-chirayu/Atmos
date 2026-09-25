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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-atmos-700/30 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-display font-bold text-text-primary">
            {user ? "Saved Locations Overview" : "Global Quick Explore"}
          </h3>
          <p className="text-xs text-text-muted">
            {user
              ? "Live conditions for your bookmarked planetary locations"
              : "Explore live conditions across featured metropolises"}
          </p>
        </div>

        {user && !isCurrentSaved && (
          <button
            type="button"
            onClick={handleSaveCurrent}
            disabled={isSavingCurrent}
            className="px-3 py-1.5 rounded-xl bg-accent-500/20 text-accent-400 border border-accent-500/40 text-xs font-semibold hover:bg-accent-500/30 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>+ Bookmark {currentLocation.name}</span>
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
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
                className={`p-4 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? "glass border-accent-400/60 shadow-lg ring-1 ring-accent-400/40"
                    : "glass hover:bg-atmos-800/50"
                }`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-text-primary truncate">
                      {loc.name}
                    </span>
                    {loc.label && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent-500/10 text-accent-400 border border-accent-500/20">
                        {loc.label}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-muted truncate">
                    {loc.country || loc.admin_area || "Earth"}
                  </span>
                  {loc.timezone && (
                    <span className="text-[10px] font-mono text-text-muted">
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
                        <span className="text-base font-bold font-mono text-text-primary">
                          {formatTemperature(current.temperature, tempUnit)}
                        </span>
                        <span className="text-[10px] text-text-muted truncate max-w-[80px]">
                          {current.conditionText}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-text-muted animate-pulse">
                      Loading...
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleRemove(e, loc.id)}
                    aria-label={`Remove ${loc.name} from saved`}
                    title="Remove from saved"
                    className="p-1.5 text-text-muted hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
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
        <div className="p-8 rounded-3xl glass border border-dashed border-atmos-700/50 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent-500/10 text-accent-400 flex items-center justify-center text-xl">
            📍
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              No Saved Locations Yet
            </h4>
            <p className="text-xs text-text-muted mt-1 max-w-sm">
              Bookmark cities you monitor frequently to view instant telemetry
              cards and switch between them seamlessly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveCurrent}
            disabled={isSavingCurrent}
            className="px-4 py-2 rounded-xl bg-accent-500 text-atmos-950 font-bold text-xs hover:bg-accent-400 transition-colors shadow-sm"
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
                  className={`p-4 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? "glass border-accent-400/60 shadow-lg ring-1 ring-accent-400/40"
                      : "glass hover:bg-atmos-800/50"
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold text-sm text-text-primary truncate">
                      {city.name}
                    </span>
                    <span className="text-xs text-text-muted truncate">
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
                          <span className="text-base font-bold font-mono text-text-primary">
                            {formatTemperature(current.temperature, tempUnit)}
                          </span>
                          <span className="text-[10px] text-text-muted truncate max-w-[80px]">
                            {current.conditionText}
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs font-mono text-text-muted animate-pulse">
                        Loading...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Anonymous Sign-in Invitation Banner */}
          <div className="p-4 rounded-2xl glass border border-accent-500/20 bg-accent-500/5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-text-primary block">
                Want to save custom locations?
              </span>
              <span className="text-xs text-text-muted">
                Create a free ATMOS account to save your favorite cities and
                synchronize display units across sessions.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-xl bg-accent-500 text-atmos-950 font-bold text-xs hover:bg-accent-400 transition-colors shadow-sm"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 rounded-xl glass text-xs text-text-primary hover:bg-atmos-700/40 transition-colors"
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
