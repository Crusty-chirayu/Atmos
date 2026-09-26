import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

// Domain & Services
import { getWeatherService } from "../../src/lib/weather/service";
import { getGeocodingService } from "../../src/lib/geocoding/service";
import { evaluateAlertRule } from "../../src/lib/notifications/evaluator/alert-evaluator";
import {
  isSupabaseConfigured,
  isVapidConfigured,
} from "../../src/lib/config/env";

// Route Handlers
import { GET as getWeather } from "../../src/app/api/weather/route";
import { GET as getGeocoding } from "../../src/app/api/weather/geocoding/route";
import { GET as getAlerts } from "../../src/app/api/user/alerts/route";
import { GET as getNotifications } from "../../src/app/api/user/notifications/route";
import { POST as postCronAlerts } from "../../src/app/api/cron/evaluate-alerts/route";
import { POST as postAiChat } from "../../src/app/api/ai/chat/route";

describe("Milestone 9: Release Candidate Smoke Test Suite", () => {
  const rootDir = process.cwd();

  test("1. PWA Manifest & Service Worker Assets", () => {
    const manifestPath = path.join(rootDir, "public", "manifest.json");
    const swPath = path.join(rootDir, "public", "sw.js");
    const icon192 = path.join(rootDir, "public", "icons", "icon-192.png");
    const icon512 = path.join(rootDir, "public", "icons", "icon-512.png");

    assert.ok(fs.existsSync(manifestPath), "manifest.json must exist");
    assert.ok(fs.existsSync(swPath), "sw.js must exist");
    assert.ok(fs.existsSync(icon192), "icon-192.png must exist");
    assert.ok(fs.existsSync(icon512), "icon-512.png must exist");

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    assert.strictEqual(manifest.name, "ATMOS");
    assert.strictEqual(manifest.display, "standalone");
  });

  test("2. Application Route Files & Structure Integrity", () => {
    const requiredPages = [
      "src/app/page.tsx",
      "src/app/dashboard/page.tsx",
      "src/app/ai/page.tsx",
      "src/app/account/page.tsx",
      "src/app/(auth)/login/page.tsx",
      "src/app/(auth)/signup/page.tsx",
      "src/app/offline/page.tsx",
      "src/app/not-found.tsx",
    ];

    for (const page of requiredPages) {
      assert.ok(
        fs.existsSync(path.join(rootDir, page)),
        `Page route ${page} must exist`
      );
    }
  });

  test("3. Geocoding Service & API Route", async () => {
    const geoService = getGeocodingService();
    assert.ok(geoService, "GeocodingService singleton exists");

    const req = new NextRequest(
      "http://localhost:3000/api/weather/geocoding?q=Tokyo&count=5"
    );
    const res = await getGeocoding(req);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.ok(Array.isArray(data.results), "Results must be an array");
    assert.ok(data.results.length > 0, "Tokyo search returns locations");
    assert.strictEqual(data.results[0].name, "Tokyo");
  });

  test("4. Weather Service & API Bundle Retrieval", async () => {
    const weatherService = getWeatherService();
    assert.ok(weatherService, "WeatherService singleton exists");

    const req = new NextRequest(
      "http://localhost:3000/api/weather?latitude=35.6895&longitude=139.6917&units=metric"
    );
    const res = await getWeather(req);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.ok(data.current, "Current weather must be present");
    assert.ok(typeof data.current.temperature === "number");
    assert.ok(data.hourly, "Hourly forecast must be present");
    assert.ok(data.daily, "Daily forecast must be present");
  });

  test("5. Authentication UI & Protected Route Boundaries", async () => {
    // Unauthenticated GET to /api/user/alerts must return 401
    const alertsRes = await getAlerts();
    assert.strictEqual(alertsRes.status, 401);

    // Unauthenticated GET to /api/user/notifications must return 401
    const notifsReq = new NextRequest(
      "http://localhost:3000/api/user/notifications"
    );
    const notifsRes = await getNotifications(notifsReq);
    assert.strictEqual(notifsRes.status, 401);
  });

  test("6. Scheduled Evaluator Security Gate", async () => {
    const previousCronSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "smoke-cron-secret-12345-very-secure";

    try {
      // Unauthenticated cron invocation without token must return 401
      const unauthReq = new NextRequest(
        "http://localhost:3000/api/cron/evaluate-alerts",
        {
          method: "POST",
        }
      );
      const unauthRes = await postCronAlerts(unauthReq);
      assert.strictEqual(unauthRes.status, 401);

      // Authenticated cron invocation with correct token must return 200
      const authReq = new NextRequest(
        "http://localhost:3000/api/cron/evaluate-alerts",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer smoke-cron-secret-12345-very-secure",
          },
        }
      );
      const authRes = await postCronAlerts(authReq);
      assert.strictEqual(authRes.status, 200);
    } finally {
      if (previousCronSecret) {
        process.env.CRON_SECRET = previousCronSecret;
      } else {
        delete process.env.CRON_SECRET;
      }
    }
  });

  test("7. AI Assistant Endpoint & Graceful Unconfigured Fallback", async () => {
    const req = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "What is the forecast in Paris?",
        location: {
          name: "Paris",
          latitude: 48.8566,
          longitude: 2.3522,
        },
      }),
    });

    const res = await postAiChat(req);
    // Even if GEMINI_API_KEY is not set in development, it returns 200 with grounded simulated telemetry
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.ok(data.reply, "Response must include AI reply");
    assert.strictEqual(typeof data.reply, "string");
    assert.ok(data.reply.length > 0, "AI reply content must be non-empty");
  });

  test("8. Weather Alert Evaluator Determinism", () => {
    const sampleWeather = {
      location: {
        name: "Denver",
        latitude: 39.7392,
        longitude: -104.9903,
        timezone: "America/Denver",
      },
      current: {
        timestamp: "2026-09-26T12:00:00Z",
        temperature: -5.0,
        apparentTemperature: -9.0,
        relativeHumidity: 40,
        precipitation: 0.0,
        weatherCode: 71,
        conditionText: "Snowfall",
        conditionCategory: "snow" as const,
        cloudCover: 90,
        pressureMsl: 1020,
        windSpeed: 25,
        windDirection: 180,
        windGusts: 40,
        uvIndex: 1,
        isDay: true,
      },
      hourly: {
        entries: [],
      },
      daily: {
        days: [],
      },
      meta: {
        provider: "open-meteo",
        fetchedAt: new Date().toISOString(),
        isCached: false,
        isStale: false,
        units: {
          temperature: "celsius" as const,
          windSpeed: "kmh" as const,
          precipitation: "mm" as const,
          pressure: "hpa" as const,
          elevation: "m" as const,
          distance: "km" as const,
        },
        timezone: "America/Denver",
      },
    };

    const freezeRule = {
      id: "rule-freeze-test",
      userId: "user-123",
      name: "Denver Frost Alert",
      locationId: null,
      locationName: "Denver",
      latitude: 39.7392,
      longitude: -104.9903,
      alertType: "freeze" as const,
      thresholdValue: 0,
      thresholdUnit: "°C",
      comparisonOperator: "<=" as const,
      enabled: true,
      cooldownMinutes: 360,
      lastEvaluatedAt: null,
      lastTriggeredAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = evaluateAlertRule(freezeRule, sampleWeather);
    assert.ok(result, "Result must not be null");
    assert.strictEqual(
      result.triggered,
      true,
      "Freeze rule triggers at -5°C with threshold <= 0°C"
    );
    assert.ok(result.message?.includes("Denver"));
  });

  test("9. Environment Provider Configuration Status", () => {
    // Verifies helper functions return boolean without throwing exceptions
    assert.strictEqual(typeof isSupabaseConfigured(), "boolean");
    assert.strictEqual(typeof isVapidConfigured(), "boolean");
  });
});
