import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WeatherApiQuerySchema } from "@/lib/weather/domain/schemas";

describe("WeatherApiQuerySchema", () => {
  it("validates valid query parameters with defaults", () => {
    const parsed = WeatherApiQuerySchema.parse({
      lat: 51.5074,
      lon: -0.1278,
    });

    assert.equal(parsed.lat, 51.5074);
    assert.equal(parsed.lon, -0.1278);
    assert.equal(parsed.forecastDays, 7);
    assert.equal(parsed.units, "metric");
    assert.equal(parsed.timezone, "auto");
    assert.equal(parsed.name, "Selected Location");
    assert.equal(parsed.bypassCache, false);
  });

  it("coerces string numbers to numbers safely", () => {
    const parsed = WeatherApiQuerySchema.parse({
      lat: "48.8566",
      lon: "2.3522",
      forecastDays: "14",
    });

    assert.equal(parsed.lat, 48.8566);
    assert.equal(parsed.lon, 2.3522);
    assert.equal(parsed.forecastDays, 14);
  });

  it("accepts geographic boundary coordinates (-90, 90, -180, 180)", () => {
    assert.doesNotThrow(() =>
      WeatherApiQuerySchema.parse({ lat: -90, lon: -180 })
    );
    assert.doesNotThrow(() =>
      WeatherApiQuerySchema.parse({ lat: 90, lon: 180 })
    );
  });

  it("rejects latitude out of bounds (> 90 or < -90)", () => {
    assert.throws(() => WeatherApiQuerySchema.parse({ lat: 90.001, lon: 0 }));
    assert.throws(() => WeatherApiQuerySchema.parse({ lat: -90.001, lon: 0 }));
  });

  it("rejects longitude out of bounds (> 180 or < -180)", () => {
    assert.throws(() => WeatherApiQuerySchema.parse({ lat: 0, lon: 180.001 }));
    assert.throws(() => WeatherApiQuerySchema.parse({ lat: 0, lon: -180.001 }));
  });

  it("enforces forecastDays between 1 and 16", () => {
    assert.doesNotThrow(() =>
      WeatherApiQuerySchema.parse({ lat: 0, lon: 0, forecastDays: 1 })
    );
    assert.doesNotThrow(() =>
      WeatherApiQuerySchema.parse({ lat: 0, lon: 0, forecastDays: 16 })
    );
    assert.throws(() =>
      WeatherApiQuerySchema.parse({ lat: 0, lon: 0, forecastDays: 0 })
    );
    assert.throws(() =>
      WeatherApiQuerySchema.parse({ lat: 0, lon: 0, forecastDays: 17 })
    );
  });

  it("accepts valid unit preferences and rejects unsupported systems", () => {
    assert.equal(
      WeatherApiQuerySchema.parse({ lat: 0, lon: 0, units: "imperial" }).units,
      "imperial"
    );
    assert.equal(
      WeatherApiQuerySchema.parse({ lat: 0, lon: 0, units: "canonical" }).units,
      "canonical"
    );
    assert.throws(() =>
      WeatherApiQuerySchema.parse({ lat: 0, lon: 0, units: "kelvin" })
    );
  });

  it("parses bypassCache query string safely", () => {
    assert.equal(
      WeatherApiQuerySchema.parse({ lat: 0, lon: 0, bypassCache: "true" })
        .bypassCache,
      true
    );
    assert.equal(
      WeatherApiQuerySchema.parse({ lat: 0, lon: 0, bypassCache: "false" })
        .bypassCache,
      false
    );
  });
});
