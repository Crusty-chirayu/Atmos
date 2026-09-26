/**
 * ATMOS M7: Alert Evaluation Orchestrator
 *
 * Coordinates scheduled evaluations:
 * 1. Loads enabled alert rules.
 * 2. Deduplicates weather queries by geographic coordinates to protect Open-Meteo rate limits.
 * 3. Evaluates rules against real weather telemetry.
 * 4. Enforces cooldown windows and duplicate suppression.
 * 5. Persists in-app notifications and dispatches push alerts.
 */

import {
  listActiveRulesForEvaluation,
  listAlertRules,
  recordRuleEvaluation,
} from "../service/alert-service";
import { createNotification } from "../service/notification-service";
import { sendPushToUser } from "../service/push-service";
import {
  evaluateAlertRule,
  isCooldownActive,
  generateDedupKey,
} from "./alert-evaluator";
import { getWeatherService } from "@/lib/weather/service";
import type { AlertEvaluationSummary, AlertRule } from "../domain/schemas";
import type { WeatherBundle } from "@/lib/weather/domain/weather";

export async function runAlertEvaluation(options?: {
  userId?: string;
}): Promise<AlertEvaluationSummary> {
  const startTime = Date.now();
  const summary: AlertEvaluationSummary = {
    rulesEvaluated: 0,
    triggersDetected: 0,
    notificationsCreated: 0,
    pushNotificationsAttempted: 0,
    pushNotificationsSent: 0,
    skippedCooldown: 0,
    errors: [],
    durationMs: 0,
  };

  try {
    const rules: AlertRule[] = options?.userId
      ? (await listAlertRules(options.userId)).filter((r) => r.enabled)
      : await listActiveRulesForEvaluation();

    if (rules.length === 0) {
      summary.durationMs = Date.now() - startTime;
      return summary;
    }

    const weatherService = getWeatherService();

    // 1. Group rules by rounded coordinate key (to 2 decimal places ~1km) to reuse weather telemetry
    const weatherCache = new Map<string, WeatherBundle>();
    const getCoordKey = (lat: number, lon: number) =>
      `${lat.toFixed(2)},${lon.toFixed(2)}`;

    for (const rule of rules) {
      summary.rulesEvaluated += 1;

      // Check cooldown window
      if (isCooldownActive(rule)) {
        summary.skippedCooldown += 1;
        continue;
      }

      try {
        const coordKey = getCoordKey(rule.latitude, rule.longitude);
        let bundle = weatherCache.get(coordKey);

        if (!bundle) {
          bundle = await weatherService.getWeatherBundle(
            rule.locationName,
            {
              latitude: rule.latitude,
              longitude: rule.longitude,
            },
            { forecastDays: 3 }
          );
          if (bundle) {
            weatherCache.set(coordKey, bundle);
          }
        }

        if (!bundle) {
          continue;
        }

        const triggerResult = evaluateAlertRule(rule, bundle);

        if (triggerResult) {
          summary.triggersDetected += 1;
          const dedupKey = generateDedupKey(rule.id);

          // Persist in-app notification
          const notif = await createNotification(rule.userId, {
            alertRuleId: rule.id,
            category: "weather_alert",
            severity: triggerResult.severity,
            title: triggerResult.title,
            message: triggerResult.message,
            locationName: rule.locationName,
            latitude: rule.latitude,
            longitude: rule.longitude,
            dedupKey,
            metadata: {
              ruleName: rule.name,
              alertType: rule.alertType,
              observedValue: triggerResult.currentValue,
              thresholdValue: triggerResult.thresholdValue,
              unit: triggerResult.unit,
            },
          });

          if (notif) {
            summary.notificationsCreated += 1;

            // Dispatch Web Push notification
            const pushResult = await sendPushToUser(rule.userId, {
              title: triggerResult.title,
              body: triggerResult.message,
              tag: `alert-${rule.id}`,
              url: `/dashboard?lat=${rule.latitude}&lon=${rule.longitude}`,
            });

            summary.pushNotificationsAttempted += pushResult.attempted;
            summary.pushNotificationsSent += pushResult.sent;
          }

          // Record triggered evaluation timestamp
          await recordRuleEvaluation(rule.id, true);
        } else {
          // Record untriggered evaluation timestamp
          await recordRuleEvaluation(rule.id, false);
        }
      } catch (ruleErr) {
        const errMsg =
          ruleErr instanceof Error ? ruleErr.message : String(ruleErr);
        summary.errors.push({ ruleId: rule.id, error: errMsg });
      }
    }
  } catch (globalErr) {
    const errMsg =
      globalErr instanceof Error ? globalErr.message : String(globalErr);
    summary.errors.push({ ruleId: "global", error: errMsg });
  }

  summary.durationMs = Date.now() - startTime;
  return summary;
}
