/**
 * ATMOS M7: Meteorological Alert Evaluation Engine
 *
 * Evaluates configured AlertRules against authoritative Open-Meteo weather telemetry.
 * Fully deterministic, isolated from persistence and network side-effects for unit testing.
 */

import type { WeatherBundle } from "@/lib/weather/domain/weather";
import {
  convertTemperature,
  convertWindSpeed,
  convertPrecipitation,
} from "@/lib/weather/domain/units";
import type {
  AlertRule,
  AlertTriggerResult,
  NotificationSeverity,
} from "../domain/schemas";

/**
 * Returns true if an alert rule is currently in its cooldown suppression period.
 */
export function isCooldownActive(
  rule: AlertRule,
  now: Date = new Date()
): boolean {
  if (!rule.lastTriggeredAt) {
    return false;
  }
  const lastTriggered = new Date(rule.lastTriggeredAt).getTime();
  const elapsedMinutes = (now.getTime() - lastTriggered) / (1000 * 60);
  return elapsedMinutes < rule.cooldownMinutes;
}

/**
 * Generates a stable hourly deduplication key to prevent duplicate notification creation.
 * Example: "alert:rule_uuid:2026-09-26T10"
 */
export function generateDedupKey(
  ruleId: string,
  timestamp: Date = new Date()
): string {
  const dateHourStr = timestamp.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
  return `alert:${ruleId}:${dateHourStr}`;
}

/**
 * Compares an observed value with a threshold using the configured operator.
 */
function compare(val: number, op: string, threshold: number): boolean {
  switch (op) {
    case ">":
      return val > threshold;
    case ">=":
      return val >= threshold;
    case "<":
      return val < threshold;
    case "<=":
      return val <= threshold;
    case "==":
      return Math.abs(val - threshold) < 0.001;
    default:
      return val > threshold;
  }
}

// Severe WMO weather codes (Thunderstorms, hail, violent showers)
const SEVERE_WMO_CODES = new Set([95, 96, 99, 82, 75, 86]);

/**
 * Evaluates a single alert rule against a verified weather bundle.
 * Returns AlertTriggerResult if the threshold condition is met, otherwise null.
 */
