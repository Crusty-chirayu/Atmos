"use client";

import React from "react";
import { LocationSearch } from "@/components/weather/location-search";
import { GeocodingLocation } from "@/lib/geocoding/domain/types";
import { FEATURED_CITIES, FeaturedCity } from "@/lib/globe/coordinates";
import { WeatherBundle } from "@/lib/weather/domain/weather";
import { WeatherIcon } from "@/components/weather/weather-icon";

export interface HeroSectionProps {
  selectedLocation: {
    latitude: number;
    longitude: number;
    name?: string;
    countryCode?: string;
  };
  weatherBundle: WeatherBundle | null;
  isLoadingWeather: boolean;
  onSelectLocation: (location: GeocodingLocation) => void;
  onSelectFeaturedCity: (city: FeaturedCity) => void;
}

export function HeroSection({
  selectedLocation,
  weatherBundle,
  isLoadingWeather,
  onSelectLocation,
  onSelectFeaturedCity,
}: HeroSectionProps) {
  return (
    <section className="w-full max-w-4xl mx-auto px-4 text-center pt-8 pb-6 flex flex-col items-center">
      {/* Top pill badge */}
      <div
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-4 glass shadow-sm"
        style={{ color: "var(--color-accent-400)" }}
      >
        <span
          aria-hidden="true"
          className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-ping"
        />
        <span>Cinematic Earth Observation · Global Open-Meteo Mesh</span>
      </div>

      {/* Main Headline */}
      <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl tracking-tight leading-[1.1] max-w-3xl">
        Atmospheric Intelligence <br className="hidden sm:inline" />
        <span className="text-gradient">Across Every Coordinate.</span>
      </h1>

      {/* Supporting Copy */}
      <p
        className="mt-3 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        Live planetary observation, high-resolution synoptic forecasts, and
        celestial telemetry powered by open meteorological science.
      </p>

      {/* Global Location Search Combobox */}
      <div className="w-full max-w-xl mt-6 relative z-30">
        <LocationSearch
          onSelectLocation={onSelectLocation}
          placeholder="Search any global city, capital, or coordinate..."
        />
      </div>

      {/* Quick Explore Metropolis Chips */}
      <div className="w-full max-w-2xl mt-4 flex flex-wrap items-center justify-center gap-1.5">
        <span
          className="text-[11px] font-mono mr-1"
          style={{ color: "var(--text-muted)" }}
        >
          Explore:
        </span>
        {FEATURED_CITIES.map((city) => {
          const isSelected =
            selectedLocation.name?.toLowerCase() === city.name.toLowerCase();
          return (
            <button
              key={city.id}
              type="button"
              onClick={() => onSelectFeaturedCity(city)}
              className={`px-2.5 py-1 rounded-full text-xs font-mono transition-all ${
                isSelected
                  ? "bg-accent-500/20 text-accent-300 border-accent-400/50 shadow-sm"
                  : "bg-surface-raised/80 text-text-secondary hover:text-text-primary hover:bg-atmos-700/50 border border-border-subtle"
              }`}
            >
              {city.name}
            </button>
          );
        })}
      </div>

      {/* Active Location Live Weather Preview Pill */}
      {weatherBundle && (
        <div
          className="mt-5 inline-flex items-center gap-3 px-4 py-2 rounded-2xl glass transition-all"
          role="status"
          aria-label={`Current preview for ${selectedLocation.name}: ${Math.round(weatherBundle.current.temperature)}${weatherBundle.meta.units.temperature === "fahrenheit" ? "°F" : "°C"}, ${weatherBundle.current.conditionText}`}
        >
          <WeatherIcon
            category={weatherBundle.current.conditionCategory}
            isDay={weatherBundle.current.isDay}
            className="w-5 h-5 text-accent-400"
          />
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {selectedLocation.name}
          </span>
          <span className="font-mono text-xs font-bold text-accent-400">
            {Math.round(weatherBundle.current.temperature)}
            {weatherBundle.meta.units.temperature === "fahrenheit"
              ? "°F"
              : "°C"}
          </span>
          <span
            className="text-xs border-l pl-3 hidden sm:inline"
            style={{
              borderColor: "var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            {weatherBundle.current.conditionText}
          </span>
        </div>
      )}

      {isLoadingWeather && !weatherBundle && (
        <div
          className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono glass animate-pulse"
          style={{ color: "var(--text-muted)" }}
        >
          <span>
            Acquiring satellite telemetry for {selectedLocation.name}...
          </span>
        </div>
      )}
    </section>
  );
}
