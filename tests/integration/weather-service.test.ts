import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WeatherService } from "../../src/lib/weather/service";
import { ProviderRegistry } from "../../src/lib/weather/providers/registry";
import { OpenMeteoAdapter } from "../../src/lib/weather/providers/open-meteo/adapter";
import { MemoryWeatherCache } from "../../src/lib/weather/cache/cache";
import { ImperialUnits } from "../../src/lib/weather/domain/units";
import {
  mockOpenMeteoArchiveResponse,
  mockOpenMeteoForecastResponse,
} from "../fixtures/weather-fixtures";

describe("WeatherService Integration", () => {
  function createTestService(callCounter = { count: 0 }) {
    const mockFetch: typeof fetch = async (input) => {
      callCounter.count++;
      const urlStr = input.toString();

      if (urlStr.includes("/v1/archive")) {
        return new Response(JSON.stringify(mockOpenMeteoArchiveResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(mockOpenMeteoForecastResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const adapter = new OpenMeteoAdapter({ fetchFn: mockFetch });
    const registry = new ProviderRegistry();
    registry.register(adapter, true);
    const cache = new MemoryWeatherCache();

    const service = new WeatherService({
      registry,
      cache,
    });

    return { service, cache, callCounter };
  }

  it("serves from cache on subsequent calls and re-fetches when bypassCache is set", async () => {
    const counter = { count: 0 };
    const { service } = createTestService(counter);

    // Call 1: Miss -> fetches upstream
    const res1 = await service.getCurrentWeather({
      latitude: 51.5,
      longitude: -0.12,
    });
    assert.equal(counter.count, 1);
    assert.equal(res1.meta.isCached, false);
    assert.equal(res1.current.temperature, 18.5);

    // Call 2: Hit -> served from cache
    const res2 = await service.getCurrentWeather({
      latitude: 51.504,
      longitude: -0.123,
    }); // Within 2 decimal places (51.50, -0.12)
    assert.equal(
      counter.count,
      1,
      "Cache hit must not increment upstream call counter"
    );
    assert.equal(res2.meta.isCached, true);
    assert.equal(res2.meta.isStale, false);
    assert.equal(res2.current.temperature, 18.5);

    // Call 3: Bypass cache -> fetches upstream
    const res3 = await service.getCurrentWeather(
      { latitude: 51.5, longitude: -0.12 },
      { bypassCache: true }
    );
    assert.equal(counter.count, 2, "Bypass cache must force upstream re-fetch");
    assert.equal(res3.meta.isCached, false);
  });

  it("applies imperial unit preferences to presentation without corrupting cached canonical data", async () => {
    const { service } = createTestService();

    // 1. Fetch with imperial units
    const imperialRes = await service.getCurrentWeather(
      { latitude: 51.5, longitude: -0.12 },
      { units: ImperialUnits }
    );

    // 18.5°C in Fahrenheit = 65.3°F
    assert.ok(Math.abs(imperialRes.current.temperature - 65.3) < 0.2);
    // 14.2 km/h in mph = 8.82 mph
    assert.ok(Math.abs(imperialRes.current.windSpeed - 8.82) < 0.1);
    assert.equal(imperialRes.meta.units.temperature, "fahrenheit");
    assert.equal(imperialRes.meta.units.windSpeed, "mph");

    // 2. Fetch same location from cache with canonical (metric) units
    const metricRes = await service.getCurrentWeather({
      latitude: 51.5,
      longitude: -0.12,
    });
    assert.equal(
      metricRes.current.temperature,
      18.5,
      "Cached canonical temperature must remain 18.5°C"
    );
    assert.equal(
      metricRes.current.windSpeed,
      14.2,
      "Cached canonical wind speed must remain 14.2 km/h"
    );
    assert.equal(metricRes.meta.units.temperature, "celsius");
  });

  it("coalesces concurrent service requests so upstream is queried once", async () => {
    const counter = { count: 0 };
    const { service } = createTestService(counter);

    const [r1, r2, r3, r4] = await Promise.all([
      service.getForecast({ latitude: 40.71, longitude: -74.01 }),
      service.getForecast({ latitude: 40.71, longitude: -74.01 }),
      service.getForecast({ latitude: 40.71, longitude: -74.01 }),
      service.getForecast({ latitude: 40.71, longitude: -74.01 }),
    ]);

    assert.equal(
      counter.count,
      1,
      "Only 1 upstream request should be made for concurrent identical queries"
    );
    assert.ok(r1.current !== undefined);
    assert.ok(r2.current !== undefined);
    assert.ok(r3.current !== undefined);
    assert.ok(r4.current !== undefined);
  });

  it("retrieves complete WeatherBundle with location, current, hourly, and daily", async () => {
    const { service } = createTestService();

    const bundle = await service.getWeatherBundle(
      "London, UK",
      { latitude: 51.5074, longitude: -0.1278 },
      { timezone: "Europe/London", forecastDays: 7 }
    );

    assert.equal(bundle.location.name, "London, UK");
    assert.equal(bundle.location.latitude, 51.51); // normalized
    assert.equal(bundle.location.longitude, -0.13); // normalized
    assert.equal(bundle.current.temperature, 18.5);
    assert.ok(bundle.hourly.entries.length > 0);
    assert.ok(bundle.daily.days.length > 0);
    assert.equal(bundle.meta.provider, "open-meteo");
  });

  it("fetches and caches historical weather", async () => {
    const counter = { count: 0 };
    const { service } = createTestService(counter);

    const hist1 = await service.getHistoricalWeather({
      latitude: 51.5,
      longitude: -0.12,
      startDate: "2025-09-25",
      endDate: "2025-09-26",
    });

    assert.equal(counter.count, 1);
    assert.equal(hist1.dailySummaries.length, 2);

    const hist2 = await service.getHistoricalWeather({
      latitude: 51.5,
      longitude: -0.12,
      startDate: "2025-09-25",
      endDate: "2025-09-26",
    });

    assert.equal(counter.count, 1, "Second historical call should hit cache");
    assert.equal(hist2.dailySummaries.length, 2);
  });
});
