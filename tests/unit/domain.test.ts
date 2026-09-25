import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CoordinatesSchema,
  LocationSchema,
  normalizeCoordinates,
} from "../../src/lib/weather/domain/location";
import {
  ForecastQueryOptionsSchema,
  HistoricalQueryOptionsSchema,
} from "../../src/lib/weather/domain/schemas";
import {
  WMO_CODE_MAP,
  getWeatherConditionInfo,
} from "../../src/lib/weather/domain/weather";

describe("Domain Models & Schemas", () => {
  describe("CoordinatesSchema", () => {
    it("accepts valid coordinates at standard locations", () => {
      const parsed = CoordinatesSchema.safeParse({
        latitude: 51.5074,
        longitude: -0.1278,
      });
      assert.ok(parsed.success);
      assert.equal(parsed.data.latitude, 51.5074);
      assert.equal(parsed.data.longitude, -0.1278);
    });

    it("accepts boundary coordinates (-90, 90, -180, 180)", () => {
      assert.ok(
        CoordinatesSchema.safeParse({ latitude: 90, longitude: 180 }).success
      );
      assert.ok(
        CoordinatesSchema.safeParse({ latitude: -90, longitude: -180 }).success
      );
      assert.ok(
        CoordinatesSchema.safeParse({ latitude: 0, longitude: 0 }).success
      );
    });

    it("rejects latitude out of bounds (> 90 or < -90)", () => {
      assert.ok(
        !CoordinatesSchema.safeParse({ latitude: 90.1, longitude: 0 }).success
      );
      assert.ok(
        !CoordinatesSchema.safeParse({ latitude: -90.001, longitude: 0 })
          .success
      );
    });

    it("rejects longitude out of bounds (> 180 or < -180)", () => {
      assert.ok(
        !CoordinatesSchema.safeParse({ latitude: 0, longitude: 180.1 }).success
      );
      assert.ok(
        !CoordinatesSchema.safeParse({ latitude: 0, longitude: -180.5 }).success
      );
    });

    it("rejects non-numeric coordinates", () => {
      assert.ok(
        !CoordinatesSchema.safeParse({ latitude: "51.5", longitude: "-0.1" })
          .success
      );
      assert.ok(
        !CoordinatesSchema.safeParse({ latitude: NaN, longitude: 0 }).success
      );
    });
  });

  describe("normalizeCoordinates", () => {
    it("rounds coordinates to default 2 decimal places to prevent cache fragmentation", () => {
      const norm = normalizeCoordinates({
        latitude: 51.507351,
        longitude: -0.127758,
      });
      assert.equal(norm.latitude, 51.51);
      assert.equal(norm.longitude, -0.13);
    });

    it("preserves exact precision when custom precision specified", () => {
      const norm = normalizeCoordinates(
        { latitude: 51.5074, longitude: -0.1278 },
        3
      );
      assert.equal(norm.latitude, 51.507);
      assert.equal(norm.longitude, -0.128);
    });
  });

  describe("LocationSchema", () => {
    it("validates full location model", () => {
      const parsed = LocationSchema.safeParse({
        name: "London",
        latitude: 51.51,
        longitude: -0.13,
        country: "United Kingdom",
        countryCode: "GB",
        timezone: "Europe/London",
        elevation: 25,
      });
      assert.ok(parsed.success);
      assert.equal(parsed.data.name, "London");
      assert.equal(parsed.data.countryCode, "GB");
    });

    it("rejects empty location name", () => {
      const parsed = LocationSchema.safeParse({
        name: "",
        latitude: 51.51,
        longitude: -0.13,
      });
      assert.ok(!parsed.success);
    });
  });

  describe("ForecastQueryOptionsSchema", () => {
    it("applies default values for forecast query", () => {
      const parsed = ForecastQueryOptionsSchema.safeParse({
        latitude: 40.71,
        longitude: -74.01,
      });
      assert.ok(parsed.success);
      assert.equal(parsed.data.timezone, "auto");
      assert.equal(parsed.data.forecastDays, 7);
      assert.equal(parsed.data.includeHourly, true);
      assert.equal(parsed.data.includeDaily, true);
      assert.equal(parsed.data.includeCurrent, true);
    });

    it("enforces forecastDays upper bound of 16 (Open-Meteo limit)", () => {
      assert.ok(
        ForecastQueryOptionsSchema.safeParse({
          latitude: 40.71,
          longitude: -74.01,
          forecastDays: 16,
        }).success
      );

      assert.ok(
        !ForecastQueryOptionsSchema.safeParse({
          latitude: 40.71,
          longitude: -74.01,
          forecastDays: 17,
        }).success
      );
    });
  });

  describe("HistoricalQueryOptionsSchema", () => {
    it("accepts valid historical date range", () => {
      const parsed = HistoricalQueryOptionsSchema.safeParse({
        latitude: 48.85,
        longitude: 2.35,
        startDate: "2024-01-01",
        endDate: "2024-01-10",
      });
      assert.ok(parsed.success);
      assert.equal(parsed.data.startDate, "2024-01-01");
      assert.equal(parsed.data.endDate, "2024-01-10");
    });

    it("rejects startDate after endDate", () => {
      const parsed = HistoricalQueryOptionsSchema.safeParse({
        latitude: 48.85,
        longitude: 2.35,
        startDate: "2024-01-10",
        endDate: "2024-01-01",
      });
      assert.ok(!parsed.success);
    });

    it("rejects invalid date formats (not YYYY-MM-DD)", () => {
      assert.ok(
        !HistoricalQueryOptionsSchema.safeParse({
          latitude: 48.85,
          longitude: 2.35,
          startDate: "01-01-2024",
          endDate: "2024-01-10",
        }).success
      );
    });
  });

  describe("WMO Weather Interpretation Mapping", () => {
    it("maps WMO 0 to Clear sky", () => {
      const info = getWeatherConditionInfo(0);
      assert.equal(info.label, "Clear sky");
      assert.equal(info.category, "clear");
      assert.equal(info.isSevere, false);
    });

    it("identifies severe thunderstorms (WMO 95, 96, 99)", () => {
      assert.ok(getWeatherConditionInfo(95).isSevere);
      assert.ok(getWeatherConditionInfo(96).isSevere);
      assert.ok(getWeatherConditionInfo(99).isSevere);
    });

    it("falls back gracefully for unknown code without crashing", () => {
      const info = getWeatherConditionInfo(999);
      assert.equal(info.category, "unknown");
      assert.ok(info.label.includes("999"));
    });

    it("verifies code map has comprehensive coverage", () => {
      assert.ok(Object.keys(WMO_CODE_MAP).length >= 25);
    });
  });
});
