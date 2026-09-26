import React from "react";
import { WeatherBundle } from "@/lib/weather/domain/weather";
import { formatLocalTime } from "@/lib/weather/utils/date-format";

export interface WeatherMetricsProps {
  bundle: WeatherBundle;
  units: "metric" | "imperial";
}

/**
 * Auxiliary weather metrics cards for in-depth meteorological details.
 * Clean, bright consumer weather cards.
 */
export function WeatherMetricsComponent({
  bundle,
  units,
}: WeatherMetricsProps) {
  const { current, daily, meta } = bundle;
  const today = daily.days[0];

  const speedUnit = units === "imperial" ? "mph" : "km/h";
  const pressUnit = units === "imperial" ? "inHg" : "hPa";
  const precipUnit = units === "imperial" ? "in" : "mm";

  // Calculate daylight duration if sunrise and sunset are available
  let daylightHours = "";
  if (today?.sunrise && today?.sunset) {
    const rise = new Date(today.sunrise).getTime();
    const set = new Date(today.sunset).getTime();
    if (!isNaN(rise) && !isNaN(set) && set > rise) {
      const diffMs = set - rise;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      daylightHours = `${hours}h ${mins}m daylight`;
    }
  }

  return (
    <section aria-label="Detailed weather telemetry" className="space-y-3">
      <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#222222]">
        Weather Details
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Wind Dynamics & Gusts */}
        <div className="rounded-lg bg-white p-4 sm:p-5 flex flex-col justify-between border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#6B7280]">
              Wind & Gusts
            </span>
            <svg
              className="w-4 h-4 text-[#6B7280]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-bold text-[#222222] tabular-nums">
                {Math.round(current.windSpeed)}
              </span>
              <span className="text-xs text-[#6B7280]">
                {speedUnit}
              </span>
            </div>
            {current.windGusts !== null && current.windGusts !== undefined ? (
              <p className="text-xs text-[#6B7280] mt-1">
                Gusts up to{" "}
                <span className="font-semibold text-[#222222] tabular-nums">
                  {Math.round(current.windGusts)} {speedUnit}
                </span>
              </p>
            ) : today?.windGustsMax ? (
              <p className="text-xs text-[#6B7280] mt-1">
                Peak gusts: {Math.round(today.windGustsMax)} {speedUnit}
              </p>
            ) : (
              <p className="text-xs text-[#6B7280] mt-1">
                Steady wind pattern
              </p>
            )}
          </div>
          <div className="pt-3 border-t border-[#E5E7EB] text-xs text-[#6B7280] flex items-center justify-between">
            <span>Direction: {current.windDirection}°</span>
            <span>
              Dominant:{" "}
              {today?.windDirectionDominant
                ? `${today.windDirectionDominant}°`
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Card 2: Barometric System */}
        <div className="rounded-lg bg-white p-4 sm:p-5 flex flex-col justify-between border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#6B7280]">
              Pressure
            </span>
            <svg
              className="w-4 h-4 text-[#6B7280]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-bold text-[#222222] tabular-nums">
                {Math.round(current.pressureMsl)}
              </span>
              <span className="text-xs text-[#6B7280]">
                {pressUnit}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              {current.pressureMsl > 1015
                ? "High pressure: settled conditions"
                : current.pressureMsl < 1005
                  ? "Low pressure: precipitation risk"
                  : "Normal atmospheric pressure"}
            </p>
          </div>
          <div className="pt-3 border-t border-[#E5E7EB] text-xs text-[#6B7280] flex items-center justify-between">
            <span>
              Surface:{" "}
              {current.surfacePressure
                ? `${Math.round(current.surfacePressure)} ${pressUnit}`
                : "Standard"}
            </span>
            <span>MSL ref</span>
          </div>
        </div>

        {/* Card 3: Precipitation & Moisture */}
        <div className="rounded-lg bg-white p-4 sm:p-5 flex flex-col justify-between border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#6B7280]">
              Precipitation
            </span>
            <svg
              className="w-4 h-4 text-[#4A90E2]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-bold text-[#222222] tabular-nums">
                {today?.precipitationSum ?? current.precipitation}
              </span>
              <span className="text-xs text-[#6B7280]">
                {precipUnit} today
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              {today?.precipitationProbabilityMax
                ? `${today.precipitationProbabilityMax}% chance of rain`
                : "No significant accumulation"}
            </p>
          </div>
          <div className="pt-3 border-t border-[#E5E7EB] text-xs text-[#6B7280] flex items-center justify-between">
            <span>Rain: {current.rain ?? 0} {precipUnit}</span>
            <span>Showers: {current.showers ?? 0} {precipUnit}</span>
          </div>
        </div>

        {/* Card 4: Celestial & Solar Progression */}
        <div className="rounded-lg bg-white p-4 sm:p-5 flex flex-col justify-between border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#6B7280]">
              Sun & Daylight
            </span>
            <svg
              className="w-4 h-4 text-[#FFC928]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </div>
          <div>
            <div className="flex justify-between items-baseline my-1">
              <div>
                <span className="text-xs block text-[#6B7280]">Sunrise</span>
                <span className="text-sm font-bold text-[#222222] tabular-nums">
                  {today?.sunrise
                    ? formatLocalTime(today.sunrise, meta.timezone, {
                        hour12: true,
                      })
                    : "--"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs block text-[#6B7280]">Sunset</span>
                <span className="text-sm font-bold text-[#222222] tabular-nums">
                  {today?.sunset
                    ? formatLocalTime(today.sunset, meta.timezone, {
                        hour12: true,
                      })
                    : "--"}
                </span>
              </div>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              {daylightHours || (current.isDay ? "Daylight active" : "Nighttime")}
            </p>
          </div>
          <div className="pt-3 border-t border-[#E5E7EB] text-xs text-[#6B7280] flex items-center justify-between">
            <span>UV Max: {today?.uvIndexMax ?? "--"}</span>
            <span>{current.isDay ? "Daylight" : "Night"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export { WeatherMetricsComponent as WeatherMetrics };
