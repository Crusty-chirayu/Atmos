import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BatchWeatherQuerySchema } from "@/lib/weather/domain/schemas";

describe("BatchWeatherQuerySchema", () => {
  it("validates valid array of coordinates", () => {
    const parsed = BatchWeatherQuerySchema.safeParse({
      locations: [
        {
          id: "loc-1",
          name: "London",
          latitude: 51.5074,
          longitude: -0.1278,
          country: "United Kingdom",
        },
        {
          id: "loc-2",
          name: "Tokyo",
          latitude: 35.6762,
          longitude: 139.6503,
          country: "Japan",
        },
      ],
      units: "metric",
    });

    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.locations.length, 2);
      assert.equal(parsed.data.units, "metric");
    }
  });

  it("rejects empty locations array", () => {
    const parsed = BatchWeatherQuerySchema.safeParse({
      locations: [],
    });

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(
        parsed.error.issues.some((i) =>
          i.message.includes("At least one location is required")
        )
      );
    }
  });

  it("rejects batch exceeding 12 locations limit", () => {
    const dummyLocations = Array.from({ length: 13 }, (_, i) => ({
      name: `City ${i}`,
      latitude: 0,
      longitude: 0,
    }));

    const parsed = BatchWeatherQuerySchema.safeParse({
      locations: dummyLocations,
    });

    assert.equal(parsed.success, false);
    if (!parsed.success) {
      assert.ok(
        parsed.error.issues.some((i) =>
          i.message.includes("Maximum 12 locations")
        )
      );
    }
  });

  it("rejects out of bounds coordinates inside batch", () => {
    const parsed = BatchWeatherQuerySchema.safeParse({
      locations: [
        {
          name: "Invalid City",
          latitude: 95, // Invalid > 90
          longitude: 0,
        },
      ],
    });

    assert.equal(parsed.success, false);
  });
});
