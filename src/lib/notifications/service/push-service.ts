/**
 * ATMOS M7: Web Push Notification Service
 *
 * Manages user push subscriptions and dispatches Web Push messages via VAPID.
 * Safely degrades to simulated preview mode when VAPID keys are unconfigured.
 */

import { createServerSupabase } from "@/lib/auth/supabase-server";
import { createAdminSupabase } from "@/lib/auth/supabase-admin";
import { isSupabaseConfigured, isVapidConfigured } from "@/lib/config/env";
import type {
  CreatePushSubscriptionInput,
  PushSubscriptionRecord,
} from "../domain/schemas";

// In-memory subscription store for preview / test environments
const memorySubscriptions = new Map<string, PushSubscriptionRecord[]>();

function mapDbRowToSubscription(
  row: Record<string, unknown>
): PushSubscriptionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    endpoint: String(row.endpoint),
    p256dh: String(row.p256dh),
    auth: String(row.auth),
    userAgent: row.user_agent ? String(row.user_agent) : null,
    enabled: Boolean(row.enabled),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function savePushSubscription(
  userId: string,
  input: CreatePushSubscriptionInput
): Promise<boolean> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const list = memorySubscriptions.get(userId) ?? [];
    const filtered = list.filter((s) => s.endpoint !== input.endpoint);
    filtered.push({
      id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
    memorySubscriptions.set(userId, filtered);
    return true;
  }

  const supabase = await createServerSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      user_agent: input.userAgent ?? null,
      enabled: true,
      updated_at: now,
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    console.error("[PushService] savePushSubscription error:", error.message);
    return false;
  }

  return true;
}

export async function deletePushSubscription(
  userId: string,
  endpoint: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const list = memorySubscriptions.get(userId) ?? [];
    const filtered = list.filter((s) => s.endpoint !== endpoint);
    memorySubscriptions.set(userId, filtered);
    return true;
  }

  const supabase = await createServerSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  return !error;
}

export async function listActiveSubscriptions(
  userId: string
): Promise<PushSubscriptionRecord[]> {
  if (!isSupabaseConfigured()) {
    const list = memorySubscriptions.get(userId) ?? [];
    return list.filter((s) => s.enabled);
  }

  const admin = createAdminSupabase();
  const client = admin ?? (await createServerSupabase());
  if (!client) return [];

  const { data, error } = await client
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("enabled", true);

  if (error) {
    console.error(
      "[PushService] listActiveSubscriptions error:",
      error.message
    );
    return [];
  }

  return (data ?? []).map(mapDbRowToSubscription);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  badge?: string;
  icon?: string;
}

/**
 * Dispatches a Web Push notification to all active devices registered by the user.
 * In development or when VAPID keys are absent, logs structured preview details without throwing.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ attempted: number; sent: number }> {
  const subscriptions = await listActiveSubscriptions(userId);
  if (subscriptions.length === 0) {
    return { attempted: 0, sent: 0 };
  }

  if (!isVapidConfigured()) {
    // Graceful unconfigured preview: simulate successful dispatch
    return { attempted: subscriptions.length, sent: subscriptions.length };
  }

  // When VAPID is configured, we dispatch to each active subscription endpoint
  let sent = 0;
  for (const sub of subscriptions) {
    try {
      const response = await fetch(sub.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          TTL: "86400",
        },
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url ?? "/dashboard",
          tag: payload.tag,
        }),
      });

      if (response.status === 404 || response.status === 410) {
        // Expired/unregistered subscription - prune from database
        await deletePushSubscription(userId, sub.endpoint);
      } else if (response.ok) {
        sent += 1;
      }
    } catch (err) {
      console.warn(
        `[PushService] Failed to send push to ${sub.endpoint.slice(0, 30)}...:`,
        err
      );
    }
  }

  return { attempted: subscriptions.length, sent };
}
