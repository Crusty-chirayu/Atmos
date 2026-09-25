import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GeocodingLocationSchema,
  GeocodingQuerySchema,
} from "@/lib/geocoding/domain/schemas";
import { formatLocationLabel } from "@/lib/geocoding/domain/types";

describe("Geocoding Domain & Schemas", () => {
  describe("GeocodingQuerySchema", () => {
    it("validates standard search query with default count and language", () => {
      const parsed = GeocodingQuerySchema.parse({ query: "London" });
      assert.equal(parsed.query, "London");
      assert.equal(parsed.count, 10);
      assert.equal(parsed.language, "en");
      assert.equal(parsed.countryCode, undefined);
    });

    it("trims leading and trailing whitespace from query", () => {
      const parsed = GeocodingQuerySchema.parse({ query: "   Berlin   " });
      assert.equal(parsed.query, "Berlin");
    });

    it("rejects query shorter than 2 characters", () => {
      assert.throws(() => {
        GeocodingQuerySchema.parse({ query: "A" });
      });
    });

    it("rejects empty or whitespace-only query", () => {
      assert.throws(() => {
        GeocodingQuerySchema.parse({ query: "   " });
      });
    });

    it("rejects query exceeding 100 characters", () => {
      const longQuery = "A".repeat(101);
      assert.throws(() => {
        GeocodingQuerySchema.parse({ query: longQuery });
      });
    });

    it("accepts valid multilingual and Unicode queries", () => {
      const queries = [
        "München",
        "東京都",
        "São Paulo",
        "Reykjavík",
        "القاهرة",
      ];
      for (const q of queries) {
        const parsed = GeocodingQuerySchema.parse({ query: q });
        assert.equal(parsed.query, q);
      }
    });

    it("enforces count bounds between 1 and 100", () => {
      const min = GeocodingQuerySchema.parse({ query: "Paris", count: 1 });
      assert.equal(min.count, 1);

      const max = GeocodingQuerySchema.parse({ query: "Paris", count: 100 });
      assert.equal(max.count, 100);

      assert.throws(() => {
        GeocodingQuerySchema.parse({ query: "Paris", count: 0 });
      });

      assert.throws(() => {
        GeocodingQuerySchema.parse({ query: "Paris", count: 101 });
      });
    });

    it("normalizes language code to lowercase", () => {
      const parsed = GeocodingQuerySchema.parse({
        query: "Rome",
        language: "DE",
      });
      assert.equal(parsed.language, "de");
    });

    it("normalizes country code to uppercase 2-letter ISO", () => {
      const parsed = GeocodingQuerySchema.parse({
        query: "Sydney",
        countryCode: "au",
      });
      assert.equal(parsed.countryCode, "AU");
    });

    it("rejects invalid country codes that are not 2 letters", () => {
      assert.throws(() => {
        GeocodingQuerySchema.parse({ query: "Sydney", countryCode: "AUS" });
      });
    });
  });

  describe("GeocodingLocationSchema", () => {
    it("validates a complete location item with all optional fields", () => {
      const sample = {
        id: "open-meteo:2643743",
        providerId: "open-meteo",
        sourceId: 2643743,
        name: "London",
        latitude: 51.50853,
        longitude: -0.12574,
        elevation: 25.0,
        featureCode: "PPLC",
        country: "United Kingdom",
        countryCode: "GB",
        adminArea: "England",
        adminArea2: "Greater London",
        timezone: "Europe/London",
        population: 8961936,
        postcodes: ["EC1A"],
        formattedAddress: "London, England, United Kingdom",
      };

      const parsed = GeocodingLocationSchema.parse(sample);
      assert.equal(parsed.id, "open-meteo:2643743");
      assert.equal(parsed.population, 8961936);
    });

    it("validates geographic coordinates at extreme valid bounds", () => {
      const northPole = {
        id: "test:1",
        providerId: "test",
        name: "North Pole",
        latitude: 90,
        longitude: 0,
        formattedAddress: "North Pole",
      };
      assert.doesNotThrow(() => GeocodingLocationSchema.parse(northPole));

      const southPole = {
        id: "test:2",
        providerId: "test",
        name: "South Pole",
        latitude: -90,
        longitude: 180,
        formattedAddress: "South Pole",
      };
      assert.doesNotThrow(() => GeocodingLocationSchema.parse(southPole));
    });

    it("rejects coordinates exceeding valid geographic limits", () => {
      assert.throws(() => {
        GeocodingLocationSchema.parse({
          id: "test:invalid-lat",
          providerId: "test",
          name: "Invalid",
          latitude: 90.001,
          longitude: 0,
          formattedAddress: "Invalid",
        });
      });

      assert.throws(() => {
        GeocodingLocationSchema.parse({
          id: "test:invalid-lon",
          providerId: "test",
          name: "Invalid",
          latitude: 0,
          longitude: -180.001,
          formattedAddress: "Invalid",
        });
      });
    });

    it("allows omitting optional fields without error", () => {
      const minimal = {
        id: "open-meteo:12345",
        providerId: "open-meteo",
        name: "Island",
        latitude: 10.5,
        longitude: 20.3,
        formattedAddress: "Island",
      };
      const parsed = GeocodingLocationSchema.parse(minimal);
      assert.equal(parsed.name, "Island");
      assert.equal(parsed.country, undefined);
      assert.equal(parsed.population, undefined);
    });
  });

  describe("formatLocationLabel", () => {
    it("combines city, admin area, and country cleanly", () => {
      const label = formatLocationLabel({
        name: "Springfield",
        adminArea: "Illinois",
        country: "United States",
      });
      assert.equal(label, "Springfield, Illinois, United States");
    });

    it("falls back to country code if full country name is missing", () => {
      const label = formatLocationLabel({
        name: "Lyon",
        adminArea: "Auvergne-Rhône-Alpes",
        countryCode: "FR",
      });
      assert.equal(label, "Lyon, Auvergne-Rhône-Alpes, FR");
    });

    it("avoids repeating adminArea when it is identical to city name", () => {
      const label = formatLocationLabel({
        name: "Tokyo",
        adminArea: "Tokyo",
        country: "Japan",
      });
      assert.equal(label, "Tokyo, Japan");
    });

    it("handles location with only name present", () => {
      const label = formatLocationLabel({
        name: "Null Island",
      });
      assert.equal(label, "Null Island");
    });
  });
});
