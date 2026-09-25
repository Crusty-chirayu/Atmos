import { OpenMeteoGeocodingSearchResponse } from "@/lib/geocoding/providers/open-meteo/types";

/**
 * Realistic deterministic fixtures modeling official Open-Meteo Geocoding API responses.
 */

export const MOCK_LONDON_SEARCH_RESPONSE: OpenMeteoGeocodingSearchResponse = {
  results: [
    {
      id: 2643743,
      name: "London",
      latitude: 51.50853,
      longitude: -0.12574,
      elevation: 25.0,
      feature_code: "PPLC",
      country_code: "GB",
      country_id: 2635167,
      country: "United Kingdom",
      admin1: "England",
      admin1_id: 6269131,
      admin2: "Greater London",
      admin2_id: 2648110,
      timezone: "Europe/London",
      population: 8961936,
      postcodes: ["EC1A", "EC1M"],
    },
    {
      id: 6058560,
      name: "London",
      latitude: 42.98339,
      longitude: -81.23304,
      elevation: 251.0,
      feature_code: "PPL",
      country_code: "CA",
      country_id: 6251999,
      country: "Canada",
      admin1: "Ontario",
      admin1_id: 6093943,
      admin2: "Middlesex County",
      timezone: "America/Toronto",
      population: 346288,
    },
    {
      id: 4298960,
      name: "London",
      latitude: 37.12898,
      longitude: -84.08326,
      elevation: 378.0,
      feature_code: "PPLA2",
      country_code: "US",
      country_id: 6252001,
      country: "United States",
      admin1: "Kentucky",
      admin1_id: 6254925,
      admin2: "Laurel County",
      timezone: "America/New_York",
      population: 7993,
    },
  ],
  generationtime_ms: 2.45,
};

export const MOCK_PARIS_SEARCH_RESPONSE: OpenMeteoGeocodingSearchResponse = {
  results: [
    {
      id: 2988507,
      name: "Paris",
      latitude: 48.85341,
      longitude: 2.3488,
      elevation: 42.0,
      feature_code: "PPLC",
      country_code: "FR",
      country_id: 3017382,
      country: "France",
      admin1: "Île-de-France",
      timezone: "Europe/Paris",
      population: 2161000,
    },
    {
      id: 4717560,
      name: "Paris",
      latitude: 33.66094,
      longitude: -95.55551,
      elevation: 183.0,
      feature_code: "PPLA2",
      country_code: "US",
      country_id: 6252001,
      country: "United States",
      admin1: "Texas",
      timezone: "America/Chicago",
      population: 25171,
    },
  ],
  generationtime_ms: 1.82,
};

export const MOCK_TOKYO_UNICODE_RESPONSE: OpenMeteoGeocodingSearchResponse = {
  results: [
    {
      id: 1850147,
      name: "Tokyo",
      latitude: 35.6895,
      longitude: 139.69171,
      elevation: 44.0,
      feature_code: "PPLC",
      country_code: "JP",
      country: "Japan",
      admin1: "Tokyo",
      timezone: "Asia/Tokyo",
      population: 13929286,
    },
  ],
  generationtime_ms: 1.15,
};

export const MOCK_EMPTY_SEARCH_RESPONSE: OpenMeteoGeocodingSearchResponse = {
  generationtime_ms: 0.95,
  // Open-Meteo omits the `results` key entirely when no match is found
};

export const MOCK_EMPTY_ARRAY_RESPONSE: OpenMeteoGeocodingSearchResponse = {
  results: [],
  generationtime_ms: 0.88,
};

export const MOCK_MALFORMED_ITEMS_RESPONSE: OpenMeteoGeocodingSearchResponse = {
  results: [
    {
      id: 999999,
      name: "", // Invalid empty name
      latitude: 50.0,
      longitude: 10.0,
    },
    {
      id: 999998,
      name: "Invalid Coordinates",
      latitude: 195.0, // Invalid latitude > 90
      longitude: 0.0,
    },
    {
      id: 123456,
      name: "Valid City",
      latitude: 45.0,
      longitude: 9.0,
      country: "Italy",
      country_code: "IT",
    },
  ],
  generationtime_ms: 1.2,
};
