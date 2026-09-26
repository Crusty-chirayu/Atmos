import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAlertRule,
  isCooldownActive,
  generateDedupKey,
} from "../../src/lib/notifications/evaluator/alert-evaluator";
import type { AlertRule } from "../../src/lib/notifications/domain/schemas";
import type { WeatherBundle } from "../../src/lib/weather/domain/weather";
import { CanonicalUnits } from "../../src/lib/weather/domain/units";

const SAMPLE_WEATHER_BUNDLE: WeatherBundle = {
  location: {
    name: "London",
    country: "United Kingdom",
    latitude: 51.5,
    longitude: -0.12,
    timezone: "UTC",
  },
  current: {
    timestamp: "2026-09-25T12:00:00Z",
    temperature: 18.5,
    apparentTemperature: 17.8,
    relativeHumidity: 65,
    precipitation: 0.2,
    weatherCode: 61,
    conditionText: "Slight rain",
    conditionCategory: "rain",
    cloudCover: 75,
    pressureMsl: 1014.2,
    windSpeed: 14.2,
    windDirection: 230,
    isDay: true,
  },
  hourly: {
    entries: [
      {
        timestamp: "2026-09-25T12:00:00Z",
        temperature: 18.5,
        apparentTemperature: 17.8,
        relativeHumidity: 65,
        precipitationProbability: 25,
        precipitation: 0.2,
        weatherCode: 61,
        conditionText: "Slight rain",
        conditionCategory: "rain",
        pressureMsl: 1014.2,
        windSpeed: 14.2,
        windDirection: 230,
      },
    ],
  },
  daily: {
    days: [
      {
        date: "2026-09-25",
        weatherCode: 61,
        conditionText: "Slight rain",
        conditionCategory: "rain",
        temperatureMax: 22.0,
        temperatureMin: 14.0,
        precipitationSum: 0.5,
        precipitationProbabilityMax: 40,
        sunrise: "2026-09-25T06:50:00Z",
        sunset: "2026-09-25T18:55:00Z",
        windSpeedMax: 16.0,
      },
    ],
  },
  meta: {
    provider: "Open-Meteo",
    fetchedAt: "2026-09-25T12:00:00Z",
    isCached: false,
    isStale: false,
    units: CanonicalUnits,
    timezone: "UTC",
  },
};

