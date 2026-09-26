/**
 * ATMOS M7: Notification & Weather Alerts Domain Models & Schemas
 */

import { z } from "zod";

export const AlertTypeSchema = z.enum([
  "temp_above",
  "temp_below",
  "high_wind",
  "precipitation",
  "freeze",
  "severe_weather",
]);
export type AlertType = z.infer<typeof AlertTypeSchema>;

export const ComparisonOperatorSchema = z.enum([">", ">=", "<", "<=", "=="]);
export type ComparisonOperator = z.infer<typeof ComparisonOperatorSchema>;

export const NotificationSeveritySchema = z.enum([
  "info",
  "warning",
  "critical",
]);
export type NotificationSeverity = z.infer<typeof NotificationSeveritySchema>;

export const NotificationCategorySchema = z.enum([
  "weather_alert",
  "system",
  "trip_advisory",
]);
export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

// ─── Alert Rules ──────────────────────────────────────────────────────────

export const CreateAlertRuleSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  alertType: AlertTypeSchema,
  thresholdValue: z.number().finite("Threshold value must be a valid number"),
  thresholdUnit: z.string().min(1).max(20),
  comparisonOperator: ComparisonOperatorSchema.default(">"),
  locationId: z.string().uuid().nullable().optional(),
  locationName: z.string().min(1, "Location name is required").max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  enabled: z.boolean().default(true),
  cooldownMinutes: z.number().int().min(15).max(10080).default(360), // 15 mins to 7 days, default 6 hours
});
export type CreateAlertRuleInput = z.infer<typeof CreateAlertRuleSchema>;

export const UpdateAlertRuleSchema = CreateAlertRuleSchema.partial();
export type UpdateAlertRuleInput = z.infer<typeof UpdateAlertRuleSchema>;

export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  alertType: AlertType;
  thresholdValue: number;
  thresholdUnit: string;
  comparisonOperator: ComparisonOperator;
  locationId: string | null;
  locationName: string;
  latitude: number;
  longitude: number;
  enabled: boolean;
  cooldownMinutes: number;
  lastEvaluatedAt: string | null;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── In-App Notifications ──────────────────────────────────────────────────

export interface WeatherNotification {
  id: string;
  userId: string;
  alertRuleId: string | null;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  read: boolean;
  dedupKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export const CreateNotificationSchema = z.object({
  alertRuleId: z.string().uuid().nullable().optional(),
  category: NotificationCategorySchema.default("weather_alert"),
  severity: NotificationSeveritySchema.default("warning"),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  locationName: z.string().max(200).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  dedupKey: z.string().min(1).max(200),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;

// ─── Web Push Subscriptions ────────────────────────────────────────────────

export const PushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1, "p256dh key is required"),
  auth: z.string().min(1, "auth secret is required"),
});

export const CreatePushSubscriptionSchema = z.object({
  endpoint: z.string().url("Must be a valid push service URL"),
  keys: PushSubscriptionKeysSchema,
  userAgent: z.string().max(500).optional(),
});
export type CreatePushSubscriptionInput = z.infer<
  typeof CreatePushSubscriptionSchema
>;

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Alert Evaluation ──────────────────────────────────────────────────────

export interface AlertTriggerResult {
  ruleId: string;
  ruleName: string;
  alertType: AlertType;
  triggered: boolean;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  evaluatedAt: string;
}

export interface AlertEvaluationSummary {
  rulesEvaluated: number;
  triggersDetected: number;
  notificationsCreated: number;
  pushNotificationsAttempted: number;
  pushNotificationsSent: number;
  skippedCooldown: number;
  errors: Array<{ ruleId: string; error: string }>;
  durationMs: number;
}
