import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/weather/geocoding/route";
import { getGeocodingProviderRegistry } from "@/lib/geocoding/providers/registry";
import { OpenMeteoGeocodingAdapter } from "@/lib/geocoding/providers/open-meteo/adapter";
import { MOCK_LONDON_SEARCH_RESPONSE } from "../fixtures/geocoding-fixtures";

describe("Geocoding Route Handler (GET /api/weather/geocoding)", () => {
  // Set up mock adapter in default registry for deterministic route testing
  const mockAdapter = new OpenMeteoGeocodingAdapter({
    fetchFn: async () => {
      return new Response(JSON.stringify(MOCK_LONDON_SEARCH_RESPONSE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  getGeocodingProviderRegistry().register(mockAdapter, true);

  it("returns 200 with normalized locations for valid search query", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather/geocoding?q=London&count=3"
    );
    const response = await GET(request);

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("Cache-Control"),
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );

    const body = (await response.json()) as {
      query: string;
      results: Array<{ name: string; countryCode: string }>;
      totalCount: number;
    };

    assert.equal(body.query, "London");
    assert.equal(body.results.length, 3);
    assert.equal(body.results[0].name, "London");
  });

  it("returns 400 when search query 'q' parameter is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather/geocoding"
    );
    const response = await GET(request);

    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(body.error.code, "INVALID_PARAMETERS");
    assert.ok(body.error.message.includes("'q' parameter is required"));
  });

  it("returns 400 when count exceeds maximum limit (100)", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather/geocoding?q=Paris&count=150"
    );
    const response = await GET(request);

    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(body.error.code, "INVALID_PARAMETERS");
    assert.ok(body.error.message.includes("between 1 and 100"));
  });

  it("returns 400 when query string is too short (1 character)", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/weather/geocoding?q=A"
    );
    const response = await GET(request);

    assert.equal(response.status, 400);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(body.error.code, "INVALID_PARAMETERS");
  });

  it("enforces rate limits and returns 429 when quota is exhausted", async () => {
    const testIp = "203.0.113.88";
    const headers = { "x-forwarded-for": testIp };

    // Consume all 100 tokens
    for (let i = 0; i < 100; i++) {
      const req = new NextRequest(
        "http://localhost:3000/api/weather/geocoding?q=Tokyo",
        { headers }
      );
      const res = await GET(req);
      assert.equal(res.status, 200);
    }

    // 101st request should be rate-limited with 429
    const limitedReq = new NextRequest(
      "http://localhost:3000/api/weather/geocoding?q=Tokyo",
      { headers }
    );
    const limitedRes = await GET(limitedReq);
    assert.equal(limitedRes.status, 429);
    assert.ok(limitedRes.headers.get("Retry-After"));
    assert.equal(limitedRes.headers.get("X-RateLimit-Remaining"), "0");
    const body = (await limitedRes.json()) as { error: { code: string } };
    assert.equal(body.error.code, "RATE_LIMITED");
  });
});
