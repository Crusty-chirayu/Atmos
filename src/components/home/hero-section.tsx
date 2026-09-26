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
    <section className="w-full max-w-4xl mx-auto px-4 pt-6 pb-2 flex flex-col items-center">
      {/* Search Bar */}
      <div className="w-full max-w-xl relative z-30">
        <LocationSearch
          onSelectLocation={onSelectLocation}
          placeholder="Search city, state, or country..."
        />
      </div>

      {/* Popular City Quick-Select Pills */}
      <div className="w-full max-w-xl mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs">
        <span className="text-xs text-[#6B7280] mr-1 font-medium">
          Popular:
        </span>
        {FEATURED_CITIES.slice(0, 7).map((city) => {
          const isSelected =
            selectedLocation.name?.toLowerCase() === city.name.toLowerCase();
          return (
            <button
              key={city.id}
              type="button"
              onClick={() => onSelectFeaturedCity(city)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                isSelected
                  ? "bg-[#FFC928] text-[#222222] font-semibold border border-[#F2B900]"
                  : "bg-[#F7F7F7] text-[#6B7280] hover:text-[#222222] hover:bg-[#E5E7EB] border border-[#E5E7EB]"
              }`}
            >
              {city.name}
            </button>
          );
        })}
      </div>

      {/* Active Location Live Weather Preview Banner */}
      {weatherBundle && (
        <div
          className="mt-4 inline-flex items-center gap-3 px-3.5 py-1.5 rounded-md bg-[#F7F7F7] border border-[#E5E7EB] text-xs transition-all"
          role="status"
          aria-label={`Current preview for ${selectedLocation.name}: ${Math.round(weatherBundle.current.temperature)}${weatherBundle.meta.units.temperature === "fahrenheit" ? "°F" : "°C"}, ${weatherBundle.current.conditionText}`}
        >
          <WeatherIcon
            category={weatherBundle.current.conditionCategory}
            isDay={weatherBundle.current.isDay}
            className="w-4 h-4 text-[#FFC928] shrink-0"
          />
          <span className="font-semibold text-[#222222]">
            {selectedLocation.name}
          </span>
          <span className="font-bold text-[#222222] tabular-nums">
            {Math.round(weatherBundle.current.temperature)}
            {weatherBundle.meta.units.temperature === "fahrenheit"
              ? "°F"
              : "°C"}
          </span>
          <span className="border-l border-[#E5E7EB] pl-2.5 text-[#6B7280] hidden sm:inline">
            {weatherBundle.current.conditionText}
          </span>
          <span className="border-l border-[#E5E7EB] pl-2.5 text-[#6B7280] hidden md:inline">
            Wind: {Math.round(weatherBundle.current.windSpeed)}{" "}
            {weatherBundle.meta.units.windSpeed === "mph" ? "mph" : "km/h"}
          </span>
        </div>
      )}

      {isLoadingWeather && !weatherBundle && (
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs bg-[#F7F7F7] border border-[#E5E7EB] text-[#6B7280] animate-pulse">
          <span>Loading weather for {selectedLocation.name}...</span>
        </div>
      )}
    </section>
  );
}
