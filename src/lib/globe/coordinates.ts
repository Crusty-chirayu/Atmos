/**
 * Geographic coordinate transformations and featured global locations for the ATMOS 3D globe.
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface FeaturedCity {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  adminArea?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/**
 * Curated list of iconic global metropolises spanning all continents.
 * Used for quick-explore chips, globe landmarks, and instant previews.
 */
export const FEATURED_CITIES: FeaturedCity[] = [
  {
    id: "city-tokyo",
    name: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
  },
  {
    id: "city-london",
    name: "London",
    country: "United Kingdom",
    countryCode: "GB",
    adminArea: "England",
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: "Europe/London",
  },
  {
    id: "city-new-york",
    name: "New York",
    country: "United States",
    countryCode: "US",
    adminArea: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
  },
  {
    id: "city-reykjavik",
    name: "Reykjavik",
    country: "Iceland",
    countryCode: "IS",
    latitude: 64.1466,
    longitude: -21.9426,
    timezone: "Atlantic/Reykjavik",
  },
  {
    id: "city-sydney",
    name: "Sydney",
    country: "Australia",
    countryCode: "AU",
    adminArea: "New South Wales",
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: "Australia/Sydney",
  },
  {
    id: "city-cairo",
    name: "Cairo",
    country: "Egypt",
    countryCode: "EG",
    latitude: 30.0444,
    longitude: 31.2357,
    timezone: "Africa/Cairo",
  },
  {
    id: "city-sao-paulo",
    name: "São Paulo",
    country: "Brazil",
    countryCode: "BR",
    adminArea: "São Paulo",
    latitude: -23.5505,
    longitude: -46.6333,
    timezone: "America/Sao_Paulo",
  },
  {
    id: "city-mumbai",
    name: "Mumbai",
    country: "India",
    countryCode: "IN",
    adminArea: "Maharashtra",
    latitude: 19.076,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
  },
  {
    id: "city-paris",
    name: "Paris",
    country: "France",
    countryCode: "FR",
    adminArea: "Île-de-France",
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: "Europe/Paris",
  },
  {
    id: "city-singapore",
    name: "Singapore",
    country: "Singapore",
    countryCode: "SG",
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: "Asia/Singapore",
  },
];

/**
 * Converts geographic latitude and longitude into 3D Cartesian coordinates on a sphere.
 *
 * Coordinate Convention:
 * - Three.js standard right-handed space.
 * - Y axis: North (+Y) to South (-Y).
 * - Z axis: Towards the viewer at (lat=0, lon=0) (Gulf of Guinea / Prime Meridian).
 * - X axis: East (+X) to West (-X).
 *
 * @param latitude - Degrees from -90 to +90
 * @param longitude - Degrees from -180 to +180
 * @param radius - Radius of the spherical globe (default 1.0)
 */
export function latLonToCartesian(
  latitude: number,
  longitude: number,
  radius: number = 1.0
): Vector3D {
  const latClamped = Math.max(-90, Math.min(90, latitude));
  const lonClamped = Math.max(-180, Math.min(180, longitude));

  const latRad = (latClamped * Math.PI) / 180;
  const lonRad = (lonClamped * Math.PI) / 180;

  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);
  const cosLon = Math.cos(lonRad);
  const sinLon = Math.sin(lonRad);

  return {
    x: radius * cosLat * sinLon,
    y: radius * sinLat,
    z: radius * cosLat * cosLon,
  };
}

/**
 * Converts 3D Cartesian coordinates on a sphere back to geographic latitude and longitude.
 */
export function cartesianToLatLon(
  x: number,
  y: number,
  z: number
): { latitude: number; longitude: number } {
  const r = Math.sqrt(x * x + y * y + z * z);
  if (r === 0) {
    return { latitude: 0, longitude: 0 };
  }

  const normalizedY = Math.max(-1, Math.min(1, y / r));
  const latitude = (Math.asin(normalizedY) * 180) / Math.PI;
  const longitude = (Math.atan2(x, z) * 180) / Math.PI;

  return {
    latitude: Number(latitude.toFixed(4)),
    longitude: Number(longitude.toFixed(4)),
  };
}

/**
 * Calculates the great-circle distance between two coordinates in kilometers (Haversine formula).
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
