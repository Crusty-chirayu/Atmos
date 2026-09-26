/**
 * ATMOS M7: Alert Rules Persistence Service
 *
 * Scopes all queries strictly to the authenticated user ID.
 * Supports Supabase with RLS and non-blocking in-memory fallback when unconfigured.
 */

import { createServerSupabase } from "@/lib/auth/supabase-server";
import { createAdminSupabase } from "@/lib/auth/supabase-admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import type {
  AlertRule,
  CreateAlertRuleInput,
  UpdateAlertRuleInput,
} from "../domain/schemas";

// In-memory fallback store for development/preview when Supabase credentials are not set
const memoryAlertRules = new Map<string, AlertRule[]>();

function mapDbRowToAlertRule(row: Record<string, unknown>): AlertRule {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    alertType: row.alert_type as AlertRule["alertType"],
    thresholdValue: Number(row.threshold_value),
    thresholdUnit: String(row.threshold_unit),
    comparisonOperator:
      row.comparison_operator as AlertRule["comparisonOperator"],
    locationId: row.location_id ? String(row.location_id) : null,
    locationName: String(row.location_name),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    enabled: Boolean(row.enabled),
    cooldownMinutes: Number(row.cooldown_minutes ?? 360),
    lastEvaluatedAt: row.last_evaluated_at
      ? String(row.last_evaluated_at)
      : null,
    lastTriggeredAt: row.last_triggered_at
      ? String(row.last_triggered_at)
      : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listAlertRules(userId: string): Promise<AlertRule[]> {
  if (!isSupabaseConfigured()) {
    return memoryAlertRules.get(userId) ?? [];
  }

  const supabase = await createServerSupabase();
  if (!supabase) return memoryAlertRules.get(userId) ?? [];

  const { data, error } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[AlertService] listAlertRules error:", error.message);
    return memoryAlertRules.get(userId) ?? [];
  }

  return (data ?? []).map(mapDbRowToAlertRule);
}

export async function getAlertRule(
  ruleId: string,
  userId: string
): Promise<AlertRule | null> {
  if (!isSupabaseConfigured()) {
    const rules = memoryAlertRules.get(userId) ?? [];
    return rules.find((r) => r.id === ruleId) ?? null;
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    const rules = memoryAlertRules.get(userId) ?? [];
    return rules.find((r) => r.id === ruleId) ?? null;
  }

  const { data, error } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("id", ruleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbRowToAlertRule(data);
}

export async function createAlertRule(
  userId: string,
  input: CreateAlertRuleInput
): Promise<AlertRule> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const id = `mock-rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRule: AlertRule = {
      id,
      userId,
      name: input.name,
      alertType: input.alertType,
      thresholdValue: input.thresholdValue,
      thresholdUnit: input.thresholdUnit,
      comparisonOperator: input.comparisonOperator,
      locationId: input.locationId ?? null,
      locationName: input.locationName,
      latitude: input.latitude,
      longitude: input.longitude,
      enabled: input.enabled ?? true,
      cooldownMinutes: input.cooldownMinutes ?? 360,
      lastEvaluatedAt: null,
      lastTriggeredAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const userRules = memoryAlertRules.get(userId) ?? [];
    memoryAlertRules.set(userId, [newRule, ...userRules]);
    return newRule;
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    throw new Error("Supabase client unavailable");
  }

  const { data, error } = await supabase
    .from("alert_rules")
    .insert({
      user_id: userId,
      name: input.name,
      alert_type: input.alertType,
      threshold_value: input.thresholdValue,
      threshold_unit: input.thresholdUnit,
      comparison_operator: input.comparisonOperator,
      location_id: input.locationId ?? null,
      location_name: input.locationName,
      latitude: input.latitude,
      longitude: input.longitude,
      enabled: input.enabled ?? true,
      cooldown_minutes: input.cooldownMinutes ?? 360,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create alert rule: ${error?.message}`);
  }

  return mapDbRowToAlertRule(data);
}

