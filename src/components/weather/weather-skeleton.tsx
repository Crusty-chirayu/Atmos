import React from "react";

/**
 * Cinematic glass skeleton loader for ATMOS weather dashboard.
 * Mirrors the exact layout geometry to guarantee Cumulative Layout Shift (CLS) = 0.
 * Respects prefers-reduced-motion.
 */
export function WeatherSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading weather intelligence data..."
      className="w-full max-w-5xl mx-auto space-y-6 animate-pulse"
    >
      <span className="sr-only">Loading weather forecast data...</span>

      {/* Hero Current Conditions Card Skeleton */}
      <div
        className="glass rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between gap-6"
        style={{
          background: "var(--surface-overlay)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="space-y-4 max-w-md">
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-atmos-700/60 rounded" />
            <div className="h-4 w-28 bg-atmos-700/60 rounded" />
          </div>
          <div className="h-9 w-56 bg-atmos-700/80 rounded-lg" />
          <div className="flex items-baseline gap-4 pt-2">
            <div className="h-16 w-32 bg-atmos-700/90 rounded-xl" />
            <div className="h-6 w-24 bg-atmos-700/60 rounded" />
          </div>
          <div className="h-4 w-40 bg-atmos-700/50 rounded" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:w-96">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-2xl bg-atmos-800/40 border border-atmos-700/20 space-y-2"
            >
              <div className="h-3 w-14 bg-atmos-700/50 rounded" />
              <div className="h-5 w-16 bg-atmos-700/80 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Strip Skeleton */}
      <div
        className="glass rounded-3xl p-5 space-y-3"
        style={{
          background: "var(--surface-overlay)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="h-4 w-32 bg-atmos-700/70 rounded" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-20 p-3 rounded-2xl bg-atmos-800/40 border border-atmos-700/20 flex flex-col items-center space-y-3"
            >
              <div className="h-3 w-10 bg-atmos-700/50 rounded" />
              <div className="w-8 h-8 rounded-full bg-atmos-700/70" />
              <div className="h-4 w-8 bg-atmos-700/80 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Daily Forecast Skeleton */}
      <div
        className="glass rounded-3xl p-5 space-y-3"
        style={{
          background: "var(--surface-overlay)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="h-4 w-36 bg-atmos-700/70 rounded mb-4" />
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-atmos-800/30 border border-atmos-700/10 flex items-center justify-between"
            >
              <div className="h-4 w-20 bg-atmos-700/60 rounded" />
              <div className="w-6 h-6 rounded-full bg-atmos-700/70" />
              <div className="h-4 w-28 bg-atmos-700/60 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