export function evaluateAlertRule(
  rule: AlertRule,
  bundle: WeatherBundle,
  now: Date = new Date()
): AlertTriggerResult | null {
  if (!rule.enabled) {
    return null;
  }

  const current = bundle.current;
  const hourly = bundle.hourly.entries;

  let triggered = false;
  let observedValue = 0;
  let severity: NotificationSeverity = "warning";
  let title = "";
  let message = "";

  switch (rule.alertType) {
    case "temp_above": {
      // Canonical temperature is in Celsius
      const targetUnit = rule.thresholdUnit.toLowerCase().includes("f")
        ? "fahrenheit"
        : "celsius";
      const currentTemp =
        targetUnit === "fahrenheit"
          ? convertTemperature(current.temperature, "fahrenheit")
          : current.temperature;

      observedValue = Math.round(currentTemp * 10) / 10;
      triggered = compare(
        observedValue,
        rule.comparisonOperator,
        rule.thresholdValue
      );

      if (triggered) {
        severity =
          observedValue >= (targetUnit === "fahrenheit" ? 104 : 40)
            ? "critical"
            : "warning";
        title = `High Temperature Alert: ${rule.locationName}`;
        message = `Temperature in ${rule.locationName} reached ${observedValue}°${targetUnit === "fahrenheit" ? "F" : "C"}, exceeding your threshold of ${rule.thresholdValue}°${targetUnit === "fahrenheit" ? "F" : "C"}.`;
      }
      break;
    }

    case "temp_below": {
      const targetUnit = rule.thresholdUnit.toLowerCase().includes("f")
        ? "fahrenheit"
        : "celsius";
      const currentTemp =
        targetUnit === "fahrenheit"
          ? convertTemperature(current.temperature, "fahrenheit")
          : current.temperature;

      observedValue = Math.round(currentTemp * 10) / 10;
      triggered = compare(
        observedValue,
        rule.comparisonOperator,
        rule.thresholdValue
      );

      if (triggered) {
        severity =
          observedValue <= (targetUnit === "fahrenheit" ? 14 : -10)
            ? "critical"
            : "warning";
        title = `Low Temperature Alert: ${rule.locationName}`;
        message = `Temperature in ${rule.locationName} dropped to ${observedValue}°${targetUnit === "fahrenheit" ? "F" : "C"}, below your threshold of ${rule.thresholdValue}°${targetUnit === "fahrenheit" ? "F" : "C"}.`;
      }
      break;
    }

    case "high_wind": {
      // Canonical wind speed is km/h
      let windSpeed = current.windSpeed;
      const unit = rule.thresholdUnit.toLowerCase();
      if (unit.includes("mph")) {
        windSpeed = convertWindSpeed(current.windSpeed, "mph");
      } else if (unit.includes("m/s") || unit === "ms") {
        windSpeed = convertWindSpeed(current.windSpeed, "ms");
      } else if (unit.includes("knot") || unit.includes("kn")) {
        windSpeed = convertWindSpeed(current.windSpeed, "kn");
      }

      observedValue = Math.round(windSpeed * 10) / 10;
      triggered = compare(
        observedValue,
        rule.comparisonOperator,
        rule.thresholdValue
      );

      if (triggered) {
        severity =
          observedValue >= (unit.includes("mph") ? 55 : 90)
            ? "critical"
            : "warning";
        title = `High Wind Warning: ${rule.locationName}`;
        message = `Wind speeds in ${rule.locationName} reached ${observedValue} ${rule.thresholdUnit}, passing your configured limit of ${rule.thresholdValue} ${rule.thresholdUnit}.`;
      }
      break;
    }

    case "precipitation": {
      // Check next 12 hours for maximum probability or total volume
      const isProbability = rule.thresholdUnit.includes("%");
      if (isProbability) {
        const next12Hours = hourly.slice(0, 12);
        const maxProb = next12Hours.reduce(
          (max, entry) => Math.max(max, entry.precipitationProbability ?? 0),
          0
        );
        observedValue = maxProb;
        triggered = compare(
          observedValue,
          rule.comparisonOperator,
          rule.thresholdValue
        );

        if (triggered) {
          severity = observedValue >= 80 ? "warning" : "info";
          title = `Precipitation Alert: ${rule.locationName}`;
          message = `High chance of precipitation (${observedValue}%) forecast within the next 12 hours in ${rule.locationName}.`;
        }
      } else {
        // Volume check (mm or inch)
        let precipVolume = current.precipitation;
        if (rule.thresholdUnit.toLowerCase().includes("in")) {
          precipVolume = convertPrecipitation(precipVolume, "inch");
        }
        observedValue = Math.round(precipVolume * 100) / 100;
        triggered = compare(
          observedValue,
          rule.comparisonOperator,
          rule.thresholdValue
        );

        if (triggered) {
          severity = "warning";
          title = `Precipitation Accumulation: ${rule.locationName}`;
          message = `Precipitation volume in ${rule.locationName} reached ${observedValue} ${rule.thresholdUnit}.`;
        }
      }
      break;
    }

    case "freeze": {
      // Freeze condition: current temp <= 0°C or any freeze in next 12 hours
      const targetUnit = rule.thresholdUnit.toLowerCase().includes("f")
        ? "fahrenheit"
        : "celsius";
      const freezeLimit = targetUnit === "fahrenheit" ? 32 : 0;
      const currentTemp =
        targetUnit === "fahrenheit"
          ? convertTemperature(current.temperature, "fahrenheit")
          : current.temperature;

      const next12Hours = hourly.slice(0, 12);
      const minUpcomingTemp = next12Hours.reduce((min, entry) => {
        const t =
          targetUnit === "fahrenheit"
            ? convertTemperature(entry.temperature, "fahrenheit")
            : entry.temperature;
        return Math.min(min, t);
      }, currentTemp);

      observedValue =
        Math.round(Math.min(currentTemp, minUpcomingTemp) * 10) / 10;
      triggered = observedValue <= freezeLimit;

      if (triggered) {
        severity = "critical";
        title = `Freeze Warning: ${rule.locationName}`;
        message = `Freezing temperatures detected or imminent in ${rule.locationName} (minimum ${observedValue}°${targetUnit === "fahrenheit" ? "F" : "C"}). Take precautions for frost and icy surfaces.`;
      }
      break;
    }

    case "severe_weather": {
      // Severe weather WMO code detection
      const currentCode = current.weatherCode;
      const next6HoursCodes = hourly.slice(0, 6).map((e) => e.weatherCode);
      const hasSevereCode =
        SEVERE_WMO_CODES.has(currentCode) ||
        next6HoursCodes.some((code) => SEVERE_WMO_CODES.has(code));

      observedValue = currentCode;
      triggered = hasSevereCode;

      if (triggered) {
        severity = "critical";
        title = `Severe Weather Advisory: ${rule.locationName}`;
        message = `Severe weather conditions detected in ${rule.locationName}: ${current.conditionText}. Check local advisories.`;
      }
      break;
    }
  }

  if (!triggered) {
    return null;
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    alertType: rule.alertType,
    triggered: true,
    currentValue: observedValue,
    thresholdValue: rule.thresholdValue,
    unit: rule.thresholdUnit,
    title,
    message,
    severity,
    evaluatedAt: now.toISOString(),
  };
}
