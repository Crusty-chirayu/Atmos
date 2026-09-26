import React from "react";
import { WeatherBundle } from "@/lib/weather/domain/weather";
import { WeatherIcon } from "./weather-icon";
import { formatLocalTime } from "@/lib/weather/utils/date-format";
import { SaveLocationButton } from "./save-location-button";

export interface CurrentConditionsProps {
  bundle: WeatherBundle;
  units: "metric" | "imperial";
  onToggleUnits?: () => void;
}

/**
 * Returns a severity label and badge color for UV index values.
 */
function getUvDescriptor(uv?: number | null): {
  label: string;
  colorClass: string;
} {
  if (uv === null || uv === undefined)
    return { label: "--", colorClass: "text-[#6B7280]" };
  if (uv <= 2) return { label: "Low", colorClass: "text-[#10B981]" };
  if (uv <= 5) return { label: "Moderate", colorClass: "text-[#F59E0B]" };
  if (uv <= 7) return { label: "High", colorClass: "text-[#F97316]" };
  if (uv <= 10) return { label: "Very High", colorClass: "text-[#D94841]" };
  return { label: "Extreme", colorClass: "text-[#D94841] font-bold" };
}

/**
 * Converts wind direction in degrees (0-360) into compass cardinal directions.
 */
function getCompassDirection(deg?: number | null): string {
  if (deg === null || deg === undefined) return "";
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const val = Math.round(deg / 22.5) % 16;
  return directions[val];
}

/**
 * Clean consumer current weather conditions component.
 */
