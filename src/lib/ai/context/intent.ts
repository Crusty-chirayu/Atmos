import { getGeocodingService } from "@/lib/geocoding/service";
import { buildWeatherGroundingSnapshot } from "./grounding";
import { WeatherGroundingSnapshot } from "../domain/schemas";

export interface ResolvedIntentGrounding {
  isWeatherQuery: boolean;
  isTravelQuery: boolean;
  primaryGrounding: WeatherGroundingSnapshot | null;
  secondaryGrounding: WeatherGroundingSnapshot | null;
  detectedTargetName?: string;
}

export interface TargetCityResult {
  destination?: string;
  target?: string;
  origin?: string;
  isTravel: boolean;
}

/**
 * Extracts coordinates from queries like:
 * "What is the weather at 27.9881, 86.9250?" or "lat: -33.8688, lon: 151.2093"
 */
export function extractCoordinates(
  message: string
): { latitude: number; longitude: number } | null {
  const coordRegex =
    /(?:lat(?:itude)?[:\s]+)?(-?\d{1,2}(?:\.\d+)?)[,\s]+(?:lon(?:gitude)?[:\s]+)?(-?\d{1,3}(?:\.\d+)?)/i;
  const match = message.match(coordRegex);
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lon = parseFloat(match[2]);

  if (
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  ) {
    if (
      message.toLowerCase().includes("coordinate") ||
      message.toLowerCase().includes("lat") ||
      (match[1].includes(".") && match[2].includes("."))
    ) {
      return { latitude: lat, longitude: lon };
    }
  }
  return null;
}

/**
 * Extracts a target city and optional origin from queries like:
 * - "I am in Bangalore and travelling to Mumbai tomorrow"
 * - "Flight from Delhi to Tokyo"
 * - "What is the weather in Bangalore?"
 * - "Will it rain in Mumbai today?"
 */
export function extractTargetCity(message: string): TargetCityResult {
  // Travel pattern "from X to Y" e.g., "flight from Delhi to Tokyo"
  const fromToRegex =
    /(?:from)\s+([A-Za-z\s]+?)\s+(?:to)\s+([A-Za-z\s]+?)(?:\s+tomorrow|\s+next|\s+this|\s+on|\s+for|\?|\.|$)/i;
  const fromToMatch = message.match(fromToRegex);
  if (fromToMatch && fromToMatch[1] && fromToMatch[2]) {
    const origin = fromToMatch[1].trim();
    const dest = fromToMatch[2].trim();
    return {
      origin,
      destination: dest,
      target: dest,
      isTravel: true,
    };
  }

  // Travel patterns: "traveling to X", "travelling to X", "trip to X", "going to X", "flying to X", "visiting X"
  const travelRegex =
    /(?:travell?ing\s+to|trip\s+to|going\s+to|flying\s+to|visiting)\s+([A-Za-z\s]+?)(?:\s+tomorrow|\s+next|\s+this|\s+on|\s+for|\?|\.|$)/i;
  const travelMatch = message.match(travelRegex);
  if (travelMatch && travelMatch[1]) {
    const dest = travelMatch[1].trim();
    if (
      dest.length > 2 &&
      !["the", "my", "our", "an", "a"].includes(dest.toLowerCase())
    ) {
      // Check if query specifies "in X" as current origin: e.g. "I am in Bangalore and travelling to Mumbai"
      const inMatch = message.match(
        /(?:in|at)\s+([A-Za-z\s]+?)\s+(?:and|while|before)/i
      );
      const origin = inMatch ? inMatch[1].trim() : undefined;
      return { destination: dest, target: dest, origin, isTravel: true };
    }
  }

  // Location inquiry patterns: "weather in X", "forecast for X", "rain in X", "temperature in X", "how is the weather in X"
  const weatherInRegex =
    /(?:weather\s+in|forecast\s+for|rain\s+in|snow\s+in|temperature\s+in|how\s+is(?:\s+the)?\s+weather\s+in)\s+([A-Za-z\s]+?)(?:\s+tomorrow|\s+this|\s+next|\s+today|\?|\.|$)/i;
  const weatherInMatch = message.match(weatherInRegex);
  if (weatherInMatch && weatherInMatch[1]) {
    const dest = weatherInMatch[1].trim();
    if (
      dest.length > 2 &&
      !["the", "my", "our", "an", "a"].includes(dest.toLowerCase())
    ) {
      return { destination: dest, target: dest, isTravel: false };
    }
  }

  return { isTravel: false };
}

