/**
 * ATMOS Weather Engine Public API
 *
 * Strongly typed, provider-agnostic weather data layer with
 * Open-Meteo primary adapter, caching, request deduplication,
 * unit conversion, and resilient error handling.
 */

// Domain models & functions
export * from "./domain/location";
export * from "./domain/units";
export * from "./domain/weather";
export * from "./domain/schemas";

// Errors
export * from "./errors/weather-error";

// Provider abstractions & registry
export * from "./providers/types";
export * from "./providers/registry";

// Open-Meteo adapter
export * from "./providers/open-meteo/types";
export * from "./providers/open-meteo/constants";
export * from "./providers/open-meteo/adapter";

// Caching & deduplication
export * from "./cache/cache";

// Service layer orchestrator
export * from "./service";

// Geocoding capabilities
export type {
  GeocodingLocation,
  GeocodingSearchResult,
  GeocodingQuery,
  GeocodingQueryInput,
  GeocodingProvider,
  GeocodingProviderCapabilities,
  GeocodingServiceOptions,
} from "../geocoding";
export {
  GeocodingQuerySchema,
  GeocodingLocationSchema,
  formatLocationLabel,
  GeocodingProviderRegistry,
  getGeocodingProviderRegistry,
  OpenMeteoGeocodingAdapter,
  GeocodingService,
  getGeocodingService,
} from "../geocoding";
