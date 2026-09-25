import { Location } from "../../weather/domain/location";

/**
 * Normalized geocoding location result.
 * Extends the core Location model with administrative, population,
 * and geographic feature metadata from geocoding providers.
 */
export interface GeocodingLocation extends Location {
  id: string; // Guaranteed stable identifier (e.g. 'open-meteo:2950159')
  providerId: string;
  sourceId?: number | string; // Upstream provider's raw ID (e.g. GeoNames ID)
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  countryCode?: string; // 2-letter uppercase ISO 3166-1 alpha-2
  adminArea?: string; // Primary administrative division (State, Province, Region, Admin1)
  adminArea2?: string; // Secondary administrative division (County, District, Admin2)
  adminArea3?: string; // Third-level division (Admin3)
  elevation?: number; // Meters above mean sea level
  timezone?: string; // IANA timezone database name (e.g. 'Europe/Paris')
  population?: number;
  postcodes?: string[];
  featureCode?: string; // GeoNames feature code (e.g. 'PPLC' = capital, 'PPL' = populated place)
  formattedAddress: string; // Human-friendly display string: e.g. "Paris, Île-de-France, France"
}

/**
 * Generates a clean, unambiguous formatted label for location display.
 * Distinguishes similarly named cities in different states or countries.
 * Example: "Springfield, Illinois, United States" vs "Springfield, Massachusetts, United States"
 */
export function formatLocationLabel(loc: {
  name: string;
  adminArea?: string | null;
  country?: string | null;
  countryCode?: string | null;
}): string {
  const parts: string[] = [loc.name];

  if (loc.adminArea && loc.adminArea !== loc.name) {
    parts.push(loc.adminArea);
  }

  if (loc.country) {
    parts.push(loc.country);
  } else if (loc.countryCode) {
    parts.push(loc.countryCode);
  }

  return parts.join(", ");
}

/**
 * Response structure for geocoding searches.
 */
export interface GeocodingSearchResult {
  query: string;
  results: GeocodingLocation[];
  totalCount: number;
  generationTimeMs?: number;
  provider: string;
  isCached: boolean;
}