/**
 * Checks if the user prompt is a general knowledge question or non-weather query
 * (e.g. math, general science, packing lists, conversational greetings)
 */
export function isGeneralNonWeatherQuery(message: string): boolean {
  const lower = message.toLowerCase().trim();

  // Mathematical queries
  if (
    lower.startsWith("calculate") ||
    /^what\s+is\s+\d+[\s\d%+\-*/xX]+/.test(lower) ||
    /^\d+\s*[%+\-*/]\s*\d+/.test(lower) ||
    /\d+%\s+of\s+\d+/.test(lower)
  ) {
    return true;
  }

  // Pure conversational greetings
  if (
    /^(hi|hello|hey|greetings|howdy|what's up|good morning|good evening|good afternoon)[\s!.]*$/i.test(
      lower
    )
  ) {
    return true;
  }

  // General trivia or explanations
  if (
    lower.startsWith("what is the capital") ||
    lower.startsWith("tell me a joke") ||
    lower.startsWith("how do airplanes fly") ||
    lower.startsWith("how does a jet engine work")
  ) {
    return true;
  }

  // General concept explanations (monsoons, physics, chemistry, etc.)
  if (
    /^(explain|how do|how does|what causes|why do|why does|tell me about)\s+(monsoons?|clouds?|hurricanes?|tornadoes?|thunder|lightning|rainbows?|el nino|la nina|coriolis|climate change|global warming)/i.test(
      lower
    )
  ) {
    return true;
  }

  // General packing list without location
  if (
    /^(write|give me|make|create)\s+a\s+(packing|travel)\s+(checklist|list)/i.test(
      lower
    ) &&
    !lower.includes("in ") &&
    !lower.includes("to ")
  ) {
    return true;
  }

  return false;
}

/**
 * Resolves verified meteorological grounding for any query intent:
 * - Active location weather
 * - Destination weather (e.g., traveling to Mumbai)
 * - Explicit coordinates (e.g., 27.9881, 86.9250)
 * - General knowledge questions (no weather data demanded)
 */
export async function resolveQueryGrounding(
  message: string,
  activeLocation?: {
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  }
): Promise<ResolvedIntentGrounding> {
  const coords = extractCoordinates(message);
  if (coords) {
    // Coordinate query
    const coordGrounding = await buildWeatherGroundingSnapshot({
      name: `${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}°`,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timezone: "auto",
    });
    return {
      isWeatherQuery: true,
      isTravelQuery: false,
      primaryGrounding: coordGrounding,
      secondaryGrounding: null,
      detectedTargetName: `${coords.latitude.toFixed(2)}°, ${coords.longitude.toFixed(2)}°`,
    };
  }

  const { destination, isTravel } = extractTargetCity(message);

  if (destination) {
    try {
      const geoService = getGeocodingService();
      const results = await geoService.search({ query: destination, count: 1 });
      const found = results.results[0];

      if (found) {
        const destGrounding = await buildWeatherGroundingSnapshot({
          name: found.name,
          country: found.country,
          latitude: found.latitude,
          longitude: found.longitude,
          timezone: found.timezone || "auto",
        });

        let originGrounding: WeatherGroundingSnapshot | null = null;
        if (isTravel && activeLocation) {
          originGrounding = await buildWeatherGroundingSnapshot({
            name: activeLocation.name,
            country: activeLocation.country,
            latitude: activeLocation.latitude,
            longitude: activeLocation.longitude,
            timezone: activeLocation.timezone || "auto",
          });
        }

        return {
          isWeatherQuery: true,
          isTravelQuery: isTravel,
          primaryGrounding: destGrounding,
          secondaryGrounding: originGrounding,
          detectedTargetName: found.name,
        };
      }
    } catch {
      // Fall through to active location
    }
  }

  if (isGeneralNonWeatherQuery(message)) {
    return {
      isWeatherQuery: false,
      isTravelQuery: false,
      primaryGrounding: null,
      secondaryGrounding: null,
    };
  }

  // Default: ground in active location if provided
  let activeGrounding: WeatherGroundingSnapshot | null = null;
  if (activeLocation) {
    activeGrounding = await buildWeatherGroundingSnapshot({
      name: activeLocation.name,
      country: activeLocation.country,
      latitude: activeLocation.latitude,
      longitude: activeLocation.longitude,
      timezone: activeLocation.timezone || "auto",
    });
  }

  return {
    isWeatherQuery: true,
    isTravelQuery: false,
    primaryGrounding: activeGrounding,
    secondaryGrounding: null,
    detectedTargetName: activeLocation?.name,
  };
}
