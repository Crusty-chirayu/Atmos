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
  className?: string;
  reason?: string;
}

export function GlobeFallback({
  selectedLocation,
  onSelectCity,
  className = "",
  reason,
}: GlobeFallbackProps) {
  return (
    <div
      className={`relative w-full h-full min-h-[340px] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden ${className}`}
      role="region"
      aria-label={`Interactive 2.5D Weather Planet displaying ${selectedLocation.name || "selected coordinates"}`}
    >
      {/* Planetary Outer Aura */}
      <div
        className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full flex items-center justify-center transition-all duration-700"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #0e1e38 0%, #081224 60%, #040814 100%)",
          boxShadow:
            "inset -16px -16px 40px rgba(0,0,0,0.8), inset 8px 8px 24px rgba(0, 212, 255, 0.25), 0 0 48px rgba(0, 212, 255, 0.15)",
          border: "1px solid rgba(0, 212, 255, 0.2)",
        }}
      >
        {/* Graticule Grid Overlay */}
        <svg
          className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
          viewBox="0 0 100 100"
        >
          {/* Latitude lines */}
          <ellipse
            cx="50"
            cy="50"
            rx="46"
            ry="46"
            fill="none"
            stroke="#00d4ff"
            strokeWidth="0.5"
          />
          <ellipse
            cx="50"
            cy="50"
            rx="46"
            ry="32"
            fill="none"
            stroke="#00d4ff"
            strokeWidth="0.4"
          />
          <ellipse
            cx="50"
            cy="50"
            rx="46"
            ry="16"
            fill="none"
            stroke="#00d4ff"
            strokeWidth="0.4"
          />
          <line
            x1="4"
            y1="50"
            x2="96"
            y2="50"
            stroke="#00d4ff"
            strokeWidth="0.7"
            strokeDasharray="2,2"
          />
          {/* Longitude lines */}
          <ellipse
            cx="50"
            cy="50"
            rx="16"
            ry="46"
            fill="none"
            stroke="#00d4ff"
            strokeWidth="0.4"
          />
          <ellipse
            cx="50"
            cy="50"
            rx="32"
            ry="46"
            fill="none"
            stroke="#00d4ff"
            strokeWidth="0.4"
          />
          <line
            x1="50"
            y1="4"
            x2="50"
            y2="96"
            stroke="#00d4ff"
            strokeWidth="0.5"
          />
        </svg>

        {/* Selected Location Center Beacon */}
        <div className="relative flex items-center justify-center z-10">
          <span
            aria-hidden="true"
            className="w-4 h-4 rounded-full bg-accent-500 animate-ping absolute"
            style={{ opacity: 0.6 }}
          />
          <span
            aria-hidden="true"
            className="w-3 h-3 rounded-full bg-accent-400 relative border border-white shadow-lg"
          />
        </div>

        {/* Atmospheric Glow Rim */}
        <div
          className="absolute -inset-2 rounded-full pointer-events-none opacity-40 blur-md"
          style={{
            background:
              "radial-gradient(circle, transparent 65%, rgba(0, 212, 255, 0.4) 100%)",
          }}
        />
      </div>

      {/* Selected Location Telemetry Info */}
      <div className="mt-4 flex flex-col items-center gap-1 z-10">
        <div className="flex items-center gap-2">
          <span
            className="font-display font-bold text-base sm:text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            {selectedLocation.name || "Target Vector"}
          </span>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-mono"
            style={{
              background: "rgb(0 212 255 / 0.12)",
              color: "var(--color-accent-400)",
              border: "1px solid rgb(0 212 255 / 0.25)",
            }}
          >
            {selectedLocation.latitude >= 0 ? "N" : "S"},{" "}
            {selectedLocation.longitude >= 0 ? "E" : "W"}
          </span>
        </div>
        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          {selectedLocation.latitude.toFixed(3)}°,{" "}
          {selectedLocation.longitude.toFixed(3)}°
        </p>
      </div>

      {/* Quick Explore City Chips */}
      {onSelectCity && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 max-w-sm">
          {FEATURED_CITIES.slice(0, 6).map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => onSelectCity(city)}
              className="px-2.5 py-1 rounded-full text-xs font-mono hover:bg-atmos-700/50 transition-colors"
              style={{
                background: "var(--surface-raised)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {city.name}
            </button>
          ))}
        </div>
      )}

      {/* Optional fallback notice */}
      {reason && (
        <span
          className="mt-3 text-[11px] font-mono"
          style={{ color: "var(--text-muted)" }}
        >
          {reason}
        </span>
      )}
    </div>
  );
}
