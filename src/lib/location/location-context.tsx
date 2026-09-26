"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

import { GeocodingLocation } from "@/lib/geocoding/domain/types";

export type ActiveLocation = GeocodingLocation;

export type SetActiveLocationInput = Partial<GeocodingLocation> & {
  name: string;
  latitude: number;
  longitude: number;
};

interface LocationContextType {
  activeLocation: GeocodingLocation;
  setActiveLocation: (loc: SetActiveLocationInput) => void;
}

const DEFAULT_ACTIVE_LOCATION: GeocodingLocation = {
  id: "open-meteo:1277333",
  providerId: "open-meteo",
  formattedAddress: "Bengaluru, Karnataka, India",
  name: "Bengaluru",
  country: "India",
  countryCode: "IN",
  adminArea: "Karnataka",
  latitude: 12.9716,
  longitude: 77.5946,
  timezone: "Asia/Kolkata",
};

const STORAGE_KEY = "atmos_active_location";

const LocationContext = createContext<LocationContextType | undefined>(
  undefined
);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [activeLocation, setActiveLocationState] = useState<GeocodingLocation>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as GeocodingLocation;
          if (
            parsed &&
            typeof parsed.latitude === "number" &&
            typeof parsed.longitude === "number" &&
            parsed.name
          ) {
            return {
              id: parsed.id || `loc-${parsed.latitude.toFixed(4)}-${parsed.longitude.toFixed(4)}`,
              providerId: parsed.providerId || "custom",
              formattedAddress:
                parsed.formattedAddress ||
                `${parsed.name}${parsed.country ? `, ${parsed.country}` : ""}`,
              name: parsed.name,
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              country: parsed.country,
              countryCode: parsed.countryCode,
              adminArea: parsed.adminArea,
              timezone: parsed.timezone || "auto",
              elevation: parsed.elevation,
            };
          }
        }
      } catch {
        // Fallback to default
      }
    }
    return DEFAULT_ACTIVE_LOCATION;
  });

  const setActiveLocation = useCallback((loc: SetActiveLocationInput) => {
    const completeLoc: GeocodingLocation = {
      id: loc.id || `loc-${loc.latitude.toFixed(4)}-${loc.longitude.toFixed(4)}`,
      providerId: loc.providerId || "custom",
      formattedAddress:
        loc.formattedAddress ||
        `${loc.name}${loc.country ? `, ${loc.country}` : ""}`,
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      country: loc.country,
      countryCode: loc.countryCode,
      adminArea: loc.adminArea,
      timezone: loc.timezone || "auto",
      elevation: loc.elevation,
    };
    setActiveLocationState(completeLoc);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(completeLoc));
      } catch {
        // Storage quota or private mode fallback
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      activeLocation,
      setActiveLocation,
    }),
    [activeLocation, setActiveLocation]
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useCurrentLocation(): LocationContextType {
  const context = useContext(LocationContext);
  if (!context) {
    // Graceful fallback if invoked outside provider
    return {
      activeLocation: DEFAULT_ACTIVE_LOCATION,
      setActiveLocation: () => {},
    };
  }
  return context;
}
