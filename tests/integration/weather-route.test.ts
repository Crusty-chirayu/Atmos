import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/weather/route";
import { getProviderRegistry } from "@/lib/weather/providers/registry";
import { OpenMeteoAdapter } from "@/lib/weather/providers/open-meteo/adapter";
import { mockOpenMeteoForecastResponse } from "../fixtures/weather-fixtures";
import { WeatherBundle } from "@/lib/weather/domain/weather";

describe("Weather API Route Handler (GET /api/weather)", () => {
  // Register deterministic mock adapter in global registry for test execution
  const mockAdapter = new OpenMeteoAdapter({
    fetchFn: async () => {
      return new Response(JSON.stringify(mockOpenMeteoForecastResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  getProviderRegistry().register(mockAdapter, true);

  it("returns 200 with complete WeatherBundle for valid coordinates", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278&name=London&timezone=Europe/London"
    );
    const response = await GET(request);

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Cache-Control"),
      "public, s-maxage=600, stale-while-revalidate=1800"
    );

    const bundle = (await response.json()) as WeatherBundle;
    assert.ok(bundle.location);
    assert.equal(bundle.location.name, "London");
    assert.ok(bundle.current);
    assert.equal(typeof bundle.current.temperature, "number");
    assert.ok(bundle.hourly.entries.length > 0);
    assert.ok(bundle.daily.days.length > 0);
    assert.equal(bundle.meta.provider, "open-meteo");
  });

  it("applies imperial units when requested", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather?lat=51.5&lon=-0.12&units=imperial"
    );
    const response = await GET(request);

    assert.equal(response.status, 200);
    const bundle = (await response.json()) as WeatherBundle;

    assert.equal(bundle.meta.units.temperature, "fahrenheit");
    assert.equal(bundle.meta.units.windSpeed, "mph");
    // Canonical 18.5°C converts to 65.3°F
    assert.ok(bundle.current.temperature > 50);
  });

  it("returns 400 when latitude is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather?lon=-0.12"
    );
    const response = await GET(request);

    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(body.error.code, "INVALID_PARAMETERS");
  });

  it("returns 400 when coordinates are out of bounds", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather?lat=95&lon=0"
    );
    const response = await GET(request);

    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(body.error.code, "INVALID_PARAMETERS");
  });

  it("returns 400 when forecastDays exceeds maximum (16)", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather?lat=50&lon=10&forecastDays=20"
    );
    const response = await GET(request);

    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(body.error.code, "INVALID_PARAMETERS");
    assert.ok(body.error.message.includes("cannot exceed 16"));
  });
});
