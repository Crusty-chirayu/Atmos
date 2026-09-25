import React from "react";
import { WeatherCategory } from "@/lib/weather/domain/weather";

export interface WeatherIconProps {
  category: WeatherCategory;
  isDay?: boolean | null;
  className?: string;
  size?: number;
}

/**
 * Accessible SVG weather iconography tailored to ATMOS design system tokens.
 * Adapts to category, day/night cycle, and container sizing.
 */
export function WeatherIcon({
  category,
  isDay = true,
  className = "",
  size = 24,
}: WeatherIconProps) {
  const day = isDay ?? true;

  switch (category) {
    case "clear":
      if (!day) {
        // Moon icon
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`text-accent-300 ${className}`}
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        );
      }
      // Sun icon
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-gold-400 ${className}`}
        >
          <circle cx="12" cy="12" r="5" />
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
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-accent-400 ${className}`}
        >
          {day ? (
            <>
              <path d="M12 2v2" />
              <path d="M4.93 4.93l1.41 1.41" />
              <path d="M20 12h2" />
              <path d="M19.07 4.93l-1.41 1.41" />
              <path d="M15.5 13a4.5 4.5 0 0 0-4-4.47A5 5 0 0 0 7 13" />
            </>
          ) : (
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          )}
          <path d="M17.5 19H9a5 5 0 1 1 1.4-9.8 4 4 0 0 1 7.1 2.8A3.5 3.5 0 0 1 17.5 19Z" />
        </svg>
      );

    case "cloudy":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-atmos-300 ${className}`}
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
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-atmos-300 ${className}`}
        >
          <path d="M4 14h16" />
          <path d="M4 18h16" />
          <path d="M4 10h16" />
          <path d="M6 6h12" />
        </svg>
      );

    case "drizzle":
    case "showers":
    case "rain":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-accent-400 ${className}`}
        >
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
          <path d="M8 19v2" />
          <path d="M12 19v2" />
          <path d="M16 19v2" />
        </svg>
      );

    case "snow":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-atmos-100 ${className}`}
        >
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
          <path d="M8 19h.01" />
          <path d="M12 19h.01" />
          <path d="M16 19h.01" />
          <path d="M10 22h.01" />
          <path d="M14 22h.01" />
        </svg>
      );

    case "thunderstorm":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-gold-500 ${className}`}
        >
          <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" />
          <polyline points="13 11 9 17 15 17 11 23" />
        </svg>
      );

    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-atmos-300 ${className}`}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      );
  }
}
