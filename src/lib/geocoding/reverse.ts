/**
 * Reverse Geocoding & Coordinate Formatting Utility for ATMOS.
 *
 * Resolves arbitrary latitude/longitude coordinates to geographic place names
 * (cities, municipalities, regions, or maritime regions) with graceful,
 * non-blocking fallback to standard geographic coordinate notation.
 */

export interface ReverseGeocodeResult {
  name: string;
  country?: string;
  countryCode?: string;
  adminArea?: string;
  isMaritime?: boolean;
}

/**
 * Formats coordinates into standard international geographic notation (e.g. "51.51° N, 0.13° W").
 */
export function formatCoordinateLabel(latitude: number, longitude: number): string {
  const latAbs = Math.abs(latitude).toFixed(2);
  const latDir = latitude >= 0 ? "N" : "S";
  const lonAbs = Math.abs(longitude).toFixed(2);
  const lonDir = longitude >= 0 ? "E" : "W";
  return `${latAbs}° ${latDir}, ${lonAbs}° ${lonDir}`;
}

/**
 * Attempts to resolve a human-readable locality or geographic landmass for coordinates.
 * Fails safely to coordinate representation without interrupting the weather retrieval pipeline.
 */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult> {
  const fallbackLabel = formatCoordinateLabel(latitude, longitude);

  if (signal?.aborted) {
    return { name: fallbackLabel };
  }

  try {
    const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
    url.searchParams.set("latitude", latitude.toFixed(4));
    url.searchParams.set("longitude", longitude.toFixed(4));
    url.searchParams.set("localityLanguage", "en");

    // Timeout after 3.5 seconds to prevent stalling UI
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const onAbort = () => controller.abort();
    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onAbort);
    }

    if (!res.ok) {
      return { name: fallbackLabel };
    }

    const data = await res.json();

    // Prefer city, then locality, then principal subdivision, then informative name
    const candidateName =
      data.city ||
      data.locality ||
      data.principalSubdivision ||
      data.localityInfo?.informative?.[0]?.name ||
      null;

    const countryName = data.countryName || undefined;
    const countryCode = data.countryCode || undefined;
    const adminArea = data.principalSubdivision || undefined;

    if (candidateName) {
      return {
        name: candidateName,
        country: countryName,
        countryCode,
        adminArea,
        isMaritime: !data.countryName && !data.city,
      };
    }

    if (countryName) {
      return {
        name: countryName,
        country: countryName,
        countryCode,
        adminArea,
      };
    }

    return { name: fallbackLabel };
  } catch {
    // Return clean formatted coordinate label on network error or abort
    return { name: fallbackLabel };
  }
}
