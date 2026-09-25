import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MemoryWeatherCache,
  RequestDeduplicator,
  buildCurrentWeatherCacheKey,
  buildForecastCacheKey,
  buildHistoricalCacheKey,
} from "../../src/lib/weather/cache/cache";

describe("Weather Cache & Deduplication", () => {
  describe("Cache Key Construction", () => {
    it("builds normalized current weather cache key", () => {
      const key = buildCurrentWeatherCacheKey(
        "open-meteo",
        { latitude: 51.5074, longitude: -0.1278 },
        "Europe/London"
      );
      assert.equal(key, "weather:current:open-meteo:51.51:-0.13:Europe/London");
    });

    it("builds forecast cache key with all query dimensions", () => {
      const key = buildForecastCacheKey("open-meteo", {
        latitude: 40.7128,
        longitude: -74.006,
        timezone: "America/New_York",
        forecastDays: 7,
        includeHourly: true,
        includeDaily: true,
        includeCurrent: true,
      });
      assert.equal(
        key,
        "weather:forecast:open-meteo:40.71:-74.01:America/New_York:7:1:1:1"
      );
    });

    it("builds historical cache key with date range", () => {
      const key = buildHistoricalCacheKey("open-meteo", {
        latitude: 48.8566,
        longitude: 2.3522,
        startDate: "2024-01-01",
        endDate: "2024-01-07",
        timezone: "UTC",
        includeHourly: false,
      });
      assert.equal(
        key,
        "weather:historical:open-meteo:48.86:2.35:2024-01-01:2024-01-07:UTC:0"
      );
    });
  });

  describe("MemoryWeatherCache", () => {
    it("stores and retrieves cached items", () => {
      const cache = new MemoryWeatherCache();
      cache.set("key1", { temp: 20 }, { ttlSeconds: 60 });
      const entry = cache.get<{ temp: number }>("key1");

      assert.ok(entry !== null);
      assert.equal(entry.value.temp, 20);
      assert.ok(entry.cachedAt <= Date.now());
      assert.ok(entry.expiresAt > Date.now());
      assert.ok(entry.staleAt <= entry.expiresAt);
    });

    it("returns null for expired items", async () => {
      const cache = new MemoryWeatherCache();
      // Set 1-second TTL
      cache.set("short-lived", { data: true }, { ttlSeconds: 1 });
      assert.ok(cache.get("short-lived") !== null);

      // Fast-forward or wait 1100ms
      await new Promise((r) => setTimeout(r, 1100));
      assert.equal(cache.get("short-lived"), null);
      assert.equal(cache.has("short-lived"), false);
    });

    it("evicts oldest entries when capacity limit is reached", () => {
      const cache = new MemoryWeatherCache(3);
      cache.set("k1", 1);
      cache.set("k2", 2);
      cache.set("k3", 3);
      assert.equal(cache.size(), 3);

      // Adding 4th item should evict k1
      cache.set("k4", 4);
      assert.equal(cache.size(), 3);
      assert.equal(cache.get("k1"), null);
      assert.ok(cache.get("k2") !== null);
      assert.ok(cache.get("k3") !== null);
      assert.ok(cache.get("k4") !== null);
    });

    it("clears all entries", () => {
      const cache = new MemoryWeatherCache();
      cache.set("a", 1);
      cache.set("b", 2);
      assert.equal(cache.size(), 2);
      cache.clear();
      assert.equal(cache.size(), 0);
      assert.equal(cache.get("a"), null);
    });
  });

  describe("RequestDeduplicator", () => {
    it("coalesces concurrent requests for the same key into a single execution", async () => {
      const dedupe = new RequestDeduplicator();
      let callCount = 0;

      const slowTask = async () => {
        callCount++;
        await new Promise((r) => setTimeout(r, 50));
        return { result: "success", count: callCount };
      };

      // Launch 3 concurrent requests simultaneously
      const [res1, res2, res3] = await Promise.all([
        dedupe.execute("task-1", slowTask),
        dedupe.execute("task-1", slowTask),
        dedupe.execute("task-1", slowTask),
      ]);

      assert.equal(callCount, 1, "Underlying task should only be called once");
      assert.equal(res1.result, "success");
      assert.equal(res2.result, "success");
      assert.equal(res3.result, "success");
      assert.equal(
        dedupe.inFlightCount(),
        0,
        "In-flight map should be clean after completion"
      );
    });

    it("executes distinct keys separately", async () => {
      const dedupe = new RequestDeduplicator();
      let callCount = 0;

      const makeTask = (id: string) => async () => {
        callCount++;
        await new Promise((r) => setTimeout(r, 20));
        return { id, callCount };
      };

      const [resA, resB] = await Promise.all([
        dedupe.execute("task-a", makeTask("A")),
        dedupe.execute("task-b", makeTask("B")),
      ]);

      assert.equal(callCount, 2, "Distinct tasks should execute independently");
      assert.equal(resA.id, "A");
      assert.equal(resB.id, "B");
    });

    it("cleans up in-flight promise even if task rejects", async () => {
      const dedupe = new RequestDeduplicator();
      const failingTask = async () => {
        await new Promise((r) => setTimeout(r, 10));
        throw new Error("Upstream failed");
      };

      await assert.rejects(async () => {
        await dedupe.execute("fail-task", failingTask);
      });

      assert.equal(dedupe.isInFlight("fail-task"), false);
    });
  });
});
