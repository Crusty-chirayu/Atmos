"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { GeocodingLocation } from "@/lib/geocoding/domain/types";
import { useLocationSearch } from "@/hooks/use-location-search";

export interface LocationSearchProps {
  onSelectLocation?: (location: GeocodingLocation) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Reusable, accessible location search combobox component for ATMOS.
 * Clean, bright consumer search with high contrast and keyboard navigation.
 */
export function LocationSearch({
  onSelectLocation,
  placeholder = "Search city or location...",
  className = "",
  autoFocus = false,
}: LocationSearchProps) {
  const inputId = useId();
  const listboxId = useId();
  const statusId = useId();

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    query,
    setQuery,
    results,
    isSearching,
    error,
    selectLocation,
    clear,
    isOpen,
    setIsOpen,
  } = useLocationSearch({
    minQueryLength: 2,
    debounceMs: 300,
    count: 8,
    onSelect: onSelectLocation,
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setIsOpen]);

  const clampedIndex =
    activeIndex >= 0 && activeIndex < results.length ? activeIndex : -1;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "ArrowDown" && results.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (clampedIndex >= 0) {
          selectLocation(results[clampedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-xl mx-auto ${className}`}
    >
      {/* Combobox Input Container */}
      <div className="relative flex items-center">
        {/* Search Icon */}
        <div
          aria-hidden="true"
          className="absolute left-3.5 pointer-events-none flex items-center justify-center text-[#6B7280]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input Field */}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen && results.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={
            clampedIndex >= 0 ? `${listboxId}-item-${clampedIndex}` : undefined
          }
          aria-describedby={statusId}
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-10 py-2.5 rounded-md text-sm bg-white border border-[#E5E7EB] text-[#222222] placeholder:text-[#9CA3AF] shadow-xs focus:outline-none focus:border-[#FFC928] focus:ring-1 focus:ring-[#FFC928] transition-colors"
        />

        {/* Right Action: Loading Indicator or Clear Button */}
        <div className="absolute right-3.5 flex items-center gap-1.5">
          {isSearching && (
            <div
              aria-label="Searching locations"
              className="w-4 h-4 rounded-full border-2 border-[#FFC928] border-t-transparent animate-spin"
            />
          )}

          {query.length > 0 && !isSearching && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search input"
              className="p-1 rounded-full text-xs text-[#9CA3AF] hover:text-[#222222] transition-colors focus:outline-none"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Screen-reader Live Status Announcement */}
      <div id={statusId} role="status" aria-live="polite" className="sr-only">
        {isSearching
          ? "Searching for matching locations..."
          : error
            ? `Search error: ${error}`
            : results.length > 0
              ? `${results.length} locations found. Use arrow keys to navigate.`
              : query.trim().length >= 2
                ? "No matching locations found."
                : ""}
      </div>

      {/* Dropdown Results Listbox */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Location suggestions"
          className="absolute z-50 left-0 right-0 mt-1 py-1 rounded-md bg-white border border-[#E5E7EB] overflow-hidden shadow-md max-h-80 overflow-y-auto"
        >
          {/* Error Message */}
          {error && (
            <div className="px-4 py-3 text-xs flex items-center gap-2 text-[#D94841]">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Empty Results State */}
          {!error &&
            !isSearching &&
            results.length === 0 &&
            query.trim().length >= 2 && (
              <div className="px-4 py-5 text-center text-xs text-[#6B7280]">
                <p className="font-semibold text-[#222222]">
                  No locations found
                </p>
                <p className="mt-0.5">
                  Check spelling or search for a nearby city.
                </p>
              </div>
            )}

          {/* Results List */}
          {results.map((loc, idx) => {
            const isSelected = clampedIndex === idx;
            return (
              <div
                key={loc.id}
                id={`${listboxId}-item-${idx}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => selectLocation(loc)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`px-4 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                  isSelected
                    ? "bg-[#FFF9E6] border-l-3 border-[#FFC928]"
                    : "hover:bg-[#F7F7F7] border-l-3 border-transparent"
                }`}
              >
                <div className="flex flex-col text-left overflow-hidden mr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#222222] truncate">
                      {loc.name}
                    </span>
                    {loc.countryCode && (
                      <span className="px-1.5 py-0.2 rounded text-xs bg-[#F7F7F7] text-[#6B7280] border border-[#E5E7EB]">
                        {loc.countryCode}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#6B7280] truncate mt-0.5">
                    {[loc.adminArea, loc.country].filter(Boolean).join(", ") ||
                      `${loc.latitude.toFixed(2)}°, ${loc.longitude.toFixed(2)}°`}
                  </span>
                </div>

                {/* Right side metadata */}
                <div className="flex flex-col items-end shrink-0 text-xs text-[#9CA3AF]">
                  {loc.timezone && (
                    <span className="text-xs">
                      {loc.timezone.split("/").pop()?.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
