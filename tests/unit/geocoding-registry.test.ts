import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GeocodingProviderRegistry,
  getGeocodingProviderRegistry,
} from "@/lib/geocoding/providers/registry";
import { GeocodingProvider } from "@/lib/geocoding/providers/types";
import { WeatherError } from "@/lib/weather/errors/weather-error";

describe("GeocodingProviderRegistry", () => {
  it("initializes with Open-Meteo as the default provider", () => {
    const registry = new GeocodingProviderRegistry();
    const defaultProvider = registry.getDefault();

    assert.equal(defaultProvider.id, "open-meteo");
    assert.equal(defaultProvider.capabilities.supportsMultilingual, true);
    assert.equal(defaultProvider.capabilities.supportsCountryFiltering, true);
  });

  it("lists registered provider capabilities", () => {
    const registry = new GeocodingProviderRegistry();
    const caps = registry.listCapabilities();

    assert.equal(caps.length, 1);
    assert.equal(caps[0].id, "open-meteo");
    assert.ok(caps[0].attribution.includes("GeoNames"));
  });

  it("registers an alternate provider and allows setting as default", () => {
    const registry = new GeocodingProviderRegistry();

    const mockAlternateProvider: GeocodingProvider = {
      id: "mock-geocoder",
      capabilities: {
        id: "mock-geocoder",
        name: "Mock Geocoder",
        supportsMultilingual: false,
        supportsCountryFiltering: false,
        maxResults: 10,
        requiresApiKey: true,
        attribution: "Mock Provider Data",
      },
      search: async () => ({ results: [] }),
    };

    registry.register(mockAlternateProvider);
    assert.equal(registry.has("mock-geocoder"), true);

    registry.setDefault("mock-geocoder");
    assert.equal(registry.getDefault().id, "mock-geocoder");
  });

  it("throws structured WeatherError when requesting an unknown provider", () => {
    const registry = new GeocodingProviderRegistry();
    assert.throws(
      () => registry.get("non-existent-provider"),
      (err: unknown) => {
        assert.ok(err instanceof WeatherError);
        assert.equal(err.code, "INVALID_PARAMETERS");
        return true;
      }
    );
  });

  it("getGeocodingProviderRegistry returns a consistent singleton instance", () => {
    const reg1 = getGeocodingProviderRegistry();
    const reg2 = getGeocodingProviderRegistry();
    assert.equal(reg1, reg2);
  });
});
