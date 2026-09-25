import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GeocodingService } from "@/lib/geocoding/service";
import { GeocodingProviderRegistry } from "@/lib/geocoding/providers/registry";
import { OpenMeteoGeocodingAdapter } from "@/lib/geocoding/providers/open-meteo/adapter";
import {
  MemoryGeocodingCache,
  RequestDeduplicator,
} from "@/lib/geocoding/cache/cache";
import { WeatherService } from "@/lib/weather/service";
import { ProviderRegistry } from "@/lib/weather/providers/registry";
import { OpenMeteoAdapter } from "@/lib/weather/providers/open-meteo/adapter";
import { MemoryWeatherCache } from "@/lib/weather/cache/cache";
import {
  MOCK_LONDON_SEARCH_RESPONSE,
  MOCK_PARIS_SEARCH_RESPONSE,
} from "../fixtures/geocoding-fixtures";
import { mockOpenMeteoForecastResponse } from "../fixtures/weather-fixtures";

describe("GeocodingService Integration", () => {
  it("serves from cache on subsequent calls and re-queries when bypassCache is set", async () => {
    let fetchCount = 0;

    const mockAdapter = new OpenMeteoGeocodingAdapter({
      fetchFn: async () => {
        fetchCount++;
        return new Response(JSON.stringify(MOCK_LONDON_SEARCH_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    const registry = new GeocodingProviderRegistry();
    registry.register(mockAdapter, true);

    const cache = new MemoryGeocodingCache();
    const service = new GeocodingService({ registry, cache });

    // 1. First search -> Cache Miss
    const res1 = await service.search({ query: "London" });
    assert.equal(fetchCount, 1);
    assert.equal(res1.isCached, false);
    assert.equal(res1.results.length, 3);

    // 2. Second search -> Cache Hit
    const res2 = await service.search({ query: "London" });
    assert.equal(fetchCount, 1);
    assert.equal(res2.isCached, true);
    assert.equal(res2.results[0].name, "London");

    // 3. Bypass cache -> Cache Bypass & Update
    const res3 = await service.search(
      { query: "London" },
      { bypassCache: true }
    );
    assert.equal(fetchCount, 2);
    assert.equal(res3.isCached, false);
  });

  it("coalesces concurrent search calls into a single upstream request", async () => {
    let fetchCount = 0;

    const mockAdapter = new OpenMeteoGeocodingAdapter({
      fetchFn: async () => {
        fetchCount++;
        await new Promise((r) => setTimeout(r, 40));
        return new Response(JSON.stringify(MOCK_PARIS_SEARCH_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    const registry = new GeocodingProviderRegistry();
    registry.register(mockAdapter, true);

    const service = new GeocodingService({
      registry,
      cache: new MemoryGeocodingCache(),
      deduplicator: new RequestDeduplicator(),
    });

    const [res1, res2, res3] = await Promise.all([
      service.search({ query: "Paris" }),
      service.search({ query: "Paris" }),
      service.search({ query: "Paris" }),
    ]);

    assert.equal(fetchCount, 1);
    assert.equal(res1.results.length, 2);
    assert.equal(res2.results.length, 2);
    assert.equal(res3.results.length, 2);
  });

  it("ranks results and limits output to requested count", async () => {
    const mockAdapter = new OpenMeteoGeocodingAdapter({
      fetchFn: async () => {
        return new Response(JSON.stringify(MOCK_LONDON_SEARCH_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    const registry = new GeocodingProviderRegistry();
    registry.register(mockAdapter, true);
    const service = new GeocodingService({ registry });

    const searchResult = await service.search({ query: "London", count: 2 });
    assert.equal(searchResult.results.length, 2);
    // Highest population London (UK) should be first
    assert.equal(searchResult.results[0].countryCode, "GB");
    assert.equal(searchResult.results[0].name, "London");
  });

  it("seamlessly feeds resolved geocoding location into WeatherService", async () => {
    // 1. Geocoding mock setup
    const geocodingAdapter = new OpenMeteoGeocodingAdapter({
      fetchFn: async () => {
        return new Response(JSON.stringify(MOCK_LONDON_SEARCH_RESPONSE), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });
    const geocodingRegistry = new GeocodingProviderRegistry();
    geocodingRegistry.register(geocodingAdapter, true);
    const geocodingService = new GeocodingService({
      registry: geocodingRegistry,
    });

    // 2. Weather mock setup
    const weatherAdapter = new OpenMeteoAdapter({
      fetchFn: async () => {
        return new Response(JSON.stringify(mockOpenMeteoForecastResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });
    const weatherRegistry = new ProviderRegistry();
    weatherRegistry.register(weatherAdapter, true);
    const weatherService = new WeatherService({
      registry: weatherRegistry,
      cache: new MemoryWeatherCache(),
    });

    // Step A: Search for location
    const searchResponse = await geocodingService.search({ query: "London" });
    assert.ok(searchResponse.results.length > 0);
    const topLocation = searchResponse.results[0];

    // Step B: Pass location coordinates directly into WeatherService
    const weather = await weatherService.getCurrentWeather({
      latitude: topLocation.latitude,
      longitude: topLocation.longitude,
    });

    assert.ok(weather.current);
    assert.equal(typeof weather.current.temperature, "number");
    assert.equal(weather.meta.provider, "open-meteo");

    // Step C: Also test complete weather bundle with location metadata
    const bundle = await weatherService.getWeatherBundle(
      topLocation.name,
      {
        latitude: topLocation.latitude,
        longitude: topLocation.longitude,
      },
      { timezone: topLocation.timezone }
    );

    assert.equal(bundle.location.name, "London");
    assert.equal(bundle.location.latitude, 51.51); // Normalized to 2 decimal places
    assert.equal(bundle.location.longitude, -0.13); // Normalized to 2 decimal places
    assert.ok(bundle.hourly.entries.length > 0);
    assert.ok(bundle.daily.days.length > 0);
  });
});
