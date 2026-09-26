import React from "react";

/**
 * Clean consumer skeleton loader for ATMOS weather dashboard.
 * Mirrors exact layout geometry to prevent CLS.
 */
export function WeatherSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading weather forecast..."
      className="w-full max-w-5xl mx-auto space-y-6 animate-pulse"
    >
      <span className="sr-only">Loading weather forecast data...</span>

      {/* Hero Current Conditions Card Skeleton */}
      <div className="rounded-lg bg-white border border-[#E5E7EB] shadow-xs p-5 sm:p-6 flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-4 max-w-md">
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-[#E5E7EB] rounded" />
            <div className="h-4 w-24 bg-[#E5E7EB] rounded" />
          </div>
          <div className="h-8 w-48 bg-[#E5E7EB] rounded" />
          <div className="flex items-baseline gap-4 pt-2">
            <div className="h-16 w-28 bg-[#E5E7EB] rounded-md" />
            <div className="h-6 w-20 bg-[#E5E7EB] rounded" />
          </div>
          <div className="h-4 w-36 bg-[#E5E7EB] rounded" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:w-96">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-md bg-[#F7F7F7] border border-[#E5E7EB] space-y-2"
            >
              <div className="h-3 w-12 bg-[#E5E7EB] rounded" />
              <div className="h-5 w-14 bg-[#E5E7EB] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Strip Skeleton */}
      <div className="rounded-lg bg-white border border-[#E5E7EB] shadow-xs p-5 space-y-3">
        <div className="h-4 w-32 bg-[#E5E7EB] rounded" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-20 p-3 rounded-md bg-[#F7F7F7] border border-[#E5E7EB] flex flex-col items-center space-y-2.5"
            >
              <div className="h-3 w-8 bg-[#E5E7EB] rounded" />
              <div className="w-7 h-7 rounded-full bg-[#E5E7EB]" />
              <div className="h-4 w-8 bg-[#E5E7EB] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Daily Forecast Skeleton */}
      <div className="rounded-lg bg-white border border-[#E5E7EB] shadow-xs p-5 space-y-3">
        <div className="h-4 w-36 bg-[#E5E7EB] rounded mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-md bg-[#F7F7F7] border border-[#E5E7EB] flex items-center justify-between"
            >
              <div className="h-4 w-20 bg-[#E5E7EB] rounded" />
              <div className="w-6 h-6 rounded-full bg-[#E5E7EB]" />
              <div className="h-4 w-28 bg-[#E5E7EB] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
