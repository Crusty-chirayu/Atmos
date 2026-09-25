"use client";

import React, { useState } from "react";
import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";

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
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";
    }
    return "dark";
  });

  const toggleTheme = () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("atmos-theme", nextTheme);
    } catch {
      // Ignored
    }
  };

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-4 border-b border-atmos-700/20 z-20">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 group focus:outline-none"
          aria-label="ATMOS Homepage"
        >
          <span className="font-display font-black text-2xl sm:text-3xl tracking-tight text-gradient">
            ATMOS
          </span>
          <span
            className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
            style={{
              background: "rgb(0 212 255 / 0.1)",
              color: "var(--color-accent-400)",
              border: "1px solid rgb(0 212 255 / 0.25)",
            }}
          >
            v0.6 · M6
          </span>
        </Link>

        {/* Weather Dashboard Quick Link */}
        <Link
          href="/dashboard"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl glass text-xs font-semibold text-accent-400 hover:bg-accent-500/10 transition-colors border border-accent-500/20"
        >
          <span>Dashboard</span>
          <span aria-hidden="true">→</span>
        </Link>

        {/* AI Workspace Quick Link */}
        <Link
          href="/ai"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl glass text-xs font-semibold text-accent-400 hover:bg-accent-500/10 transition-colors border border-accent-500/20"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
          <span>AI Intelligence</span>
        </Link>

        {/* Engine status indicator */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono glass"
          style={{ color: "var(--text-muted)" }}
        >
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse"
          />
          <span>Planetary Mesh Active</span>
        </div>
      </div>

      {/* View Switcher Tabs & Tools */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* View Mode Segmented Control */}
        <div
          role="tablist"
          aria-label="Experience view selection"
          className="p-1 rounded-xl glass flex items-center gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "overview"}
            onClick={() => onViewModeChange?.("overview")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "overview"
                ? "bg-accent-500 text-atmos-950 font-semibold shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-atmos-700/30"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "globe"}
            onClick={() => onViewModeChange?.("globe")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "globe"
                ? "bg-accent-500 text-atmos-950 font-semibold shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-atmos-700/30"
            }`}
          >
            3D Globe
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "dashboard"}
            onClick={() => onViewModeChange?.("dashboard")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "dashboard"
                ? "bg-accent-500 text-atmos-950 font-semibold shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-atmos-700/30"
            }`}
          >
            Telemetry
          </button>
        </div>

        {/* Unit Toggle (°C / °F) */}
        <button
          type="button"
          onClick={onToggleUnits}
          aria-label={`Switch units to ${units === "metric" ? "Imperial (°F)" : "Metric (°C)"}`}
          className="px-2.5 py-1.5 rounded-xl glass text-xs font-mono font-medium hover:bg-atmos-700/40 transition-colors"
          style={{ color: "var(--text-secondary)" }}
          title="Toggle Metric / Imperial"
        >
          {units === "metric" ? "°C" : "°F"}
        </button>

        {/* Theme Toggle (Dark / Light) */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${currentTheme === "dark" ? "light" : "dark"} theme`}
          className="p-2 rounded-xl glass text-xs hover:bg-atmos-700/40 transition-colors"
          style={{ color: "var(--text-secondary)" }}
          title={`Switch to ${currentTheme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {currentTheme === "dark" ? (
            /* Sun Icon for switching to light */
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            /* Moon Icon for switching to dark */
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>

        {/* User Account Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
