import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MemoryGeocodingCache,
  RequestDeduplicator,
  buildGeocodingCacheKey,
} from "@/lib/geocoding/cache/cache";
import {
  GeocodingLocation,
  GeocodingSearchResult,
} from "@/lib/geocoding/domain/types";

describe("Geocoding Cache & Deduplication", () => {
  describe("buildGeocodingCacheKey", () => {
    it("normalizes case and whitespace to produce identical cache key for identical queries", () => {
      const key1 = buildGeocodingCacheKey("open-meteo", {
        query: "Paris",
        count: 10,
        language: "en",
      });
      const key2 = buildGeocodingCacheKey("open-meteo", {
        query: "  paris  ",
        count: 10,
        language: "en",
      });
      assert.equal(key1, key2);
    });

    it("normalizes diacritics in cache key", () => {
      const key1 = buildGeocodingCacheKey("open-meteo", {
        query: "München",
        count: 10,
        language: "de",
      });
      const key2 = buildGeocodingCacheKey("open-meteo", {
        query: "Munchen",
        count: 10,
        language: "de",
      });
      assert.equal(key1, key2);
    });

    it("differentiates cache keys by language", () => {
      const keyEn = buildGeocodingCacheKey("open-meteo", {
        query: "Rome",
        count: 5,
        language: "en",
      });
      const keyIt = buildGeocodingCacheKey("open-meteo", {
        query: "Rome",
        count: 5,
        language: "it",
      });
      assert.notEqual(keyEn, keyIt);
    });

    it("differentiates cache keys by count", () => {
      const key5 = buildGeocodingCacheKey("open-meteo", {
        query: "Tokyo",
        count: 5,
        language: "en",
      });
      const key20 = buildGeocodingCacheKey("open-meteo", {
        query: "Tokyo",
        count: 20,
        language: "en",
      });
      assert.notEqual(key5, key20);
    });

    it("differentiates cache keys by country code", () => {
      const keyAll = buildGeocodingCacheKey("open-meteo", {
        query: "London",
        count: 10,
        language: "en",
      });
      const keyGb = buildGeocodingCacheKey("open-meteo", {
        query: "London",
        count: 10,
        language: "en",
        countryCode: "GB",
      });
      assert.notEqual(keyAll, keyGb);
    });
  });

  describe("MemoryGeocodingCache", () => {
    it("stores and retrieves geocoding search results", () => {
      const cache = new MemoryGeocodingCache(10);
      const mockResult: GeocodingSearchResult = {
        query: "Madrid",
        results: [
          {
            id: "open-meteo:1",
            providerId: "open-meteo",
            name: "Madrid",
            latitude: 40.41,
            longitude: -3.7,
            formattedAddress: "Madrid, Spain",
          },
        ],
        totalCount: 1,
        provider: "open-meteo",
        isCached: false,
      };

      cache.set("geocoding:open-meteo:madrid:en:10:ALL", mockResult, {
        ttlSeconds: 60,
      });

      const retrieved = cache.get<GeocodingSearchResult>(
        "geocoding:open-meteo:madrid:en:10:ALL"
      );
      assert.ok(retrieved);
      assert.equal(retrieved.value.query, "Madrid");
      assert.equal(retrieved.value.results[0].name, "Madrid");
    });

    it("returns null when cache item has expired", async () => {
      const cache = new MemoryGeocodingCache(10);
      cache.set("short-lived", { foo: "bar" }, { ttlSeconds: 1 });

      assert.ok(cache.get("short-lived"));
      // Wait for expiration
      await new Promise((r) => setTimeout(r, 1100));
      assert.equal(cache.get("short-lived"), null);
    });
  });

  describe("RequestDeduplicator for Geocoding", () => {
    it("coalesces concurrent search requests so upstream is queried once", async () => {
      const deduplicator = new RequestDeduplicator();
      let callCount = 0;

      const performSearch = async () => {
        return deduplicator.execute("search:london", async () => {
          callCount++;
          await new Promise((r) => setTimeout(r, 50));
          return ["London Result"];
        });
      };

      const [res1, res2, res3] = await Promise.all([
        performSearch(),
        performSearch(),
        performSearch(),
      ]);

      assert.equal(callCount, 1);
      assert.deepEqual(res1, ["London Result"]);
      assert.deepEqual(res2, ["London Result"]);
      assert.deepEqual(res3, ["London Result"]);
    });
  });
});
