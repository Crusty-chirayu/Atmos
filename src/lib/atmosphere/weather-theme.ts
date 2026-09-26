/**
 * Atmospheric visual state mapping and theme definitions.
 *
 * Translates normalized meteorological telemetry (WMO codes, day/night cycles)
 * into high-fidelity visual parameters for the adaptive atmosphere scene and 3D lighting.
 */

export type AtmosphereCondition =
  | "clear-day"
  | "clear-night"
  | "partly-cloudy-day"
  | "partly-cloudy-night"
  | "overcast"
  | "fog"
  | "rain"
  | "snow"
  | "thunderstorm";

export interface AtmosphereTheme {
  id: AtmosphereCondition;
  label: string;
  /** Primary CSS atmospheric radial gradient for backgrounds and fallbacks */
  backgroundGradient: string;
  /** Primary ambient light color (hex) for 3D globe and scene */
  ambientColor: string;
  /** Directional sun / moon light color (hex) */
  lightColor: string;
  /** Particle simulation configuration */
  particles: {
    type: "none" | "solar-dust" | "stars" | "rain" | "snow" | "clouds";
    count: number;
    color: string;
    speed: number;
    size: number;
  };
  /** Whether the condition generates ambient lightning flashes */
  lightning: boolean;
}

/**
 * Resolves WMO weather condition code and day/night status to a normalized atmospheric condition.
 */
export function resolveAtmosphereCondition(
  weatherCode: number,
  isDay: boolean = true
): AtmosphereCondition {
  // Thunderstorm conditions (95, 96, 99)
  if (weatherCode >= 95) {
    return "thunderstorm";
  }

  // Snow conditions (71, 73, 75, 77, 85, 86)
  if (
    (weatherCode >= 71 && weatherCode <= 77) ||
    weatherCode === 85 ||
    weatherCode === 86
  ) {
    return "snow";
  }

  // Rain and drizzle conditions (51..67, 80..82)
  if (
    (weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82)
  ) {
    return "rain";
  }

  // Fog / mist conditions (45, 48)
  if (weatherCode === 45 || weatherCode === 48) {
    return "fog";
  }

  // Overcast (3)
  if (weatherCode === 3) {
    return "overcast";
  }

  // Partly cloudy (2)
  if (weatherCode === 2) {
    return isDay ? "partly-cloudy-day" : "partly-cloudy-night";
  }

  // Clear / mainly clear (0, 1)
  return isDay ? "clear-day" : "clear-night";
}

export const ATMOSPHERE_THEMES: Record<AtmosphereCondition, AtmosphereTheme> = {
  "clear-day": {
    id: "clear-day",
    label: "Clear Day",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(14 165 233 / 0.06) 0%, rgb(30 41 59 / 0.15) 50%, var(--surface-base) 80%)",
    ambientColor: "#162847",
    lightColor: "#ffd67e",
    particles: {
      type: "none",
      count: 0,
      color: "transparent",
      speed: 1.0,
      size: 0,
    },
    lightning: false,
  },
  "clear-night": {
    id: "clear-night",
    label: "Clear Night",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(30 41 59 / 0.2) 0%, rgb(15 23 42 / 0.4) 50%, var(--surface-base) 85%)",
    ambientColor: "#080e1d",
    lightColor: "#8ab4f8",
    particles: {
      type: "none",
      count: 0,
      color: "transparent",
      speed: 1.0,
      size: 0,
    },
    lightning: false,
  },
  "partly-cloudy-day": {
    id: "partly-cloudy-day",
    label: "Partly Cloudy",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(14 165 233 / 0.05) 0%, rgb(30 41 59 / 0.2) 50%, var(--surface-base) 80%)",
    ambientColor: "#142238",
    lightColor: "#ffe8a3",
    particles: {
      type: "none",
      count: 0,
      color: "transparent",
      speed: 1.0,
      size: 0,
    },
    lightning: false,
  },
  "partly-cloudy-night": {
    id: "partly-cloudy-night",
    label: "Partly Cloudy Night",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(20 30 50 / 0.25) 0%, rgb(15 23 42 / 0.4) 50%, var(--surface-base) 85%)",
    ambientColor: "#091022",
    lightColor: "#7e9bc4",
    particles: {
      type: "none",
      count: 0,
      color: "transparent",
      speed: 1.0,
      size: 0,
    },
    lightning: false,
  },
  overcast: {
    id: "overcast",
    label: "Overcast",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(30 41 59 / 0.3) 0%, rgb(15 23 42 / 0.4) 50%, var(--surface-base) 85%)",
    ambientColor: "#121b2d",
    lightColor: "#a3b8d8",
    particles: {
      type: "none",
      count: 0,
      color: "transparent",
      speed: 1.0,
      size: 0,
    },
    lightning: false,
  },
  fog: {
    id: "fog",
    label: "Fog & Mist",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(51 65 85 / 0.25) 0%, rgb(15 23 42 / 0.4) 50%, var(--surface-base) 85%)",
    ambientColor: "#162035",
    lightColor: "#9bb0cf",
    particles: {
      type: "none",
      count: 0,
      color: "transparent",
      speed: 1.0,
      size: 0,
    },
    lightning: false,
  },
  rain: {
    id: "rain",
    label: "Rain",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(15 23 42 / 0.4) 0%, rgb(10 15 29 / 0.6) 50%, var(--surface-base) 85%)",
    ambientColor: "#0d182b",
    lightColor: "#729ccf",
    particles: {
      type: "rain",
      count: 24,
      color: "#38bdf8",
      speed: 3.5,
      size: 1.0,
    },
    lightning: false,
  },
  snow: {
    id: "snow",
    label: "Snow",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(30 41 59 / 0.35) 0%, rgb(15 23 42 / 0.5) 50%, var(--surface-base) 85%)",
    ambientColor: "#18263d",
    lightColor: "#d9e8ff",
    particles: {
      type: "snow",
      count: 20,
      color: "#e2e8f0",
      speed: 0.6,
      size: 1.8,
    },
    lightning: false,
  },
  thunderstorm: {
    id: "thunderstorm",
    label: "Thunderstorm",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(49 46 129 / 0.25) 0%, rgb(15 23 42 / 0.5) 45%, var(--surface-base) 85%)",
    ambientColor: "#120f26",
    lightColor: "#d0b0ff",
    particles: {
      type: "rain",
      count: 30,
      color: "#38bdf8",
      speed: 4.5,
      size: 1.0,
    },
    lightning: true,
  },
};

/**
 * Convenience helper resolving theme directly from weather telemetry.
 */
export function getAtmosphereThemeFromWeather(
  weatherCode: number = 0,
  isDay: boolean = true
): AtmosphereTheme {
  const condition = resolveAtmosphereCondition(weatherCode, isDay);
  return ATMOSPHERE_THEMES[condition];
}
