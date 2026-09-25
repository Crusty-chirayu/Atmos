import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/weather/historical/route";
import { getProviderRegistry } from "@/lib/weather/providers/registry";
import { OpenMeteoAdapter } from "@/lib/weather/providers/open-meteo/adapter";
import { mockOpenMeteoArchiveResponse } from "../fixtures/weather-fixtures";
import { HistoricalWeather } from "@/lib/weather/domain/weather";

describe("Historical Weather API Route Handler (GET /api/weather/historical)", () => {
  const mockAdapter = new OpenMeteoAdapter({
    fetchFn: async () => {
      return new Response(JSON.stringify(mockOpenMeteoArchiveResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  getProviderRegistry().register(mockAdapter, true);

  it("returns 200 with HistoricalWeather for valid query", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather/historical?lat=51.5&lon=-0.12&startDate=2025-06-01&endDate=2025-06-07"
    );
    const response = await GET(request);

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Cache-Control"),
      "public, s-maxage=86400, stale-while-revalidate=43200"
    );

    const data = (await response.json()) as HistoricalWeather;
    assert.equal(data.startDate, "2025-06-01");
    assert.ok(data.dailySummaries.length > 0);
  });

  it("returns 400 when coordinates are missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather/historical?startDate=2025-06-01&endDate=2025-06-07"
    );
    const response = await GET(request);

    assert.equal(response.status, 400);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "INVALID_PARAMETERS");
  });

  it("returns 400 when startDate is after endDate", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather/historical?lat=51.5&lon=-0.12&startDate=2025-06-10&endDate=2025-06-01"
    );
    const response = await GET(request);

    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(body.error.code, "INVALID_PARAMETERS");
    assert.ok(
      body.error.message.includes(
        "startDate must be before or equal to endDate"
      )
    );
  });

  it("returns 400 when date range exceeds 90 days", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather/historical?lat=51.5&lon=-0.12&startDate=2024-01-01&endDate=2024-06-01"
    );
    const response = await GET(request);

    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(body.error.code, "INVALID_PARAMETERS");
    assert.ok(body.error.message.includes("cannot exceed 90 days"));
  });

  it("returns 400 when startDate is before 1940-01-01", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather/historical?lat=51.5&lon=-0.12&startDate=1930-01-01&endDate=1930-01-10"
    );
    const response = await GET(request);

    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(body.error.code, "INVALID_PARAMETERS");
    assert.ok(body.error.message.includes("1940-01-01"));
  });

  it("applies imperial units to historical values when requested", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather/historical?lat=51.5&lon=-0.12&startDate=2025-06-01&endDate=2025-06-07&units=imperial"
    );
    const response = await GET(request);

    assert.equal(response.status, 200);
    const data = (await response.json()) as HistoricalWeather;
    // Canonical 21.0°C in fixture converts to ~69.8°F
    assert.ok(data.dailySummaries[0].temperatureMax > 65);
  });
});