export async function updateAlertRule(
  ruleId: string,
  userId: string,
  input: UpdateAlertRuleInput
): Promise<AlertRule | null> {
  if (!isSupabaseConfigured()) {
    const rules = memoryAlertRules.get(userId) ?? [];
    const index = rules.findIndex((r) => r.id === ruleId);
    if (index === -1) return null;

    const existing = rules[index];
    const updated: AlertRule = {
      ...existing,
      name: input.name ?? existing.name,
      alertType: input.alertType ?? existing.alertType,
      thresholdValue: input.thresholdValue ?? existing.thresholdValue,
      thresholdUnit: input.thresholdUnit ?? existing.thresholdUnit,
      comparisonOperator:
        input.comparisonOperator ?? existing.comparisonOperator,
      locationId:
        input.locationId !== undefined ? input.locationId : existing.locationId,
      locationName: input.locationName ?? existing.locationName,
      latitude: input.latitude ?? existing.latitude,
      longitude: input.longitude ?? existing.longitude,
      enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
      cooldownMinutes: input.cooldownMinutes ?? existing.cooldownMinutes,
      updatedAt: new Date().toISOString(),
    };

    rules[index] = updated;
    memoryAlertRules.set(userId, rules);
    return updated;
  }

  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const updatePayload: Record<string, unknown> = {};
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.alertType !== undefined) updatePayload.alert_type = input.alertType;
  if (input.thresholdValue !== undefined)
    updatePayload.threshold_value = input.thresholdValue;
  if (input.thresholdUnit !== undefined)
    updatePayload.threshold_unit = input.thresholdUnit;
  if (input.comparisonOperator !== undefined)
    updatePayload.comparison_operator = input.comparisonOperator;
  if (input.locationId !== undefined)
    updatePayload.location_id = input.locationId;
  if (input.locationName !== undefined)
    updatePayload.location_name = input.locationName;
  if (input.latitude !== undefined) updatePayload.latitude = input.latitude;
  if (input.longitude !== undefined) updatePayload.longitude = input.longitude;
  if (input.enabled !== undefined) updatePayload.enabled = input.enabled;
  if (input.cooldownMinutes !== undefined)
    updatePayload.cooldown_minutes = input.cooldownMinutes;

  const { data, error } = await supabase
    .from("alert_rules")
    .update(updatePayload)
    .eq("id", ruleId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) return null;
  return mapDbRowToAlertRule(data);
}

export async function deleteAlertRule(
  ruleId: string,
  userId: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const rules = memoryAlertRules.get(userId) ?? [];
    const filtered = rules.filter((r) => r.id !== ruleId);
    memoryAlertRules.set(userId, filtered);
    return rules.length !== filtered.length;
  }

  const supabase = await createServerSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("alert_rules")
    .delete()
    .eq("id", ruleId)
    .eq("user_id", userId);

  return !error;
}

export async function toggleAlertRule(
  ruleId: string,
  userId: string,
  enabled: boolean
): Promise<AlertRule | null> {
  return updateAlertRule(ruleId, userId, { enabled });
}

/**
 * Returns all active alert rules across all users for scheduled evaluation.
 * Uses admin client to bypass user session requirement.
 */
export async function listActiveRulesForEvaluation(): Promise<AlertRule[]> {
  const admin = createAdminSupabase();
  if (!admin) {
    // Return all memory rules across all users
    const allRules: AlertRule[] = [];
    for (const rules of memoryAlertRules.values()) {
      allRules.push(...rules.filter((r) => r.enabled));
    }
    return allRules;
  }

  const { data, error } = await admin
    .from("alert_rules")
    .select("*")
    .eq("enabled", true);

  if (error) {
    console.error(
      "[AlertService] listActiveRulesForEvaluation error:",
      error.message
    );
    return [];
  }

  return (data ?? []).map(mapDbRowToAlertRule);
}

/**
 * Updates last_evaluated_at and optionally last_triggered_at for a rule.
 */
export async function recordRuleEvaluation(
  ruleId: string,
  triggered: boolean
): Promise<void> {
  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    last_evaluated_at: now,
  };
  if (triggered) {
    updatePayload.last_triggered_at = now;
  }

  const admin = createAdminSupabase();
  if (!admin) {
    // Memory fallback
    for (const rules of memoryAlertRules.values()) {
      const rule = rules.find((r) => r.id === ruleId);
      if (rule) {
        rule.lastEvaluatedAt = now;
        if (triggered) {
          rule.lastTriggeredAt = now;
        }
        break;
      }
    }
    return;
  }

  await admin.from("alert_rules").update(updatePayload).eq("id", ruleId);
}
