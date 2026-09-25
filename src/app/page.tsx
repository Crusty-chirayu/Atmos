"use client";

import { useState } from "react";
import { LocationSearch } from "@/components/weather/location-search";
import { GeocodingLocation } from "@/lib/geocoding/domain/types";

/**
 * ATMOS — Homepage (M1 Foundation + M2-T2 Location Search)
 *
 * Demonstrates accessible, debounced, provider-backed location search.
 * Full cinematic scene and 3D globe follow in M3.
 */
export default function HomePage() {
  const [selectedLoc, setSelectedLoc] = useState<GeocodingLocation | null>(
    null
  );

  return (
    <div className="bg-atmospheric flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
      {/* Hero wordmark */}
      <h1 className="font-display font-bold tracking-tight mb-3">
        <span
          className="text-gradient"
          style={{ fontSize: "clamp(2.75rem, 8vw, 6rem)", lineHeight: 1 }}
        >
          ATMOS
        </span>
      </h1>

      <p
        className="max-w-lg mx-auto mb-8"
        style={{
          color: "var(--text-secondary)",
          fontSize: "clamp(1rem, 2vw, 1.2rem)",
          lineHeight: 1.6,
        }}
      >
        Global AI-powered weather intelligence.
        <br />
        <span style={{ color: "var(--text-muted)", fontSize: "0.9em" }}>
          Instant, deterministic global search across millions of locations.
        </span>
      </p>

      {/* Reusable Accessible Location Search Bar */}
      <div className="w-full max-w-xl mx-auto mb-8 px-2">
        <LocationSearch
          onSelectLocation={(loc) => {
            setSelectedLoc(loc);
          }}
          placeholder="Search global cities, regions, or coordinates..."
        />
      </div>

      {/* Selected Location Confirmation Card */}
      {selectedLoc && (
        <div
          role="region"
          aria-label="Selected location details"
          className="glass max-w-md w-full mx-auto p-5 rounded-2xl mb-8 text-left transition-all duration-300"
          style={{
            border: "1px solid var(--border-default)",
            background: "var(--surface-overlay)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs uppercase font-mono tracking-wider font-semibold"
              style={{ color: "var(--color-accent-500)" }}
            >
              Selected Location
            </span>
            {selectedLoc.countryCode && (
              <span
                className="px-2 py-0.5 rounded text-xs font-mono"
                style={{
                  background: "var(--surface-raised)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {selectedLoc.countryCode}
              </span>
            )}
          </div>

          <h2
            className="text-lg font-bold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {selectedLoc.name}
          </h2>

          <p
            className="text-sm mt-0.5 mb-3"
            style={{ color: "var(--text-muted)" }}
          >
            {selectedLoc.formattedAddress}
          </p>

          <div
            className="grid grid-cols-2 gap-2 text-xs pt-3 border-t"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div>
              <span style={{ color: "var(--text-muted)" }}>Coordinates:</span>{" "}
              <span
                className="font-mono font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {selectedLoc.latitude.toFixed(4)}°,{" "}
                {selectedLoc.longitude.toFixed(4)}°
              </span>
            </div>
            {selectedLoc.timezone && (
              <div>
                <span style={{ color: "var(--text-muted)" }}>Timezone:</span>{" "}
                <span
                  className="font-mono font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {selectedLoc.timezone}
                </span>
              </div>
            )}
            {selectedLoc.elevation !== undefined && (
              <div>
                <span style={{ color: "var(--text-muted)" }}>Elevation:</span>{" "}
                <span
                  className="font-mono font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {selectedLoc.elevation} m
                </span>
              </div>
            )}
            {selectedLoc.population !== undefined && (
              <div>
                <span style={{ color: "var(--text-muted)" }}>Population:</span>{" "}
                <span
                  className="font-mono font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {selectedLoc.population.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status badge */}
      <div
        className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs"
        style={{ color: "var(--text-secondary)" }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#22d3a4",
            display: "inline-block",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
        M2-T2 Geocoding Core · Next.js 16 · Open-Meteo · Tailwind v4
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="pulse"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
