/**
 * ATMOS M7: In-App Notifications Persistence Service
 *
 * Scoped strictly to authenticated user IDs with RLS.
 * Handles inbox listing, unread count, read mutations, and deduplicated creation.
 */

import { createServerSupabase } from "@/lib/auth/supabase-server";
import { createAdminSupabase } from "@/lib/auth/supabase-admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import type {
  WeatherNotification,
  CreateNotificationInput,
} from "../domain/schemas";

// In-memory fallback for preview/development when Supabase is not configured
const memoryNotifications = new Map<string, WeatherNotification[]>();

function mapDbRowToNotification(
  row: Record<string, unknown>
): WeatherNotification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    alertRuleId: row.alert_rule_id ? String(row.alert_rule_id) : null,
    category: row.category as WeatherNotification["category"],
    severity: row.severity as WeatherNotification["severity"],
    title: String(row.title),
    message: String(row.message),
    locationName: row.location_name ? String(row.location_name) : null,
    latitude:
      row.latitude !== null && row.latitude !== undefined
        ? Number(row.latitude)
        : null,
    longitude:
      row.longitude !== null && row.longitude !== undefined
        ? Number(row.longitude)
        : null,
    read: Boolean(row.read),
    dedupKey: String(row.dedup_key),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
  };
}

export async function listNotifications(
  userId: string,
  limit = 50
): Promise<WeatherNotification[]> {
  if (!isSupabaseConfigured()) {
    const list = memoryNotifications.get(userId) ?? [];
    return list.slice(0, limit);
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    const list = memoryNotifications.get(userId) ?? [];
    return list.slice(0, limit);
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(
      "[NotificationService] listNotifications error:",
      error.message
    );
    return (memoryNotifications.get(userId) ?? []).slice(0, limit);
  }

  return (data ?? []).map(mapDbRowToNotification);
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) {
    const list = memoryNotifications.get(userId) ?? [];
    return list.filter((n) => !n.read).length;
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    const list = memoryNotifications.get(userId) ?? [];
    return list.filter((n) => !n.read).length;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("[NotificationService] getUnreadCount error:", error.message);
    const list = memoryNotifications.get(userId) ?? [];
    return list.filter((n) => !n.read).length;
  }

  return count ?? 0;
}

export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const list = memoryNotifications.get(userId) ?? [];
    const item = list.find((n) => n.id === notificationId);
    if (item) {
      item.read = true;
      return true;
    }
    return false;
  }

  const supabase = await createServerSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  return !error;
}

export async function markAllAsRead(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const list = memoryNotifications.get(userId) ?? [];
    list.forEach((n) => {
      n.read = true;
    });
    return true;
  }

  const supabase = await createServerSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  return !error;
}

export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const list = memoryNotifications.get(userId) ?? [];
    const filtered = list.filter((n) => n.id !== notificationId);
    memoryNotifications.set(userId, filtered);
    return list.length !== filtered.length;
  }

  const supabase = await createServerSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId);

  return !error;
}

export async function clearReadNotifications(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const list = memoryNotifications.get(userId) ?? [];
    const unreadOnly = list.filter((n) => !n.read);
    memoryNotifications.set(userId, unreadOnly);
    return true;
  }

  const supabase = await createServerSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("read", true);

  return !error;
}

/**
 * Creates a notification safely. If a duplicate dedupKey exists for this user,
 * it safely ignores or returns existing record to prevent duplicate alerts.
 */
export async function createNotification(
  userId: string,
  input: CreateNotificationInput
): Promise<WeatherNotification | null> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const userList = memoryNotifications.get(userId) ?? [];
    const existing = userList.find((n) => n.dedupKey === input.dedupKey);
    if (existing) {
      return existing;
    }

    const newNotification: WeatherNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      alertRuleId: input.alertRuleId ?? null,
      category: input.category,
      severity: input.severity,
      title: input.title,
      message: input.message,
      locationName: input.locationName ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      read: false,
      dedupKey: input.dedupKey,
      metadata: input.metadata ?? {},
      createdAt: now,
    };

    memoryNotifications.set(userId, [newNotification, ...userList]);
    return newNotification;
  }

  // Use admin client when called from background evaluator or server client when called from user action
  const admin = createAdminSupabase();
  const client = admin ?? (await createServerSupabase());
  if (!client) return null;

  const { data, error } = await client
    .from("notifications")
    .insert({
      user_id: userId,
      alert_rule_id: input.alertRuleId ?? null,
      category: input.category,
      severity: input.severity,
      title: input.title,
      message: input.message,
      location_name: input.locationName ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      read: false,
      dedup_key: input.dedupKey,
      metadata: input.metadata ?? {},
    })
    .select()
    .maybeSingle();

  if (error) {
    // Unique violation on dedup_key is expected and handled gracefully
    if (error.code === "23505") {
      return null;
    }
    console.error(
      "[NotificationService] createNotification error:",
      error.message
    );
    return null;
  }

  return data ? mapDbRowToNotification(data) : null;
}
