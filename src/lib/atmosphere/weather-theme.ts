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
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(0 212 255 / 0.16) 0%, rgb(245 200 66 / 0.08) 45%, var(--surface-base) 80%)",
    ambientColor: "#162847",
    lightColor: "#ffd67e",
    particles: {
      type: "solar-dust",
      count: 35,
      color: "#ffea9f",
      speed: 0.3,
      size: 1.5,
    },
    lightning: false,
  },
  "clear-night": {
    id: "clear-night",
    label: "Clear Night",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(56 120 220 / 0.12) 0%, rgb(20 30 55 / 0.3) 50%, var(--surface-base) 85%)",
    ambientColor: "#080e1d",
    lightColor: "#8ab4f8",
    particles: {
      type: "stars",
      count: 65,
      color: "#c2d5f0",
      speed: 0.1,
      size: 1.2,
    },
    lightning: false,
  },
  "partly-cloudy-day": {
    id: "partly-cloudy-day",
    label: "Partly Cloudy",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(0 212 255 / 0.12) 0%, rgb(90 126 181 / 0.1) 40%, var(--surface-base) 80%)",
    ambientColor: "#142238",
    lightColor: "#ffe8a3",
    particles: {
      type: "clouds",
      count: 20,
      color: "#8aace0",
      speed: 0.25,
      size: 2.2,
    },
    lightning: false,
  },
  "partly-cloudy-night": {
    id: "partly-cloudy-night",
    label: "Partly Cloudy Night",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(40 70 120 / 0.15) 0%, rgb(15 25 45 / 0.3) 50%, var(--surface-base) 85%)",
    ambientColor: "#091022",
    lightColor: "#7e9bc4",
    particles: {
      type: "stars",
      count: 40,
      color: "#8aace0",
      speed: 0.1,
      size: 1.2,
    },
    lightning: false,
  },
  overcast: {
    id: "overcast",
    label: "Overcast",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(90 126 181 / 0.14) 0%, rgb(30 45 70 / 0.2) 50%, var(--surface-base) 85%)",
    ambientColor: "#121b2d",
    lightColor: "#a3b8d8",
    particles: {
      type: "clouds",
      count: 30,
      color: "#5a7eb5",
      speed: 0.2,
      size: 2.5,
    },
    lightning: false,
  },
  fog: {
    id: "fog",
    label: "Fog & Mist",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(138 172 224 / 0.15) 0%, rgb(42 63 96 / 0.25) 50%, var(--surface-base) 85%)",
    ambientColor: "#162035",
    lightColor: "#9bb0cf",
    particles: {
      type: "clouds",
      count: 40,
      color: "#c2d5f0",
      speed: 0.15,
      size: 3.0,
    },
    lightning: false,
  },
  rain: {
    id: "rain",
    label: "Rain",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(0 170 212 / 0.16) 0%, rgb(20 35 60 / 0.3) 50%, var(--surface-base) 85%)",
    ambientColor: "#0d182b",
    lightColor: "#729ccf",
    particles: {
      type: "rain",
      count: 70,
      color: "#00d4ff",
      speed: 4.0,
      size: 1.0,
    },
    lightning: false,
  },
  snow: {
    id: "snow",
    label: "Snow",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(200 230 255 / 0.18) 0%, rgb(30 45 75 / 0.25) 50%, var(--surface-base) 85%)",
    ambientColor: "#18263d",
    lightColor: "#d9e8ff",
    particles: {
      type: "snow",
      count: 55,
      color: "#ffffff",
      speed: 0.8,
      size: 2.0,
    },
    lightning: false,
  },
  thunderstorm: {
    id: "thunderstorm",
    label: "Thunderstorm",
    backgroundGradient:
      "radial-gradient(ellipse 90% 70% at 50% -20%, rgb(126 50 200 / 0.2) 0%, rgb(20 25 50 / 0.4) 45%, var(--surface-base) 85%)",
    ambientColor: "#120f26",
    lightColor: "#d0b0ff",
    particles: {
      type: "rain",
      count: 75,
      color: "#7eebff",
      speed: 5.5,
      size: 1.2,
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
