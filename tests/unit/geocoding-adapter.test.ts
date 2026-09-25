import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OpenMeteoGeocodingAdapter } from "@/lib/geocoding/providers/open-meteo/adapter";
import { WeatherError } from "@/lib/weather/errors/weather-error";
import {
  MOCK_EMPTY_ARRAY_RESPONSE,
  MOCK_EMPTY_SEARCH_RESPONSE,
  MOCK_LONDON_SEARCH_RESPONSE,
  MOCK_MALFORMED_ITEMS_RESPONSE,
  MOCK_PARIS_SEARCH_RESPONSE,
  MOCK_TOKYO_UNICODE_RESPONSE,
} from "../fixtures/geocoding-fixtures";

describe("OpenMeteoGeocodingAdapter", () => {
  describe("Request Construction & Query Params", () => {
    it("constructs correct geocoding request URL and parameters", async () => {
      let requestedUrl = "";

      const adapter = new OpenMeteoGeocodingAdapter({
        fetchFn: async (url) => {
          requestedUrl = url.toString();
          return new Response(JSON.stringify(MOCK_LONDON_SEARCH_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      const response = await adapter.search({
        query: "London",
        count: 5,
        language: "en",
        countryCode: "GB",
      });

      assert.ok(
        requestedUrl.startsWith(
          "https://geocoding-api.open-meteo.com/v1/search"
        )
      );
      const parsedUrl = new URL(requestedUrl);
      assert.equal(parsedUrl.searchParams.get("name"), "London");
      assert.equal(parsedUrl.searchParams.get("count"), "5");
      assert.equal(parsedUrl.searchParams.get("language"), "en");
      assert.equal(parsedUrl.searchParams.get("countryCode"), "GB");
      assert.equal(parsedUrl.searchParams.get("format"), "json");

      assert.equal(response.results.length, 3);
    });

    it("correctly encodes multilingual and Unicode queries in URLSearchParams", async () => {
      let requestedUrl = "";

      const adapter = new OpenMeteoGeocodingAdapter({
        fetchFn: async (url) => {
          requestedUrl = url.toString();
          return new Response(JSON.stringify(MOCK_TOKYO_UNICODE_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      await adapter.search({ query: "東京都", language: "ja" });

      const parsedUrl = new URL(requestedUrl);
      assert.equal(parsedUrl.searchParams.get("name"), "東京都");
      assert.equal(parsedUrl.searchParams.get("language"), "ja");
    });
  });

  describe("Response Normalization", () => {
    it("maps raw Open-Meteo geocoding items to normalized GeocodingLocation models", async () => {
      const adapter = new OpenMeteoGeocodingAdapter({
        fetchFn: async () => {
          return new Response(JSON.stringify(MOCK_LONDON_SEARCH_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      const { results } = await adapter.search({ query: "London" });
      assert.equal(results.length, 3);

      const first = results[0];
      assert.equal(first.id, "open-meteo:2643743");
      assert.equal(first.providerId, "open-meteo");
      assert.equal(first.name, "London");
      assert.equal(first.country, "United Kingdom");
      assert.equal(first.countryCode, "GB");
      assert.equal(first.adminArea, "England");
      assert.equal(first.adminArea2, "Greater London");
      assert.equal(first.latitude, 51.50853);
      assert.equal(first.longitude, -0.12574);
      assert.equal(first.timezone, "Europe/London");
      assert.equal(first.population, 8961936);
      assert.equal(first.formattedAddress, "London, England, United Kingdom");
    });

    it("returns valid empty array when provider response omits results key", async () => {
      const adapter = new OpenMeteoGeocodingAdapter({
        fetchFn: async () => {
          return new Response(JSON.stringify(MOCK_EMPTY_SEARCH_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      const { results } = await adapter.search({
        query: "NonexistentPlaceXYZ",
      });
      assert.deepEqual(results, []);
    });

    it("returns valid empty array when results array is empty", async () => {
      const adapter = new OpenMeteoGeocodingAdapter({
        fetchFn: async () => {
          return new Response(JSON.stringify(MOCK_EMPTY_ARRAY_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      const { results } = await adapter.search({ query: "EmptyPlace" });
      assert.deepEqual(results, []);
    });

    it("filters out malformed items with invalid coordinates or missing names", async () => {
      const adapter = new OpenMeteoGeocodingAdapter({
        fetchFn: async () => {
          return new Response(JSON.stringify(MOCK_MALFORMED_ITEMS_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      const { results } = await adapter.search({ query: "TestCity" });
      // Only the 3rd item is valid
      assert.equal(results.length, 1);
      assert.equal(results[0].name, "Valid City");
      assert.equal(results[0].countryCode, "IT");
    });
  });

  describe("Direct getById Lookup", () => {
    it("retrieves location by numeric ID", async () => {
      const adapter = new OpenMeteoGeocodingAdapter({
        fetchFn: async () => {
          return new Response(
            JSON.stringify(MOCK_LONDON_SEARCH_RESPONSE.results![0]),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        },
      });

      const location = await adapter.getById(2643743);
      assert.ok(location);
      assert.equal(location.name, "London");
      assert.equal(location.id, "open-meteo:2643743");
    });

    it("handles prefixed string IDs like 'open-meteo:2643743'", async () => {
      const adapter = new OpenMeteoGeocodingAdapter({
        fetchFn: async () => {
          return new Response(
            JSON.stringify(MOCK_LONDON_SEARCH_RESPONSE.results![0]),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        },
      });

      const location = await adapter.getById("open-meteo:2643743");
      assert.ok(location);
      assert.equal(location.name, "London");
    });

    it("returns null when location is not found (404)", async () => {
      const adapter = new OpenMeteoGeocodingAdapter({
        fetchFn: async () => {
          return new Response(JSON.stringify({ reason: "Not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      const location = await adapter.getById(999999999);
      assert.equal(location, null);
    });

    it("rejects non-numeric ID strings with invalidParameters error", async () => {
      const adapter = new OpenMeteoGeocodingAdapter();
      await assert.rejects(
        () => adapter.getById("invalid-id"),
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          assert.equal(err.code, "INVALID_PARAMETERS");
          return true;
        }
      );
    });
  });

  describe("Error Handling & Resilience", () => {
    it("rejects search query shorter than 2 chars before making network request", async () => {
      let fetchCalled = false;
      const adapter = new OpenMeteoGeocodingAdapter({
        fetchFn: async () => {
          fetchCalled = true;
          return new Response();
        },
      });

      await assert.rejects(
        () => adapter.search({ query: "X" }),
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          assert.equal(err.code, "INVALID_PARAMETERS");
          return true;
        }
      );
      assert.equal(fetchCalled, false);
    });

    it("handles HTTP 400 Bad Request as non-retryable INVALID_PARAMETERS", async () => {
      const adapter = new OpenMeteoGeocodingAdapter({
        fetchFn: async () => {
          return new Response(
            JSON.stringify({ reason: "Parameter 'count' out of range" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        },
      });

      await assert.rejects(
        () => adapter.search({ query: "Paris" }),
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          assert.equal(err.code, "INVALID_PARAMETERS");
          assert.equal(err.statusCode, 400);
          assert.equal(err.isRetryable, false);
          return true;
        }
      );
    });

    it("handles HTTP 429 Rate Limited with Retry-After header", async () => {
      const adapter = new OpenMeteoGeocodingAdapter({
        maxRetries: 0,
        fetchFn: async () => {
          return new Response("Too Many Requests", {
            status: 429,
            headers: { "Retry-After": "45" },
          });
        },
      });

      await assert.rejects(
        () => adapter.search({ query: "Rome" }),
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          assert.equal(err.code, "RATE_LIMITED");
          assert.equal(err.retryAfterSeconds, 45);
          assert.equal(err.statusCode, 429);
          return true;
        }
      );
    });

    it("retries on HTTP 500 error up to maxRetries", async () => {
      let attempts = 0;
      const adapter = new OpenMeteoGeocodingAdapter({
        maxRetries: 2,
        fetchFn: async () => {
          attempts++;
          if (attempts < 3) {
            return new Response("Internal Server Error", { status: 500 });
          }
          return new Response(JSON.stringify(MOCK_PARIS_SEARCH_RESPONSE), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
      });

      const { results } = await adapter.search({ query: "Paris" });
      assert.equal(attempts, 3);
      assert.equal(results.length, 2);
    });

    it("handles timeout with PROVIDER_TIMEOUT error", async () => {
      const adapter = new OpenMeteoGeocodingAdapter({
        timeoutMs: 25,
        maxRetries: 0,
        fetchFn: async (_input, init) => {
          return new Promise<Response>((resolve, reject) => {
            const timer = setTimeout(() => {
              resolve(
                new Response(JSON.stringify(MOCK_LONDON_SEARCH_RESPONSE))
              );
            }, 200);

            init?.signal?.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(
                new DOMException("The operation was aborted", "AbortError")
              );
            });
          });
        },
      });

      await assert.rejects(
        () => adapter.search({ query: "London" }),
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          assert.equal(err.code, "PROVIDER_TIMEOUT");
          return true;
        }
      );
    });

    it("respects external AbortSignal cancellation", async () => {
      const controller = new AbortController();
      controller.abort();

      const adapter = new OpenMeteoGeocodingAdapter();

      await assert.rejects(
        () =>
          adapter.search({ query: "Madrid" }, { signal: controller.signal }),
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          return true;
        }
      );
    });

    it("detects payload error field from Open-Meteo", async () => {
      const adapter = new OpenMeteoGeocodingAdapter({
        fetchFn: async () => {
          return new Response(
            JSON.stringify({
              error: true,
              reason: "Malformed request payload",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        },
      });

      await assert.rejects(
        () => adapter.search({ query: "Berlin" }),
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          assert.equal(err.code, "INVALID_PARAMETERS");
          return true;
        }
      );
    });
  });
});
