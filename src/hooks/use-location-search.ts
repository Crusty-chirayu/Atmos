"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  GeocodingLocation,
  GeocodingSearchResult,
} from "@/lib/geocoding/domain/types";

export interface UseLocationSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  count?: number;
  language?: string;
  countryCode?: string;
  onSelect?: (location: GeocodingLocation) => void;
}

export interface UseLocationSearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: GeocodingLocation[];
  isSearching: boolean;
  error: string | null;
  selectedLocation: GeocodingLocation | null;
  selectLocation: (location: GeocodingLocation) => void;
  clear: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

/**
 * Custom React hook for debounced location search with stale-request protection.
 */
export function useLocationSearch(
  options: UseLocationSearchOptions = {}
): UseLocationSearchResult {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    count = 10,
    language = "en",
    countryCode,
    onSelect,
  } = options;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<GeocodingLocation | null>(null);

  // AbortController ref to cancel obsolete in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSetQuery = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      if (newQuery.trim().length < minQueryLength) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        setResults([]);
        setIsSearching(false);
        setError(null);
      }
    },
    [minQueryLength]
  );

  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setQuery("");
    setResults([]);
    setIsSearching(false);
    setError(null);
    setIsOpen(false);
    setSelectedLocation(null);
  }, []);

  const selectLocation = useCallback(
    (loc: GeocodingLocation) => {
      setSelectedLocation(loc);
      setIsOpen(false);
      setQuery(loc.formattedAddress || loc.name);
      onSelect?.(loc);
    },
    [onSelect]
  );

  useEffect(() => {
    const trimmed = query.trim();

    // Skip debounce and network call when query is too short
    if (trimmed.length < minQueryLength) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      // Abort any prior request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsSearching(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: trimmed,
          count: count.toString(),
          lang: language,
        });

        if (countryCode) {
          params.set("country", countryCode);
        }

        const response = await fetch(
          `/api/weather/geocoding?${params.toString()}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          const errData = (await response.json().catch(() => ({}))) as {
            error?: { message?: string; code?: string };
          };
          throw new Error(
            errData.error?.message ||
              `Location search failed (${response.status})`
          );
        }

        const data = (await response.json()) as GeocodingSearchResult;
        if (!controller.signal.aborted) {
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; // Ignore intentional aborts
        }
        if (!controller.signal.aborted) {
          const message =
            err instanceof Error ? err.message : "Failed to search locations";
          setError(message);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs, minQueryLength, count, language, countryCode]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    query,
    setQuery: handleSetQuery,
    results,
    isSearching,
    error,
    selectedLocation,
    selectLocation,
    clear,
    isOpen,
    setIsOpen,
  };
}
