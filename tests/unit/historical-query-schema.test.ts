import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HistoricalApiQuerySchema } from "@/lib/weather/domain/schemas";

describe("HistoricalApiQuerySchema", () => {
  it("validates valid query parameters with defaults", () => {
    const parsed = HistoricalApiQuerySchema.safeParse({
      lat: "51.5074",
      lon: "-0.1278",
      startDate: "2025-06-01",
      endDate: "2025-06-07",
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.lat, 51.5074);
      assert.equal(parsed.data.lon, -0.1278);
      assert.equal(parsed.data.startDate, "2025-06-01");
      assert.equal(parsed.data.endDate, "2025-06-07");
      assert.equal(parsed.data.timezone, "auto");
      assert.equal(parsed.data.units, "metric");
      assert.equal(parsed.data.includeHourly, false);
    }
  });

  it("accepts imperial units and includeHourly flag", () => {
    const parsed = HistoricalApiQuerySchema.safeParse({
      lat: 40.7128,
      lon: -74.006,
      startDate: "2024-01-01",
      endDate: "2024-01-15",
      units: "imperial",
      includeHourly: "true",
      timezone: "America/New_York",
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.units, "imperial");
      assert.equal(parsed.data.includeHourly, true);
      assert.equal(parsed.data.timezone, "America/New_York");
    }
  });

  it("rejects startDate later than endDate", () => {
    const parsed = HistoricalApiQuerySchema.safeParse({
      lat: 51.5,
      lon: -0.12,
      startDate: "2025-06-10",
      endDate: "2025-06-05",
    });

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(
        parsed.error.issues.some((issue) =>
          issue.message.includes("startDate must be before or equal to endDate")
        )
      );
    }
  });

  it("rejects startDate earlier than 1940-01-01 (ERA5 limit)", () => {
    const parsed = HistoricalApiQuerySchema.safeParse({
      lat: 51.5,
      lon: -0.12,
      startDate: "1935-05-01",
      endDate: "1935-05-10",
    });

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(
        parsed.error.issues.some((issue) =>
          issue.message.includes("1940-01-01")
        )
      );
    }
  });

  it("rejects date range exceeding 90 days limit", () => {
    const parsed = HistoricalApiQuerySchema.safeParse({
      lat: 51.5,
      lon: -0.12,
      startDate: "2024-01-01",
      endDate: "2024-06-01", // ~152 days
    });

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(
        parsed.error.issues.some((issue) =>
          issue.message.includes("cannot exceed 90 days")
        )
      );
    }
  });

  it("rejects invalid coordinates", () => {
    const parsedLat = HistoricalApiQuerySchema.safeParse({
      lat: 95,
      lon: 0,
      startDate: "2025-01-01",
      endDate: "2025-01-05",
    });
    assert.equal(parsedLat.success, false);

    const parsedLon = HistoricalApiQuerySchema.safeParse({
      lat: 0,
      lon: 190,
      startDate: "2025-01-01",
      endDate: "2025-01-05",
    });
    assert.equal(parsedLon.success, false);
  });
});
