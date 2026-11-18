import React from "react";
import {
  WeatherCategory,
  getWeatherConditionInfo,
} from "@/lib/weather/domain/weather";

export interface WeatherIconProps {
  category?: WeatherCategory | string;
  code?: number;
  size?: number;
  className?: string;
  isDay?: boolean;
}

/**
 * Standard, authoritative weather iconography per ATMOS specification.
 *
 * Semantic color palette:
 * - Sun / Clear: #FFC928
 * - Precipitation / Rain / Showers / Drizzle: #3984D6
 * - Cloudy / Fog: #8993A1
 * - Severe / Thunderstorms: #D94841
 * - Unknown / Neutral: #8993A1
 */
export function WeatherIcon({
  category,
  code,
  size = 24,
  className = "",
  isDay = true,
}: WeatherIconProps) {
  // If numeric WMO code is supplied, resolve standard meteorological category
  let cat: string = "clear";
  if (code !== undefined && code !== null) {
    cat = getWeatherConditionInfo(code).category;
  } else if (category) {
    cat = typeof category === "string" ? category.toLowerCase() : "clear";
  }

  const day = isDay ?? true;

  switch (cat) {
    case "clear":
      if (!day) {
        // Crescent Moon for night
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFC928"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`shrink-0 ${className}`}
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        );
      }
      // Radiant Sun
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFC928"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 ${className}`}
        >
          <circle cx="12" cy="12" r="4.5" fill="#FFC928" fillOpacity="0.15" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      );

    case "partly_cloudy":
      // Coherent composite symbol: Sun (#FFC928) behind Cloud (#8993A1) without clipping
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 ${className}`}
        >
          {day ? (
            /* Sun behind cloud */
            <g stroke="#FFC928" strokeWidth="1.8">
              <circle
                cx="15.5"
                cy="8.5"
                r="3"
                fill="#FFC928"
                fillOpacity="0.2"
              />
              <line x1="15.5" y1="2.5" x2="15.5" y2="3.8" />
              <line x1="19.7" y1="4.3" x2="18.8" y2="5.2" />
              <line x1="21.5" y1="8.5" x2="20.2" y2="8.5" />
              <line x1="19.7" y1="12.7" x2="18.8" y2="11.8" />
            </g>
          ) : (
            /* Moon behind cloud */
            <path
              d="M14 4a5 5 0 0 1 5 5 5 5 0 0 1-.8 2.7"
              stroke="#FFC928"
              strokeWidth="1.8"
            />
          )}
          {/* Cloud in neutral grey */}
          <path
            d="M17 19H8a4.5 4.5 0 0 1-.8-8.9 4 4 0 0 1 7.6-1.1A3.5 3.5 0 0 1 17 19Z"
            stroke="#8993A1"
            strokeWidth="1.8"
            fill="#FFFFFF"
            fillOpacity="0.8"
          />
        </svg>
      );

    case "cloudy":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8993A1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 ${className}`}
        >
          <path d="M17.5 19H9a5 5 0 1 1 1.4-9.8 4 4 0 0 1 7.1 2.8A3.5 3.5 0 0 1 17.5 19Z" />
        </svg>
      );

    case "fog":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8993A1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 ${className}`}
        >
          <path d="M4 14h16" />
          <path d="M4 18h16" />
          <path d="M4 10h16" />
          <path d="M6 6h12" />
        </svg>
      );

    case "drizzle":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 ${className}`}
        >
          <path
            d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"
            stroke="#8993A1"
            strokeWidth="1.8"
          />
          <path d="M9 19v1.5" stroke="#3984D6" strokeWidth="2" />
          <path d="M14 19v1.5" stroke="#3984D6" strokeWidth="2" />
        </svg>
      );

    case "showers":
    case "rain":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 ${className}`}
        >
          <path
            d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"
            stroke="#8993A1"
            strokeWidth="1.8"
          />
          <path d="M8 19v2.5" stroke="#3984D6" strokeWidth="2" />
          <path d="M12 19v2.5" stroke="#3984D6" strokeWidth="2" />
          <path d="M16 19v2.5" stroke="#3984D6" strokeWidth="2" />
        </svg>
      );

    case "snow":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 ${className}`}
        >
          <path
            d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"
            stroke="#8993A1"
            strokeWidth="1.8"
          />
          <path d="M8 19h.01" stroke="#3984D6" strokeWidth="2.5" />
          <path d="M12 19h.01" stroke="#3984D6" strokeWidth="2.5" />
          <path d="M16 19h.01" stroke="#3984D6" strokeWidth="2.5" />
          <path d="M10 21.5h.01" stroke="#3984D6" strokeWidth="2.5" />
          <path d="M14 21.5h.01" stroke="#3984D6" strokeWidth="2.5" />
        </svg>
      );

    case "thunderstorm":
      // Severe alert: Cloud with intense lightning bolt in severe red #D94841
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 ${className}`}
        >
          <path
            d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"
            stroke="#8993A1"
            strokeWidth="1.8"
          />
          <polyline
            points="13 11 9 17 15 17 11 23"
            stroke="#D94841"
            strokeWidth="2"
            fill="#D94841"
            fillOpacity="0.2"
          />
        </svg>
      );

    default:
      // Neutral fallback icon
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8993A1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 ${className}`}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      );
  }
}
