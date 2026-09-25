import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ProviderRegistry } from "../../src/lib/weather/providers/registry";
import {
  WeatherProvider,
  ProviderCapabilities,
} from "../../src/lib/weather/providers/types";
import { WeatherError } from "../../src/lib/weather/errors/weather-error";

describe("ProviderRegistry", () => {
  it("initializes with Open-Meteo as the default provider", () => {
    const registry = new ProviderRegistry();
    const defaultProvider = registry.getDefault();
    assert.equal(defaultProvider.id, "open-meteo");
    assert.equal(defaultProvider.capabilities.name, "Open-Meteo");
    assert.equal(defaultProvider.capabilities.maxForecastDays, 16);
  });

  it("lists registered provider capabilities", () => {
    const registry = new ProviderRegistry();
    const caps = registry.listCapabilities();
    assert.ok(caps.length >= 1);
    assert.equal(caps[0]?.id, "open-meteo");
  });

  it("registers an alternate provider and allows setting as default", () => {
    const registry = new ProviderRegistry();

    const mockCapabilities: ProviderCapabilities = {
      id: "mock-alternate",
      name: "Mock Alternate Provider",
      supportsCurrent: true,
      supportsHourlyForecast: true,
      supportsDailyForecast: true,
      maxForecastDays: 10,
      supportsHistorical: false,
      supportsAirQuality: true,
      requiresApiKey: true,
      attribution: "Data by Mock Provider",
    };

    const mockProvider: WeatherProvider = {
      id: "mock-alternate",
      capabilities: mockCapabilities,
      getCurrent: async () => {
        throw new Error("Not implemented in mock");
      },
      getForecast: async () => {
        throw new Error("Not implemented in mock");
      },
      getHistorical: async () => {
        throw new Error("Not implemented in mock");
      },
    };

    registry.register(mockProvider, true);

    assert.equal(registry.getDefault().id, "mock-alternate");
    assert.equal(registry.get("open-meteo").id, "open-meteo");
    assert.equal(registry.listCapabilities().length, 2);
  });

  it("throws structured WeatherError when requesting an unknown provider", () => {
    const registry = new ProviderRegistry();
    assert.throws(
      () => {
        registry.get("unknown-weather-provider");
      },
      (err: unknown) => {
        assert.ok(err instanceof WeatherError);
        assert.equal(err.code, "INVALID_PARAMETERS");
        assert.ok(err.message.includes("unknown-weather-provider"));
        return true;
      }
    );
  });
});
