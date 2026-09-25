"use client";

import React from "react";
import dynamic from "next/dynamic";

import { FeaturedCity } from "@/lib/globe/coordinates";
import { GlobeFallback } from "./globe-fallback";

export interface InteractiveGlobeProps {
  selectedLocation: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  onSelectCity?: (city: FeaturedCity) => void;
  className?: string;
}

// Dynamically import Three.js GlobeCanvas strictly on client-side (ssr: false)
const DynamicGlobeCanvas = dynamic(
  () => import("./globe-canvas").then((mod) => mod.GlobeCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full h-full min-h-[340px] flex flex-col items-center justify-center animate-pulse"
        role="status"
        aria-label="Loading interactive globe..."
      >
        <div
          className="w-64 h-64 rounded-full border border-atmos-700/40"
          style={{ background: "var(--surface-raised)" }}
        />
        <span
          className="mt-4 text-xs font-mono"
          style={{ color: "var(--text-muted)" }}
        >
          Initializing Planetary Mesh...
        </span>
      </div>
    ),
  }
);

import { useWebGLSupport } from "@/hooks/use-media-query";

export function InteractiveGlobe({
  selectedLocation,
  onSelectCity,
  className = "",
}: InteractiveGlobeProps) {
  const hasWebGL = useWebGLSupport();

  // If WebGL is not available, render accessible 2.5D fallback
  if (!hasWebGL) {
    return (
      <GlobeFallback
        selectedLocation={selectedLocation}
        onSelectCity={onSelectCity}
        className={className}
        reason="WebGL unavailable — 2.5D visual mode active"
      />
    );
  }

  // Render Three.js GlobeCanvas
  return (
    <div className={`w-full h-full ${className}`}>
      <DynamicGlobeCanvas
        selectedLocation={selectedLocation}
        onSelectCity={onSelectCity}
      />
    </div>
  );
}
