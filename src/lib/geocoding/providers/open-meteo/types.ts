/**
 * Raw upstream response shapes from the Open-Meteo Geocoding API.
 * Isolated from application domain models.
 */

export interface OpenMeteoGeocodingRawItem {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  feature_code?: string;
  country_code?: string;
  country_id?: number;
  country?: string;
  admin1_id?: number;
  admin1?: string;
  admin2_id?: number;
  admin2?: string;
  admin3_id?: number;
  admin3?: string;
  admin4_id?: number;
  admin4?: string;
  timezone?: string;
  population?: number;
  postcodes?: string[];
}

export interface OpenMeteoGeocodingSearchResponse {
  results?: OpenMeteoGeocodingRawItem[];
  generationtime_ms?: number;
  error?: boolean;
  reason?: string;
}
