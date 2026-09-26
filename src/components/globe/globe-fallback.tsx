"use client";

import React from "react";
import { FEATURED_CITIES, FeaturedCity } from "@/lib/globe/coordinates";

export interface GlobeFallbackProps {
  selectedLocation: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  onSelectCity?: (city: FeaturedCity) => void;
  onSelectCoordinates?: (coords: { latitude: number; longitude: number }) => void;
  className?: string;
  reason?: string;
}

export function GlobeFallback({
  selectedLocation,
  onSelectCity,
  onSelectCoordinates,
  className = "",
  reason,
}: GlobeFallbackProps) {
  return (
    <div
      className={`relative w-full h-full min-h-[340px] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden ${className}`}
      role="region"
      aria-label={`Weather globe representation for ${selectedLocation.name || "selected coordinates"}`}
    >
      {/* Clean Planetary Sphere */}
      <div
        className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #5B9FEA 0%, #3B7DC8 60%, #235A9E 100%)",
          border: "2px solid #E5E7EB",
        }}
        onClick={(e) => {
          if (!onSelectCoordinates) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const relY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
          if (relX * relX + relY * relY <= 1) {
            const lat = Number((relY * 90).toFixed(4));
            const lon = Number((relX * 180).toFixed(4));
            onSelectCoordinates({ latitude: lat, longitude: lon });
          }
        }}
      >
        {/* Graticule Grid Lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
          viewBox="0 0 100 100"
        >
          {/* Latitude lines */}
          <ellipse
            cx="50"
            cy="50"
            rx="46"
            ry="46"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.6"
          />
          <ellipse
            cx="50"
            cy="50"
            rx="46"
            ry="32"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.4"
          />
          <ellipse
            cx="50"
            cy="50"
            rx="46"
            ry="16"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.4"
          />
          <line
            x1="4"
            y1="50"
            x2="96"
            y2="50"
            stroke="#FFFFFF"
            strokeWidth="0.6"
            strokeDasharray="2,2"
          />
          {/* Longitude lines */}
          <ellipse
            cx="50"
            cy="50"
            rx="16"
            ry="46"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.4"
          />
          <ellipse
            cx="50"
            cy="50"
            rx="32"
            ry="46"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.4"
          />
          <line
            x1="50"
            y1="4"
            x2="50"
            y2="96"
            stroke="#FFFFFF"
            strokeWidth="0.5"
          />
        </svg>

        {/* Selected Location Center Beacon */}
        <div className="relative flex items-center justify-center z-10">
          <span
            aria-hidden="true"
            className="w-4 h-4 rounded-full bg-[#FFC928] animate-ping absolute opacity-70"
          />
          <span
            aria-hidden="true"
            className="w-3.5 h-3.5 rounded-full bg-[#FFC928] relative border-2 border-white shadow-xs"
          />
        </div>
      </div>

      {/* Selected Location Info */}
      <div className="mt-4 flex flex-col items-center gap-1 z-10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base sm:text-lg text-[#222222]">
            {selectedLocation.name || "Global Coordinates"}
          </span>
          <span className="text-xs text-[#6B7280]">
            [{selectedLocation.latitude.toFixed(1)}°,{" "}
            {selectedLocation.longitude.toFixed(1)}°]
          </span>
        </div>

        {reason ? (
          <p className="text-xs text-[#6B7280] max-w-sm">
            {reason}
          </p>
        ) : (
          <p className="text-xs text-[#6B7280]">
            Use the location search or featured cities below to inspect weather.
          </p>
        )}
      </div>

      {/* City Chips for Direct Navigation */}
      {onSelectCity && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 z-10 max-w-sm">
          {FEATURED_CITIES.slice(0, 5).map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => onSelectCity(city)}
              className="px-2.5 py-1 rounded-md text-xs bg-white hover:bg-[#F7F7F7] border border-[#E5E7EB] text-[#222222] transition-colors shadow-xs"
            >
              {city.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