export function CurrentConditions({
  bundle,
  units,
  onToggleUnits,
}: CurrentConditionsProps) {
  const { current, location, meta, daily } = bundle;
  const tempUnit = units === "imperial" ? "°F" : "°C";
  const speedUnit = units === "imperial" ? "mph" : "km/h";
  const precipUnit = units === "imperial" ? "in" : "mm";
  const pressUnit = units === "imperial" ? "inHg" : "hPa";

  // Today's forecast high and low
  const todayForecast = daily?.days?.[0];
  const uvDescriptor = getUvDescriptor(
    current.uvIndex ?? todayForecast?.uvIndexMax
  );

  // Time in the location's specific timezone
  const localTimeString = formatLocalTime(current.timestamp, meta.timezone, {
    hour12: true,
  });

  return (
    <section
      aria-label={`Current weather conditions for ${location.name}`}
      className="rounded-lg bg-white p-5 sm:p-6 border border-[#E5E7EB] shadow-xs"
    >
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        {/* Left Column: Location, Local Time, Temperature, Condition */}
        <div className="flex flex-col justify-between space-y-4 max-w-lg">
          <div>
            {/* Header: Location & Status Pills */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#FFF9E6] text-[#222222] border border-[#FFC928]">
                Current Weather
              </span>
              {location.countryCode && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#F7F7F7] text-[#6B7280] border border-[#E5E7EB]">
                  {location.countryCode}
                </span>
              )}
              {meta.isCached && (
                <span
                  title="Cached response"
                  className="text-xs px-2 py-0.5 rounded bg-[#F7F7F7] text-[#6B7280] border border-[#E5E7EB]"
                >
                  Cached
                </span>
              )}
              <SaveLocationButton
                location={{
                  name: location.name,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  countryCode: location.countryCode,
                  country: location.country,
                  adminArea: location.adminArea,
                }}
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#222222]">
              {location.name}
            </h1>

            <p className="text-sm text-[#6B7280] mt-1 flex flex-wrap items-center gap-1.5">
              {[location.adminArea, location.country].filter(Boolean).length > 0 && (
                <>
                  <span>
                    {[location.adminArea, location.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  <span>·</span>
                </>
              )}
              <span className="font-mono text-xs text-[#737D8A]">
                {Math.abs(location.latitude).toFixed(2)}°{location.latitude >= 0 ? "N" : "S"},{" "}
                {Math.abs(location.longitude).toFixed(2)}°{location.longitude >= 0 ? "E" : "W"}
              </span>
              <span>·</span>
              <span>Local time {localTimeString}</span>
            </p>
          </div>

          {/* Primary Temperature & Weather Icon */}
          <div className="flex items-center gap-6 py-1">
            <div className="flex items-start">
              <span className="font-bold text-6xl sm:text-7xl tracking-tight text-[#222222] tabular-nums">
                {Math.round(current.temperature)}
              </span>
              <button
                type="button"
                onClick={onToggleUnits}
                title={`Current units: ${units}. Click to toggle.`}
                className="text-2xl font-bold ml-1 text-[#FFC928] hover:text-[#F2B900] transition-colors focus:outline-none"
              >
                {tempUnit}
              </button>
            </div>

            <div className="flex flex-col items-center">
              <WeatherIcon
                category={current.conditionCategory}
                isDay={current.isDay}
                size={56}
              />
              <span className="text-sm sm:text-base font-medium capitalize mt-1 text-[#222222] text-center">
                {current.conditionText}
              </span>
            </div>
          </div>

          {/* High / Low & Apparent Temp Sub-bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#6B7280] pt-1">
            <div>
              <span>Feels like </span>
              <span className="font-bold text-[#222222] tabular-nums">
                {Math.round(current.apparentTemperature)}
                {tempUnit}
              </span>
            </div>
            {todayForecast && (
              <>
                <span className="text-[#E5E7EB]">•</span>
                <div>
                  <span>High </span>
                  <span className="font-bold text-[#222222] tabular-nums">
                    {Math.round(todayForecast.temperatureMax)}
                    {tempUnit}
                  </span>
                  <span className="mx-1">/</span>
                  <span>Low </span>
                  <span className="font-bold text-[#222222] tabular-nums">
                    {Math.round(todayForecast.temperatureMin)}
                    {tempUnit}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Environmental Weather Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 self-center w-full lg:w-auto">
          {/* Wind */}
          <div className="p-3 rounded-md flex flex-col justify-between bg-[#F7F7F7] border border-[#E5E7EB]">
            <span className="text-xs text-[#6B7280] font-medium">Wind</span>
            <div className="my-1">
              <span className="text-lg font-bold text-[#222222] tabular-nums">
                {Math.round(current.windSpeed)}
              </span>{" "}
              <span className="text-xs text-[#6B7280]">{speedUnit}</span>
            </div>
            <div className="text-xs flex items-center gap-1 text-[#6B7280]">
              <span
                className="inline-block transform"
                style={{ transform: `rotate(${current.windDirection}deg)` }}
              >
                ↓
              </span>
              <span>
                {getCompassDirection(current.windDirection)} (
                {current.windDirection}°)
              </span>
            </div>
          </div>

          {/* Humidity */}
          <div className="p-3 rounded-md flex flex-col justify-between bg-[#F7F7F7] border border-[#E5E7EB]">
            <span className="text-xs text-[#6B7280] font-medium">Humidity</span>
            <div className="my-1">
              <span className="text-lg font-bold text-[#222222] tabular-nums">
                {Math.round(current.relativeHumidity)}
              </span>{" "}
              <span className="text-xs text-[#6B7280]">%</span>
            </div>
            <span className="text-xs text-[#6B7280]">
              Cloud cover {current.cloudCover}%
            </span>
          </div>

          {/* UV Index */}
          <div className="p-3 rounded-md flex flex-col justify-between bg-[#F7F7F7] border border-[#E5E7EB]">
            <span className="text-xs text-[#6B7280] font-medium">UV Index</span>
            <div className="my-1">
              <span className="text-lg font-bold text-[#222222] tabular-nums">
                {current.uvIndex !== null && current.uvIndex !== undefined
                  ? current.uvIndex
                  : (todayForecast?.uvIndexMax ?? "--")}
              </span>
            </div>
            <span className={`text-xs font-semibold ${uvDescriptor.colorClass}`}>
              {uvDescriptor.label}
            </span>
          </div>

          {/* Atmospheric Pressure */}
          <div className="p-3 rounded-md flex flex-col justify-between bg-[#F7F7F7] border border-[#E5E7EB]">
            <span className="text-xs text-[#6B7280] font-medium">Pressure</span>
            <div className="my-1">
              <span className="text-lg font-bold text-[#222222] tabular-nums">
                {Math.round(current.pressureMsl)}
              </span>{" "}
              <span className="text-xs text-[#6B7280]">{pressUnit}</span>
            </div>
            <span className="text-xs text-[#6B7280]">Barometric</span>
          </div>

          {/* Precipitation */}
          <div className="p-3 rounded-md flex flex-col justify-between bg-[#F7F7F7] border border-[#E5E7EB]">
            <span className="text-xs text-[#6B7280] font-medium">Rain / Precip</span>
            <div className="my-1">
              <span className="text-lg font-bold text-[#222222] tabular-nums">
                {current.precipitation}
              </span>{" "}
              <span className="text-xs text-[#6B7280]">{precipUnit}</span>
            </div>
            <span className="text-xs text-[#4A90E2] font-medium">
              {todayForecast?.precipitationProbabilityMax !== undefined &&
              todayForecast?.precipitationProbabilityMax !== null
                ? `${todayForecast.precipitationProbabilityMax}% chance`
                : "Current rate"}
            </span>
          </div>

          {/* Sun Cycle */}
          <div className="p-3 rounded-md flex flex-col justify-between bg-[#F7F7F7] border border-[#E5E7EB]">
            <span className="text-xs text-[#6B7280] font-medium">Sun Cycle</span>
            <div className="my-1 text-xs space-y-0.5">
              {todayForecast?.sunrise ? (
                <div>
                  <span className="text-[#6B7280]">Rise: </span>
                  <span className="font-semibold text-[#222222] tabular-nums">
                    {formatLocalTime(todayForecast.sunrise, meta.timezone, {
                      hour12: true,
                    })}
                  </span>
                </div>
              ) : null}
              {todayForecast?.sunset ? (
                <div>
                  <span className="text-[#6B7280]">Set: </span>
                  <span className="font-semibold text-[#222222] tabular-nums">
                    {formatLocalTime(todayForecast.sunset, meta.timezone, {
                      hour12: true,
                    })}
                  </span>
                </div>
              ) : null}
            </div>
            <span className="text-xs text-[#6B7280]">
              {current.isDay ? "Daylight" : "Night"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