describe("Alert Evaluator Engine", () => {
  const baseRule: AlertRule = {
    id: "test-rule-1",
    userId: "user-123",
    name: "Test Rule",
    alertType: "temp_above",
    thresholdValue: 30,
    thresholdUnit: "°C",
    comparisonOperator: ">",
    locationId: null,
    locationName: "Test City",
    latitude: 40.7128,
    longitude: -74.006,
    enabled: true,
    cooldownMinutes: 360,
    lastEvaluatedAt: null,
    lastTriggeredAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test("isCooldownActive returns false when rule was never triggered", () => {
    assert.equal(isCooldownActive(baseRule), false);
  });

  test("isCooldownActive returns true within cooldown window", () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const ruleWithRecentTrigger: AlertRule = {
      ...baseRule,
      lastTriggeredAt: twoHoursAgo.toISOString(),
      cooldownMinutes: 360, // 6 hours
    };
    assert.equal(isCooldownActive(ruleWithRecentTrigger, now), true);
  });

  test("isCooldownActive returns false when cooldown has elapsed", () => {
    const now = new Date();
    const sevenHoursAgo = new Date(now.getTime() - 7 * 60 * 60 * 1000);
    const ruleWithOldTrigger: AlertRule = {
      ...baseRule,
      lastTriggeredAt: sevenHoursAgo.toISOString(),
      cooldownMinutes: 360, // 6 hours
    };
    assert.equal(isCooldownActive(ruleWithOldTrigger, now), false);
  });

  test("generateDedupKey produces consistent hourly keys", () => {
    const d1 = new Date("2026-09-26T10:15:30.000Z");
    const d2 = new Date("2026-09-26T10:45:00.000Z");
    const d3 = new Date("2026-09-26T11:00:00.000Z");

    assert.equal(
      generateDedupKey("rule-abc", d1),
      "alert:rule-abc:2026-09-26T10"
    );
    assert.equal(
      generateDedupKey("rule-abc", d2),
      "alert:rule-abc:2026-09-26T10"
    );
    assert.equal(
      generateDedupKey("rule-abc", d3),
      "alert:rule-abc:2026-09-26T11"
    );
  });

  test("returns null if rule is disabled", () => {
    const disabledRule: AlertRule = { ...baseRule, enabled: false };
    const result = evaluateAlertRule(disabledRule, SAMPLE_WEATHER_BUNDLE);
    assert.equal(result, null);
  });

  test("evaluates temp_above condition correctly", () => {
    // SAMPLE_WEATHER_BUNDLE has current.temperature = 18.5
    const triggerRule: AlertRule = {
      ...baseRule,
      alertType: "temp_above",
      thresholdValue: 15,
      thresholdUnit: "°C",
      comparisonOperator: ">",
    };
    const res1 = evaluateAlertRule(triggerRule, SAMPLE_WEATHER_BUNDLE);
    assert.notEqual(res1, null);
    assert.equal(res1?.triggered, true);
    assert.equal(res1?.currentValue, 18.5);

    const nonTriggerRule: AlertRule = {
      ...baseRule,
      alertType: "temp_above",
      thresholdValue: 25,
      thresholdUnit: "°C",
      comparisonOperator: ">",
    };
    const res2 = evaluateAlertRule(nonTriggerRule, SAMPLE_WEATHER_BUNDLE);
    assert.equal(res2, null);
  });

  test("evaluates temp_below condition correctly", () => {
    const triggerRule: AlertRule = {
      ...baseRule,
      alertType: "temp_below",
      thresholdValue: 20,
      thresholdUnit: "°C",
      comparisonOperator: "<",
    };
    const res = evaluateAlertRule(triggerRule, SAMPLE_WEATHER_BUNDLE);
    assert.notEqual(res, null);
    assert.equal(res?.triggered, true);
  });

  test("evaluates high_wind condition correctly with unit conversion", () => {
    // SAMPLE_WEATHER_BUNDLE has current.windSpeed = 14.2 km/h
    const triggerRuleKm: AlertRule = {
      ...baseRule,
      alertType: "high_wind",
      thresholdValue: 10,
      thresholdUnit: "km/h",
      comparisonOperator: ">",
    };
    const res1 = evaluateAlertRule(triggerRuleKm, SAMPLE_WEATHER_BUNDLE);
    assert.notEqual(res1, null);

    // 14.2 km/h ≈ 8.8 mph. Threshold 15 mph should not trigger
    const nonTriggerMph: AlertRule = {
      ...baseRule,
      alertType: "high_wind",
      thresholdValue: 15,
      thresholdUnit: "mph",
      comparisonOperator: ">",
    };
    const res2 = evaluateAlertRule(nonTriggerMph, SAMPLE_WEATHER_BUNDLE);
    assert.equal(res2, null);
  });

  test("evaluates precipitation condition correctly", () => {
    // SAMPLE_WEATHER_BUNDLE has hourly precipitation probabilities around 10-20%
    const triggerRule: AlertRule = {
      ...baseRule,
      alertType: "precipitation",
      thresholdValue: 10,
      thresholdUnit: "%",
      comparisonOperator: ">=",
    };
    const res = evaluateAlertRule(triggerRule, SAMPLE_WEATHER_BUNDLE);
    assert.notEqual(res, null);
    assert.equal(res?.triggered, true);
  });

  test("evaluates freeze condition correctly", () => {
    const mockColdBundle: WeatherBundle = {
      ...SAMPLE_WEATHER_BUNDLE,
      current: {
        ...SAMPLE_WEATHER_BUNDLE.current,
        temperature: -2,
      },
    };

    const freezeRule: AlertRule = {
      ...baseRule,
      alertType: "freeze",
      thresholdValue: 0,
      thresholdUnit: "°C",
      comparisonOperator: "<=",
    };

    const res = evaluateAlertRule(freezeRule, mockColdBundle);
    assert.notEqual(res, null);
    assert.equal(res?.triggered, true);
    assert.equal(res?.severity, "critical");
  });

  test("evaluates severe_weather condition correctly with WMO code", () => {
    const mockSevereBundle: WeatherBundle = {
      ...SAMPLE_WEATHER_BUNDLE,
      current: {
        ...SAMPLE_WEATHER_BUNDLE.current,
        weatherCode: 95, // Thunderstorm
        conditionText: "Thunderstorm with slight hail",
      },
    };

    const severeRule: AlertRule = {
      ...baseRule,
      alertType: "severe_weather",
      thresholdValue: 1,
      thresholdUnit: "code",
      comparisonOperator: ">=",
    };

    const res = evaluateAlertRule(severeRule, mockSevereBundle);
    assert.notEqual(res, null);
    assert.equal(res?.triggered, true);
    assert.equal(res?.severity, "critical");
  });
});
