import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildWeatherGroundingSnapshot } from "@/lib/ai/context/grounding";
import { WeatherService } from "@/lib/weather/service";
import { ProviderRegistry } from "@/lib/weather/providers/registry";
import { OpenMeteoAdapter } from "@/lib/weather/providers/open-meteo/adapter";
import { mockOpenMeteoForecastResponse } from "../fixtures/weather-fixtures";
import { ImperialUnits } from "@/lib/weather/domain/units";

describe("buildWeatherGroundingSnapshot", () => {
  const mockAdapter = new OpenMeteoAdapter({
    fetchFn: async () =>
      new Response(JSON.stringify(mockOpenMeteoForecastResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  });

  const registry = new ProviderRegistry();
  registry.register(mockAdapter, true);
  const weatherService = new WeatherService({ registry });

  it("builds a grounded context snapshot from real service output", async () => {
    const snapshot = await buildWeatherGroundingSnapshot(
      {
        name: "Berlin",
        country: "Germany",
        latitude: 52.52,
        longitude: 13.41,
        timezone: "Europe/Berlin",
      },
      { weatherService }
    );

    assert.ok(snapshot);
    assert.equal(snapshot.location.name, "Berlin");
    assert.equal(snapshot.location.country, "Germany");
    assert.equal(snapshot.units.temperature, "°C");
    assert.equal(typeof snapshot.current?.temperature, "number");
    assert.equal(typeof snapshot.current?.apparentTemperature, "number");
    assert.ok(snapshot.forecastNext24h);
    assert.ok(snapshot.forecastNext24h.length > 0);
    assert.ok(snapshot.forecastNext7d);
    assert.ok(snapshot.forecastNext7d.length > 0);
  });

  it("respects unit preferences (Imperial)", async () => {
    const snapshot = await buildWeatherGroundingSnapshot(
      {
        name: "Chicago",
        country: "United States",
        latitude: 41.87,
        longitude: -87.62,
      },
      {
        weatherService,
        units: ImperialUnits,
      }
    );

    assert.ok(snapshot);
    assert.equal(snapshot.units.temperature, "°F");
    assert.equal(snapshot.units.windSpeed, "mph");
    assert.equal(snapshot.units.pressure, "inhg");
  });

  it("returns null gracefully if weather fetching fails", async () => {
    const failingAdapter = new OpenMeteoAdapter({
      fetchFn: async () => {
        throw new Error("Network unreachable");
      },
    });
    const failingRegistry = new ProviderRegistry();
    failingRegistry.register(failingAdapter, true);
    const failingService = new WeatherService({ registry: failingRegistry });

    const snapshot = await buildWeatherGroundingSnapshot(
      {
        name: "Lost City",
        latitude: 0,
        longitude: 0,
      },
      { weatherService: failingService }
    );

    assert.equal(snapshot, null);
  });
});
