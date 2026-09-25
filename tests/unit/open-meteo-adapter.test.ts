import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OpenMeteoAdapter } from "../../src/lib/weather/providers/open-meteo/adapter";
import { WeatherError } from "../../src/lib/weather/errors/weather-error";
import {
  mockOpenMeteoArchiveResponse,
  mockOpenMeteoForecastResponse,
  mockOpenMeteoSparseResponse,
} from "../fixtures/weather-fixtures";

describe("OpenMeteoAdapter", () => {
  describe("Request Construction & Query Params", () => {
    it("constructs correct forecast query parameters with URL and URLSearchParams", async () => {
      let interceptedUrl: string | undefined;

      const mockFetch: typeof fetch = async (input) => {
        interceptedUrl = input.toString();
        return new Response(JSON.stringify(mockOpenMeteoForecastResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const adapter = new OpenMeteoAdapter({ fetchFn: mockFetch });
      await adapter.getForecast({
        latitude: 51.5,
        longitude: -0.12,
        timezone: "Europe/London",
        forecastDays: 14,
        includeCurrent: true,
        includeHourly: true,
        includeDaily: true,
      });

      assert.ok(interceptedUrl !== undefined);
      const parsed = new URL(interceptedUrl);
      assert.equal(parsed.pathname, "/v1/forecast");
      assert.equal(parsed.searchParams.get("latitude"), "51.5");
      assert.equal(parsed.searchParams.get("longitude"), "-0.12");
      assert.equal(parsed.searchParams.get("timezone"), "Europe/London");
      assert.equal(parsed.searchParams.get("forecast_days"), "14");
      assert.ok(parsed.searchParams.get("current")?.includes("temperature_2m"));
      assert.ok(parsed.searchParams.get("hourly")?.includes("temperature_2m"));
      assert.ok(parsed.searchParams.get("daily")?.includes("weather_code"));
    });

    it("constructs correct historical archive query parameters", async () => {
      let interceptedUrl: string | undefined;

      const mockFetch: typeof fetch = async (input) => {
        interceptedUrl = input.toString();
        return new Response(JSON.stringify(mockOpenMeteoArchiveResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const adapter = new OpenMeteoAdapter({ fetchFn: mockFetch });
      await adapter.getHistorical({
        latitude: 51.5,
        longitude: -0.12,
        startDate: "2025-09-25",
        endDate: "2025-09-26",
        timezone: "UTC",
        includeHourly: true,
      });

      assert.ok(interceptedUrl !== undefined);
      const parsed = new URL(interceptedUrl);
      assert.equal(parsed.pathname, "/v1/archive");
      assert.equal(parsed.searchParams.get("latitude"), "51.5");
      assert.equal(parsed.searchParams.get("start_date"), "2025-09-25");
      assert.equal(parsed.searchParams.get("end_date"), "2025-09-26");
      assert.ok(
        parsed.searchParams.get("daily")?.includes("temperature_2m_max")
      );
    });
  });

  describe("Response Mapping", () => {
    it("maps complete forecast response to normalized domain models", async () => {
      const mockFetch: typeof fetch = async () =>
        new Response(JSON.stringify(mockOpenMeteoForecastResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      const adapter = new OpenMeteoAdapter({ fetchFn: mockFetch });
      const result = await adapter.getForecast({
        latitude: 51.5,
        longitude: -0.12,
      });

      // Current
      assert.ok(result.current !== undefined);
      assert.equal(result.current.temperature, 18.5);
      assert.equal(result.current.apparentTemperature, 17.8);
      assert.equal(result.current.relativeHumidity, 65);
      assert.equal(result.current.conditionText, "Slight rain");
      assert.equal(result.current.conditionCategory, "rain");
      assert.equal(result.current.isDay, true);

      // Hourly
      assert.ok(result.hourly !== undefined);
      assert.equal(result.hourly.entries.length, 4);
      assert.equal(result.hourly.entries[0]?.temperature, 14.1);
      assert.equal(result.hourly.entries[2]?.conditionCategory, "rain");

      // Daily
      assert.ok(result.daily !== undefined);
      assert.equal(result.daily.days.length, 2);
      assert.equal(result.daily.days[0]?.temperatureMax, 19.2);
      assert.equal(result.daily.days[0]?.temperatureMin, 12.4);
      assert.equal(result.daily.days[0]?.sunrise, "2026-09-25T05:51");

      // Meta
      assert.equal(result.meta.provider, "open-meteo");
      assert.equal(result.meta.timezone, "UTC");
      assert.equal(result.meta.isCached, false);
      assert.equal(result.meta.units.temperature, "celsius");
    });

    it("safely handles missing and null fields without inventing zero values", async () => {
      const mockFetch: typeof fetch = async () =>
        new Response(JSON.stringify(mockOpenMeteoSparseResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      const adapter = new OpenMeteoAdapter({ fetchFn: mockFetch });
      const result = await adapter.getForecast({
        latitude: 40.71,
        longitude: -74.01,
      });

      assert.ok(result.current !== undefined);
      assert.equal(result.current.rain, null);
      assert.equal(result.current.showers, null);
      assert.equal(result.current.surfacePressure, null);

      assert.ok(result.hourly !== undefined);
      // Entry 0 had null relative_humidity_2m
      assert.equal(result.hourly.entries[0]?.relativeHumidity, null);
      assert.equal(result.hourly.entries[0]?.apparentTemperature, null);
      assert.equal(result.hourly.entries[0]?.visibility, null);

      assert.ok(result.daily !== undefined);
      assert.equal(result.daily.days[0]?.apparentTemperatureMax, null);
      assert.equal(result.daily.days[0]?.sunrise, null);
    });

    it("maps historical weather response", async () => {
      const mockFetch: typeof fetch = async () =>
        new Response(JSON.stringify(mockOpenMeteoArchiveResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      const adapter = new OpenMeteoAdapter({ fetchFn: mockFetch });
      const history = await adapter.getHistorical({
        latitude: 51.5,
        longitude: -0.12,
        startDate: "2025-09-25",
        endDate: "2025-09-26",
      });

      assert.equal(history.startDate, "2025-09-25");
      assert.equal(history.endDate, "2025-09-26");
      assert.equal(history.dailySummaries.length, 2);
      assert.equal(history.dailySummaries[0]?.temperatureMax, 21.0);
      assert.equal(history.dailySummaries[0]?.temperatureMean, 17.2);
      assert.ok(history.dataSource.includes("ERA5"));
    });
  });

  describe("Error Handling & Resilience", () => {
    it("rejects invalid coordinates before making any network call", async () => {
      let fetchCalled = false;
      const mockFetch: typeof fetch = async () => {
        fetchCalled = true;
        return new Response("{}", { status: 200 });
      };

      const adapter = new OpenMeteoAdapter({ fetchFn: mockFetch });

      await assert.rejects(
        async () => {
          await adapter.getCurrent({ latitude: 120, longitude: 0 });
        },
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          assert.equal(err.code, "INVALID_COORDINATES");
          assert.equal(err.statusCode, 400);
          return true;
        }
      );

      assert.equal(
        fetchCalled,
        false,
        "Fetch should not be called on invalid coordinates"
      );
    });

    it("handles HTTP 400 Bad Request as non-retryable INVALID_PARAMETERS", async () => {
      let callCount = 0;
      const mockFetch: typeof fetch = async () => {
        callCount++;
        return new Response(JSON.stringify({ reason: "Cannot parse date" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      };

      const adapter = new OpenMeteoAdapter({
        fetchFn: mockFetch,
        maxRetries: 2,
      });

      await assert.rejects(
        async () => {
          await adapter.getForecast({ latitude: 50, longitude: 10 });
        },
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          assert.equal(err.code, "INVALID_PARAMETERS");
          assert.equal(err.isRetryable, false);
          return true;
        }
      );

      assert.equal(callCount, 1, "400 error must not be retried");
    });

    it("handles HTTP 429 Rate Limited with Retry-After header", async () => {
      const mockFetch: typeof fetch = async () => {
        return new Response("Too Many Requests", {
          status: 429,
          headers: { "Retry-After": "60" },
        });
      };

      const adapter = new OpenMeteoAdapter({
        fetchFn: mockFetch,
        maxRetries: 0,
      });

      await assert.rejects(
        async () => {
          await adapter.getForecast({ latitude: 50, longitude: 10 });
        },
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          assert.equal(err.code, "RATE_LIMITED");
          assert.equal(err.statusCode, 429);
          assert.equal(err.retryAfterSeconds, 60);
          return true;
        }
      );
    });

    it("retries on HTTP 500 error up to maxRetries", async () => {
      let attempts = 0;
      const mockFetch: typeof fetch = async () => {
        attempts++;
        return new Response("Internal Server Error", { status: 500 });
      };

      const adapter = new OpenMeteoAdapter({
        fetchFn: mockFetch,
        maxRetries: 2,
      });

      await assert.rejects(
        async () => {
          await adapter.getForecast({ latitude: 50, longitude: 10 });
        },
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          assert.equal(err.code, "PROVIDER_UNAVAILABLE");
          return true;
        }
      );

      assert.equal(
        attempts,
        3,
        "Initial attempt + 2 retries = 3 attempts total"
      );
    });

    it("handles timeout with PROVIDER_TIMEOUT error", async () => {
      const mockFetch: typeof fetch = async (_input, init) => {
        return new Promise<Response>((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve(new Response("{}", { status: 200 }));
          }, 150);

          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("The operation was aborted", "AbortError"));
          });
        });
      };

      const adapter = new OpenMeteoAdapter({
        fetchFn: mockFetch,
        timeoutMs: 25,
        maxRetries: 0,
      });

      await assert.rejects(
        async () => {
          await adapter.getForecast({ latitude: 50, longitude: 10 });
        },
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          assert.equal(err.code, "PROVIDER_TIMEOUT");
          assert.equal(err.statusCode, 504);
          return true;
        }
      );
    });

    it("respects external AbortSignal cancellation", async () => {
      const controller = new AbortController();
      controller.abort(); // Abort before call

      const mockFetch: typeof fetch = async () => {
        return new Response("{}", { status: 200 });
      };

      const adapter = new OpenMeteoAdapter({ fetchFn: mockFetch });

      await assert.rejects(
        async () => {
          await adapter.getForecast(
            { latitude: 50, longitude: 10 },
            { signal: controller.signal }
          );
        },
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          return true;
        }
      );
    });

    it("detects payload error field from Open-Meteo", async () => {
      const mockFetch: typeof fetch = async () => {
        return new Response(
          JSON.stringify({
            error: true,
            reason: "Latitude must be in range -90 to 90",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      };

      const adapter = new OpenMeteoAdapter({ fetchFn: mockFetch });

      await assert.rejects(
        async () => {
          await adapter.getForecast({ latitude: 50, longitude: 10 });
        },
        (err: unknown) => {
          assert.ok(err instanceof WeatherError);
          assert.equal(err.code, "INVALID_PARAMETERS");
          assert.ok(err.message.includes("Latitude must be in range"));
          return true;
        }
      );
    });
  });
});
