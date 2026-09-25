import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WeatherService } from "@/lib/weather/service";
import { ProviderRegistry } from "@/lib/weather/providers/registry";
import { OpenMeteoAdapter } from "@/lib/weather/providers/open-meteo/adapter";
import { mockOpenMeteoForecastResponse } from "../fixtures/weather-fixtures";

describe("WeatherService - Batch Weather Retrieval", () => {
  const mockAdapter = new OpenMeteoAdapter({
    fetchFn: async (url) => {
      // If latitude is 999 (invalid dummy), simulate provider failure
      if (String(url).includes("999")) {
        return new Response(
          JSON.stringify({ error: true, reason: "Invalid coordinate" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      return new Response(JSON.stringify(mockOpenMeteoForecastResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  const registry = new ProviderRegistry();
  registry.register(mockAdapter, true);
  const service = new WeatherService({ registry });

  it("fetches weather bundles across multiple locations in parallel", async () => {
    const locations = [
      { id: "city-1", name: "London", latitude: 51.5, longitude: -0.12 },
      { id: "city-2", name: "Tokyo", latitude: 35.6, longitude: 139.6 },
      { id: "city-3", name: "New York", latitude: 40.7, longitude: -74.0 },
    ];

    const results = await service.getBatchWeather(locations, {
      maxConcurrency: 3,
    });

    assert.equal(results.length, 3);
    for (const item of results) {
      assert.ok(item.bundle);
      assert.equal(item.bundle.meta.provider, "open-meteo");
      assert.equal(typeof item.bundle.current.temperature, "number");
    }
  });

  it("isolates errors for invalid locations without failing the entire batch", async () => {
    const locations = [
      { id: "valid-1", name: "Paris", latitude: 48.8, longitude: 2.3 },
      { id: "invalid-1", name: "BadCoords", latitude: 95, longitude: 0 }, // Schema bounds rejection (> 90)
      { id: "valid-2", name: "Berlin", latitude: 52.5, longitude: 13.4 },
    ];

    const results = await service.getBatchWeather(locations);

    assert.equal(results.length, 3);
    // Location 0 should succeed
    assert.equal(results[0].id, "valid-1");
    assert.ok(results[0].bundle);

    // Location 1 should have caught an error
    assert.equal(results[1].id, "invalid-1");
    assert.ok(results[1].error);
    assert.equal(results[1].bundle, undefined);

    // Location 2 should succeed despite Location 1's failure
    assert.equal(results[2].id, "valid-2");
    assert.ok(results[2].bundle);
  });
});
