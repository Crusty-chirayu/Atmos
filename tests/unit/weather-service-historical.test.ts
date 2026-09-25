import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WeatherService } from "@/lib/weather/service";
import { ProviderRegistry } from "@/lib/weather/providers/registry";
import { OpenMeteoAdapter } from "@/lib/weather/providers/open-meteo/adapter";
import { mockOpenMeteoArchiveResponse } from "../fixtures/weather-fixtures";
import { ImperialUnits } from "@/lib/weather/domain/units";

describe("WeatherService - Historical Weather Reanalysis", () => {
  let callCount = 0;
  const mockAdapter = new OpenMeteoAdapter({
    fetchFn: async () => {
      callCount++;
      return new Response(JSON.stringify(mockOpenMeteoArchiveResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  const registry = new ProviderRegistry();
  registry.register(mockAdapter, true);
  const service = new WeatherService({ registry });

  it("retrieves and maps historical daily summaries accurately", async () => {
    callCount = 0;
    const res = await service.getHistoricalWeather({
      latitude: 51.5,
      longitude: -0.12,
      startDate: "2025-09-25",
      endDate: "2025-09-26",
    });

    assert.equal(callCount, 1);
    assert.equal(res.startDate, "2025-09-25");
    assert.equal(res.endDate, "2025-09-26");
    assert.ok(res.dailySummaries.length >= 2);

    const firstDay = res.dailySummaries[0];
    assert.equal(firstDay.date, "2025-09-25");
    // Canonical values from fixture: max: 21.0°C, min: 13.5°C
    assert.equal(firstDay.temperatureMax, 21.0);
    assert.equal(firstDay.temperatureMin, 13.5);
    assert.ok(res.dataSource.includes("ERA5"));
  });

  it("applies presentation unit conversions (Imperial) to historical weather", async () => {
    const res = await service.getHistoricalWeather(
      {
        latitude: 51.5,
        longitude: -0.12,
        startDate: "2025-09-25",
        endDate: "2025-09-26",
      },
      {
        units: ImperialUnits,
      }
    );

    const firstDay = res.dailySummaries[0];
    // Canonical 21.0°C converts to 69.8°F
    assert.ok(firstDay.temperatureMax > 65);
    assert.ok(firstDay.temperatureMax < 75);
    // Canonical 13.5°C converts to 56.3°F
    assert.ok(firstDay.temperatureMin > 50);
  });

  it("serves subsequent requests from cache without invoking provider again", async () => {
    const initialCalls = callCount;
    await service.getHistoricalWeather({
      latitude: 51.5,
      longitude: -0.12,
      startDate: "2025-09-25",
      endDate: "2025-09-26",
    });

    assert.equal(callCount, initialCalls); // Cache hit
  });
});
