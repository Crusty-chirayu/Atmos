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
 * - WCAG compliant combobox pattern with keyboard navigation.
 * - Live announcements for screen readers.
 * - Disambiguates duplicate city names via administrative areas and country codes.
 * - Dark-first glassmorphic styling respecting theme tokens and reduced motion.
 */
export function LocationSearch({
  onSelectLocation,
  placeholder = "Search global cities, regions, or coordinates...",
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
          className="absolute left-4 pointer-events-none flex items-center justify-center"
          style={{ color: "var(--text-muted)" }}
        >
          <svg
            className="w-5 h-5"
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
          className="w-full pl-12 pr-12 py-3.5 rounded-2xl text-base transition-all duration-200 outline-none"
          style={{
            background: "var(--surface-overlay)",
            border: isOpen
              ? "1px solid var(--color-accent-500)"
              : "1px solid var(--border-default)",
            color: "var(--text-primary)",
            boxShadow: isOpen
              ? "0 0 0 2px rgb(0 212 255 / 0.15), var(--shadow-md)"
              : "var(--shadow-sm)",
          }}
        />

        {/* Right Action: Loading Indicator or Clear Button */}
        <div className="absolute right-3.5 flex items-center gap-1.5">
          {isSearching && (
            <div
              aria-label="Searching locations"
              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: "var(--color-accent-500)",
                borderTopColor: "transparent",
              }}
            />
          )}

          {query.length > 0 && !isSearching && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search input"
              className="p-1 rounded-full text-xs hover:opacity-80 transition-opacity focus:outline-none"
              style={{
                color: "var(--text-muted)",
              }}
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
          className="absolute z-50 left-0 right-0 mt-2 py-2 rounded-2xl glass overflow-hidden shadow-2xl transition-all"
          style={{
            maxHeight: "360px",
            overflowY: "auto",
            border: "1px solid var(--border-default)",
            background: "var(--surface-glass)",
          }}
        >
          {/* Error Message */}
          {error && (
            <div
              className="px-4 py-3 text-sm flex items-center gap-2"
              style={{ color: "var(--color-danger-400)" }}
            >
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
              <div
                className="px-4 py-6 text-center text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                <p className="font-medium">No locations found</p>
                <p className="text-xs mt-1">
                  Check spelling or search for a larger nearby city.
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
                className="px-4 py-2.5 cursor-pointer flex items-center justify-between transition-colors duration-150"
                style={{
                  background: isSelected
                    ? "rgb(0 212 255 / 0.12)"
                    : "transparent",
                  borderLeft: isSelected
                    ? "3px solid var(--color-accent-500)"
                    : "3px solid transparent",
                }}
              >
                <div className="flex flex-col text-left overflow-hidden mr-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-medium text-sm truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {loc.name}
                    </span>
                    {loc.countryCode && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[11px] font-mono tracking-wider"
                        style={{
                          background: "var(--surface-overlay)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        {loc.countryCode}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xs truncate mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {[loc.adminArea, loc.country].filter(Boolean).join(", ") ||
                      `${loc.latitude.toFixed(2)}°, ${loc.longitude.toFixed(2)}°`}
                  </span>
                </div>

                {/* Right side metadata: Elevation / Timezone */}
                <div
                  className="flex flex-col items-end shrink-0 text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {loc.timezone && (
                    <span className="font-mono text-[10px] opacity-80">
                      {loc.timezone.split("/").pop()?.replace(/_/g, " ")}
                    </span>
                  )}
                  {loc.population && loc.population > 0 && (
                    <span className="text-[10px]">
                      {loc.population / 1000 >= 1000
                        ? `${(loc.population / 1000000).toFixed(1)}M`
                        : `${Math.round(loc.population / 1000)}k`}{" "}
                      pop
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
