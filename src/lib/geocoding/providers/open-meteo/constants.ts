import { GeocodingProviderCapabilities } from "../types";

export const OPEN_METEO_GEOCODING_PROVIDER_ID = "open-meteo";

export const DEFAULT_GEOCODING_ENDPOINT =
  "https://geocoding-api.open-meteo.com/v1/search";

export const DEFAULT_GEOCODING_GET_ENDPOINT =
  "https://geocoding-api.open-meteo.com/v1/get";

export const OPEN_METEO_GEOCODING_CAPABILITIES: GeocodingProviderCapabilities =
  {
    id: OPEN_METEO_GEOCODING_PROVIDER_ID,
    name: "Open-Meteo Geocoding",
    supportsMultilingual: true,
    supportsCountryFiltering: true,
    maxResults: 100,
    requiresApiKey: false,
    attribution: "Location data based on GeoNames via Open-Meteo.com",
    termsUrl: "https://open-meteo.com/en/terms",
  };

export const ALLOWED_GEOCODING_HOSTS = new Set([
  "geocoding-api.open-meteo.com",
]);
