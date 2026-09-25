/**
 * ATMOS M4: User Profile Service
 *
 * Persists and retrieves profile details under strict RLS.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "./types";

export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  return (data as UserProfile) ?? null;
}

export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: { display_name?: string | null; avatar_url?: string | null }
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      ...updates,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }

  return data as UserProfile;
}
