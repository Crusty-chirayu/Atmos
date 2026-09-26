"use client";

import React from "react";
import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { NotificationCenter } from "@/components/notifications/notification-center";

export type HomeViewMode = "overview" | "globe" | "dashboard";

export interface HomeNavProps {
  viewMode?: HomeViewMode;
  onViewModeChange?: (mode: HomeViewMode) => void;
  units?: "metric" | "imperial";
  onToggleUnits?: () => void;
}

export function HomeNav({
  viewMode,
  onViewModeChange,
  units = "metric",
  onToggleUnits,
}: HomeNavProps) {
  return (
    <header className="w-full bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand & Main Route Links */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 group focus:outline-none"
            aria-label="ATMOS Homepage"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFC928]" />
            <span className="font-bold text-xl sm:text-2xl tracking-tight text-[#222222]">
              ATMOS
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-[#6B7280]">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === "overview"
                  ? "text-[#222222] font-semibold bg-[#F7F7F7]"
                  : "hover:text-[#222222] hover:bg-[#F7F7F7]"
              }`}
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-md hover:text-[#222222] hover:bg-[#F7F7F7] transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/ai"
              className="px-3 py-1.5 rounded-md hover:text-[#222222] hover:bg-[#F7F7F7] transition-colors"
            >
              AI Assistant
            </Link>
            <Link
              href="/about"
              className="px-3 py-1.5 rounded-md hover:text-[#222222] hover:bg-[#F7F7F7] transition-colors"
            >
              About
            </Link>
          </nav>
        </div>

        {/* View Switcher Tabs & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Mode Segmented Control (Overview / 3D Globe / Telemetry) */}
          {onViewModeChange && (
            <div
              role="tablist"
              aria-label="Experience view selection"
              className="hidden sm:flex p-0.5 rounded-md bg-[#F7F7F7] border border-[#E5E7EB] items-center gap-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "overview"}
                onClick={() => onViewModeChange("overview")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === "overview"
                    ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                    : "text-[#6B7280] hover:text-[#222222]"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "globe"}
                onClick={() => onViewModeChange("globe")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === "globe"
                    ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                    : "text-[#6B7280] hover:text-[#222222]"
                }`}
              >
                3D Globe
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "dashboard"}
                onClick={() => onViewModeChange("dashboard")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === "dashboard"
                    ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                    : "text-[#6B7280] hover:text-[#222222]"
                }`}
              >
                Details
              </button>
            </div>
          )}

          {/* Unit Toggle (°C / °F) */}
          <button
            type="button"
            onClick={onToggleUnits}
            aria-label={`Switch units to ${units === "metric" ? "Imperial (°F)" : "Metric (°C)"}`}
            className="px-2.5 py-1.5 rounded-md bg-[#F7F7F7] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-xs font-semibold text-[#222222] transition-colors"
            title="Toggle Metric / Imperial"
          >
            {units === "metric" ? "°C" : "°F"}
          </button>

          {/* Weather Alerts Notification Center */}
          <NotificationCenter />

          {/* User Account Menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
