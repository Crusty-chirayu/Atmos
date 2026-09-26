import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

// Services
import { getWeatherService } from "../../src/lib/weather/service";
import { MetricUnits } from "../../src/lib/weather/domain/units";
import { getGeocodingService } from "../../src/lib/geocoding/service";
import {
  evaluateAlertRule,
  isCooldownActive,
  generateDedupKey,
} from "../../src/lib/notifications/evaluator/alert-evaluator";
import {
  createNotification,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearReadNotifications,
} from "../../src/lib/notifications/service/notification-service";
import { saveLocation } from "../../src/lib/auth/locations-service";
import { buildWeatherGroundingSnapshot } from "../../src/lib/ai/context/grounding";
import { SlidingWindowRateLimiter } from "../../src/lib/security/rate-limit";

// Route Handlers
import { GET as getWeatherRoute } from "../../src/app/api/weather/route";
import { POST as postAiChat } from "../../src/app/api/ai/chat/route";
import { GET as getAlertsRoute } from "../../src/app/api/user/alerts/route";
import { GET as getLocationsRoute } from "../../src/app/api/user/locations/route";
import { GET as getPreferencesRoute } from "../../src/app/api/user/preferences/route";

describe("Milestone 10: Complete End-to-End User Journeys & Security Audit", () => {
  const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY A: Weather Discovery
  // ──────────────────────────────────────────────────────────────────────────
  test("Journey A — Weather Discovery: Search -> Current -> Forecast", async () => {
    // 1. Search for a global location
    const geoService = getGeocodingService();
    const searchRes = await geoService.search({ query: "Sydney", count: 3 });
    assert.ok(
      searchRes.results.length > 0,
      "Sydney search must return matches"
    );
    const target = searchRes.results[0];
    assert.strictEqual(target.name, "Sydney");

    // 2. Fetch full meteorological bundle
    const weatherService = getWeatherService();
    const bundle = await weatherService.getWeatherBundle(
      target.name,
      {
        latitude: target.latitude,
        longitude: target.longitude,
      },
      { units: MetricUnits }
    );

    assert.ok(bundle, "Weather bundle must be returned");
    assert.ok(typeof bundle.current.temperature === "number");
    assert.ok(bundle.hourly.entries.length >= 24, "At least 24 hours forecast");
    assert.ok(bundle.daily.days.length >= 7, "At least 7 days outlook");
    assert.ok(bundle.meta.provider, "Provider metadata must be present");

    // 3. Test HTTP API Route handler
    const req = new NextRequest(
      `http://localhost:3000/api/weather?latitude=${target.latitude}&longitude=${target.longitude}&units=imperial`
    );
    const res = await getWeatherRoute(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.current, "Current weather returned from API route");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY B: Saved Locations & Preferences Security
  // ──────────────────────────────────────────────────────────────────────────
  test("Journey B — Saved Locations & User Preferences Security", async () => {
    // 1. Unauthenticated requests to user locations and preferences are blocked
    const unauthLocs = await getLocationsRoute();
    assert.strictEqual(unauthLocs.status, 401);

    const unauthPrefs = await getPreferencesRoute();
    assert.strictEqual(unauthPrefs.status, 401);

    // 2. Mock Supabase Client to verify location save and deduplication
    const mockStorage = new Map<string, any>();
    const mockSupabase: any = {
      from: (table: string) => {
        const builder: any = {
          select: () => builder,
          eq: (field: string, val: any) => {
            builder[`_${field}`] = val;
            return builder;
          },
          order: () => builder,
          maybeSingle: async () => {
            const key = `${builder._latitude},${builder._longitude}`;
            return { data: mockStorage.get(key) || null, error: null };
          },
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const rec = {
                  id: "saved-loc-123",
                  ...payload,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                mockStorage.set(
                  `${payload.latitude},${payload.longitude}`,
                  rec
                );
                return { data: rec, error: null };
              },
            }),
          }),
        };
        return builder;
      },
    };

    const saved = await saveLocation(mockSupabase, TEST_USER_ID, {
      name: "Reykjavik",
      country: "Iceland",
      country_code: "IS",
      admin_area: "Capital Region",
      latitude: 64.1466,
      longitude: -21.9426,
      timezone: "Atlantic/Reykjavik",
      label: "Northern Lights Base",
      display_order: 0,
    });

    assert.ok(saved.id, "Saved location must have an ID");
    assert.strictEqual(saved.name, "Reykjavik");

    // Deduplication check: saving identical coordinates returns existing record
    const duplicate = await saveLocation(mockSupabase, TEST_USER_ID, {
      name: "Reykjavik",
      latitude: 64.1466,
      longitude: -21.9426,
      display_order: 0,
    });
    assert.strictEqual(
      duplicate.id,
      saved.id,
      "Duplicate coordinates return existing ID"
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY C: AI Weather Intelligence & Grounding
  // ──────────────────────────────────────────────────────────────────────────
  test("Journey C — AI Intelligence & Grounding Context Verification", async () => {
    // 1. Build weather grounding snapshot for Paris
    const snapshot = await buildWeatherGroundingSnapshot({
      name: "Paris",
      country: "France",
      latitude: 48.8566,
      longitude: 2.3522,
    });

    assert.ok(snapshot, "Grounding snapshot must be built");
    assert.strictEqual(snapshot.location.name, "Paris");
    assert.ok(typeof snapshot.current?.temperature === "number");

    // 2. Send query to AI endpoint
    const req = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Should I take an umbrella in Paris today?",
        location: {
          name: "Paris",
          latitude: 48.8566,
          longitude: 2.3522,
        },
      }),
    });

    const res = await postAiChat(req);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.ok(data.reply, "AI reply must be returned");
    assert.ok(data.reply.length > 10, "AI reply is descriptive");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY D: Weather Alert Evaluation Engine
  // ──────────────────────────────────────────────────────────────────────────
  test("Journey D — Weather Alert Engine & Deduplication Suppression", () => {
    const mockWeather = {
      location: {
        name: "Chicago",
        latitude: 41.8781,
        longitude: -87.6298,
        timezone: "America/Chicago",
      },
      current: {
        timestamp: new Date().toISOString(),
        temperature: 38.5, // High heat
        apparentTemperature: 43.0,
        relativeHumidity: 70,
        precipitation: 0.0,
        weatherCode: 0,
        conditionText: "Clear sky",
        conditionCategory: "clear" as const,
        cloudCover: 5,
        pressureMsl: 1012,
        windSpeed: 15,
        windDirection: 200,
        uvIndex: 9,
        isDay: true,
      },
      hourly: { entries: [] },
      daily: { days: [] },
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
        timezone: "America/Chicago",
      },
    };

    const heatRule = {
      id: "rule-chicago-heat",
      userId: TEST_USER_ID,
      name: "Chicago Extreme Heat",
      locationId: null,
      locationName: "Chicago",
      latitude: 41.8781,
      longitude: -87.6298,
      alertType: "temp_above" as const,
      thresholdValue: 35,
      thresholdUnit: "°C",
      comparisonOperator: ">" as const,
      enabled: true,
      cooldownMinutes: 360,
      lastEvaluatedAt: null,
      lastTriggeredAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Initial evaluation triggers alert
    const triggerRes = evaluateAlertRule(heatRule, mockWeather);
    assert.ok(triggerRes, "Alert must trigger at 38.5°C with threshold > 35°C");
    assert.strictEqual(triggerRes.triggered, true);

    // 2. Verify deduplication key format
    const dedupKey = generateDedupKey(heatRule.id);
    assert.ok(dedupKey.startsWith("alert:rule-chicago-heat:"));

    // 3. Test cooldown suppression
    const justTriggeredRule = {
      ...heatRule,
      lastTriggeredAt: new Date().toISOString(),
    };
    assert.strictEqual(
      isCooldownActive(justTriggeredRule),
      true,
      "Cooldown must be active immediately after trigger"
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY E: In-App Notification Center Lifecycle
  // ──────────────────────────────────────────────────────────────────────────
  test("Journey E — In-App Notifications: Create -> Unread -> Read -> Clear", async () => {
    const dedupKey = `test:notif:${Date.now()}`;

    // 1. Create notification
    const notif = await createNotification(TEST_USER_ID, {
      category: "weather_alert",
      severity: "critical",
      title: "Freeze Warning",
      message: "Frost conditions expected tonight.",
      locationName: "Denver",
      latitude: 39.7392,
      longitude: -104.9903,
      dedupKey,
      metadata: { source: "e2e_test" },
    });

    assert.ok(notif, "Notification must be created");
    assert.strictEqual(notif.read, false);

    // 2. Duplicate suppression
    const duplicateNotif = await createNotification(TEST_USER_ID, {
      category: "weather_alert",
      severity: "critical",
      title: "Freeze Warning (Duplicate)",
      message: "Frost conditions expected tonight.",
      locationName: "Denver",
      latitude: 39.7392,
      longitude: -104.9903,
      dedupKey,
      metadata: { source: "e2e_test" },
    });
    assert.strictEqual(
      duplicateNotif?.id,
      notif.id,
      "Duplicate creation returns original notification"
    );

    // 3. Verify unread count
    const unread = await getUnreadCount(TEST_USER_ID);
    assert.ok(unread >= 1, "Unread count must be at least 1");

    // 4. Mark single as read
    const readSuccess = await markAsRead(notif.id, TEST_USER_ID);
    assert.strictEqual(readSuccess, true);

    // 5. Mark all as read
    const allReadSuccess = await markAllAsRead(TEST_USER_ID);
    assert.strictEqual(allReadSuccess, true);

    // 6. Clear read notifications
    const clearSuccess = await clearReadNotifications(TEST_USER_ID);
    assert.strictEqual(clearSuccess, true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JOURNEY G: Security Boundaries & Defensive Controls
  // ──────────────────────────────────────────────────────────────────────────
  test("Journey G — Security Audit: Auth Gates, Injection Rejection & Rate Limiting", async () => {
    // 1. Protected user endpoints return 401 when unauthenticated
    const unauthAlerts = await getAlertsRoute();
    assert.strictEqual(unauthAlerts.status, 401);

    // 2. Input validation rejection on invalid coordinates
    const invalidCoordsReq = new NextRequest(
      "http://localhost:3000/api/weather?latitude=999&longitude=-74.0"
    );
    const invalidCoordsRes = await getWeatherRoute(invalidCoordsReq);
    assert.strictEqual(
      invalidCoordsRes.status,
      400,
      "Out-of-bounds latitude (999) rejected with 400"
    );

    // 3. Rejection of malformed JSON payloads in AI endpoint
    const badJsonReq = new NextRequest("http://localhost:3000/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ broken-json ",
    });
    const badJsonRes = await postAiChat(badJsonReq);
    assert.strictEqual(
      badJsonRes.status,
      400,
      "Malformed JSON rejected with 400"
    );

    // 4. Rate limiter prevents request flooding
    const testLimiter = new SlidingWindowRateLimiter({
      windowMs: 1000,
      maxRequests: 3,
    });

    assert.strictEqual(testLimiter.check("ip-1").allowed, true);
    assert.strictEqual(testLimiter.check("ip-1").allowed, true);
    assert.strictEqual(testLimiter.check("ip-1").allowed, true);
    const blocked = testLimiter.check("ip-1");
    assert.strictEqual(
      blocked.allowed,
      false,
      "4th request in window must be blocked"
    );
    assert.ok(blocked.retryAfterSec >= 0);
  });
});
