import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/weather/batch/route";
import { getProviderRegistry } from "@/lib/weather/providers/registry";
import { OpenMeteoAdapter } from "@/lib/weather/providers/open-meteo/adapter";
import { mockOpenMeteoForecastResponse } from "../fixtures/weather-fixtures";
import { WeatherBundle } from "@/lib/weather/domain/weather";

describe("Batch Weather API Route Handler (POST /api/weather/batch)", () => {
  const mockAdapter = new OpenMeteoAdapter({
    fetchFn: async () => {
      return new Response(JSON.stringify(mockOpenMeteoForecastResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  getProviderRegistry().register(mockAdapter, true);

  it("returns 200 with batch results for valid locations payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/weather/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: [
          {
            id: "loc-london",
            name: "London",
            latitude: 51.5074,
            longitude: -0.1278,
            country: "United Kingdom",
          },
          {
            id: "loc-tokyo",
            name: "Tokyo",
            latitude: 35.6762,
            longitude: 139.6503,
            country: "Japan",
          },
        ],
        units: "metric",
      }),
    });

    const response = await POST(request);
    assert.equal(response.status, 200);

    const data = (await response.json()) as {
      items: Array<{ id: string; bundle: WeatherBundle }>;
      total: number;
    };

    assert.equal(data.total, 2);
    assert.equal(data.items.length, 2);
    assert.equal(data.items[0].id, "loc-london");
    assert.ok(data.items[0].bundle.current);
  });

  it("returns 400 when body has empty locations array", async () => {
    const request = new NextRequest("http://localhost:3000/api/weather/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations: [] }),
    });

    const response = await POST(request);
    assert.equal(response.status, 400);

    const data = (await response.json()) as { error: { code: string } };
    assert.equal(data.error.code, "INVALID_PARAMETERS");
  });

  it("returns 400 when body is not valid JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/weather/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json-content",
    });

    const response = await POST(request);
    assert.equal(response.status, 400);

    const data = (await response.json()) as { error: { code: string } };
    assert.equal(data.error.code, "INVALID_JSON");
  });

  it("applies imperial units when requested", async () => {
    const request = new NextRequest("http://localhost:3000/api/weather/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: [
          {
            name: "New York",
            latitude: 40.7128,
            longitude: -74.006,
          },
        ],
        units: "imperial",
      }),
    });

    const response = await POST(request);
    assert.equal(response.status, 200);

    const data = (await response.json()) as {
      items: Array<{ bundle: WeatherBundle }>;
    };

    assert.equal(data.items[0].bundle.meta.units.temperature, "fahrenheit");
  });
});
