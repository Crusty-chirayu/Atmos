import { GeocodingLocation } from "../domain/types";
import { normalizeCoordinates } from "../../weather/domain/location";

/**
 * Normalizes text for comparison by lowercasing and stripping diacritics.
 * Example: "München" -> "munchen", "Montréal" -> "montreal"
 */
export function normalizeSearchString(text: string): string {
  return text
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Computes a deterministic relevance score for a location result against a query.
 * Higher score = higher ranking.
 *
 * Scoring signals:
 * - 1000 pts: Exact name match
 * - 500 pts: Prefix name match
 * - 250 pts: Name contains query word
 * - 100 pts: Admin area or Country matches query
 * - 0..50 pts: Population score (logarithmic boost for major metropolitan centers)
 */
export function calculateLocationScore(
  location: GeocodingLocation,
  query: string
): number {
  const normQuery = normalizeSearchString(query);
  const normName = normalizeSearchString(location.name);

  let score = 0;

  if (normName === normQuery) {
    score += 1000;
  } else if (normName.startsWith(normQuery)) {
    score += 500;
  } else if (normName.includes(normQuery)) {
    score += 250;
  }

  // Country or admin qualifier match (e.g. searching "Paris, Texas")
  if (
    location.country &&
    normalizeSearchString(location.country).includes(normQuery)
  ) {
    score += 100;
  }
  if (
    location.adminArea &&
    normalizeSearchString(location.adminArea).includes(normQuery)
  ) {
    score += 100;
  }

  // Capital city bonus (PPLC = capital of a political entity)
  if (location.featureCode === "PPLC") {
    score += 50;
  }

  // Population tie-breaker: log10(pop) * 3 gives up to ~21 points for population of 10M
  if (location.population && location.population > 0) {
    score += Math.min(30, Math.log10(location.population) * 4);
  }

  return score;
}

/**
 * Ranks and sorts location results deterministically.
 */
export function rankGeocodingResults(
  results: GeocodingLocation[],
  query: string
): GeocodingLocation[] {
  return [...results].sort((a, b) => {
    const scoreA = calculateLocationScore(a, query);
    const scoreB = calculateLocationScore(b, query);

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // Stable secondary sort: population descending, then alphabetical name
    const popA = a.population ?? 0;
    const popB = b.population ?? 0;
    if (popB !== popA) {
      return popB - popA;
    }

    return a.name.localeCompare(b.name);
  });
}

/**
 * Deduplicates location results that map to the identical normalized geographic area.
 * Keeps the entry with the highest population or most complete metadata.
 */
export function deduplicateGeocodingResults(
  results: GeocodingLocation[]
): GeocodingLocation[] {
  const seenCoordinates = new Set<string>();
  const deduplicated: GeocodingLocation[] = [];

  for (const loc of results) {
    const norm = normalizeCoordinates({
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
    // Key by normalized lat, lon, and name to preserve separate distinct entities
    const key = `${norm.latitude.toFixed(2)}:${norm.longitude.toFixed(2)}:${normalizeSearchString(loc.name)}`;

    if (!seenCoordinates.has(key)) {
      seenCoordinates.add(key);
      deduplicated.push(loc);
    }
  }

  return deduplicated;
}
