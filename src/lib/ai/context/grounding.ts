import { WeatherService, getWeatherService } from "../../weather/service";
import { WMO_CODE_MAP } from "../../weather/domain/weather";
import { WeatherGroundingSnapshot } from "../domain/schemas";
import { UnitPreferences, MetricUnits } from "../../weather/domain/units";

export interface GroundingOptions {
  weatherService?: WeatherService;
  units?: UnitPreferences;
}

/**
 * Builds a verified meteorological grounding snapshot for AI context.
 */
export async function buildWeatherGroundingSnapshot(
  location: {
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  },
  options: GroundingOptions = {}
): Promise<WeatherGroundingSnapshot | null> {
  const service = options.weatherService ?? getWeatherService();
  const units = options.units ?? MetricUnits;

  try {
    const bundle = await service.getWeatherBundle(
      {
        name: location.name,
        country: location.country,
      },
      {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      {
        timezone: location.timezone ?? "auto",
        forecastDays: 7,
        units,
      }
    );

    const currentCondition =
      WMO_CODE_MAP[bundle.current.weatherCode]?.label ?? "Unknown";

    const next24h = bundle.hourly.entries.slice(0, 24).map((entry) => ({
      time: entry.timestamp,
      temperature: entry.temperature,
      precipitationProbability: entry.precipitationProbability ?? 0,
      precipitationAmount: entry.precipitation ?? 0,
      windSpeed: entry.windSpeed ?? 0,
      conditionLabel: WMO_CODE_MAP[entry.weatherCode]?.label ?? "Unknown",
    }));

    const next7d = bundle.daily.days.slice(0, 7).map((day) => ({
      date: day.date,
      temperatureMax: day.temperatureMax,
      temperatureMin: day.temperatureMin,
      precipitationProbability: day.precipitationProbabilityMax ?? 0,
      conditionLabel: WMO_CODE_MAP[day.weatherCode]?.label ?? "Unknown",
      sunrise: day.sunrise ?? undefined,
      sunset: day.sunset ?? undefined,
    }));

    const dataQualityNotes: string[] = [];
    if (bundle.meta.isStale) {
      dataQualityNotes.push(
        "Weather data was served from cache and may be slightly stale."
      );
    }
    const currentVisibility = bundle.hourly.entries[0]?.visibility;
    if (currentVisibility === null || currentVisibility === undefined) {
      dataQualityNotes.push(
        "Direct optical visibility was not reported by provider."
      );
    }
    if (bundle.current.uvIndex === null) {
      dataQualityNotes.push(
        "UV radiation index not available for this station."
      );
    }

    return {
      location: {
        name: location.name,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: bundle.location.timezone,
      },
      fetchedAt: bundle.meta.fetchedAt,
      units: {
        temperature: units.temperature === "celsius" ? "°C" : "°F",
        windSpeed: units.windSpeed,
        precipitation: units.precipitation,
        pressure: units.pressure,
      },
      current: {
        temperature: bundle.current.temperature,
        apparentTemperature: bundle.current.apparentTemperature,
        conditionCode: bundle.current.weatherCode,
        conditionLabel: currentCondition,
        relativeHumidity: bundle.current.relativeHumidity,
        windSpeed: bundle.current.windSpeed,
        windDirection: bundle.current.windDirection,
        precipitation: bundle.current.precipitation,
        pressureMsl: bundle.current.pressureMsl,
        uvIndex: bundle.current.uvIndex ?? undefined,
        visibility: currentVisibility ?? undefined,
      },
      forecastNext24h: next24h,
      forecastNext7d: next7d,
      dataQualityNotes,
    };
  } catch {
    // Return null if weather bundle cannot be fetched so AI can explain limitation
    return null;
  }
}
