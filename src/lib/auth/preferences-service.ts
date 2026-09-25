/**
 * ATMOS M4: User Preferences Service
 *
 * Persists and retrieves user display preferences under strict RLS.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_USER_PREFERENCES, UserPreferences } from "./types";
import { UpdateUserPreferencesInput } from "./validation";

export async function getUserPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user preferences: ${error.message}`);
  }

  if (data) {
    return data as UserPreferences;
  }

  // Fallback: initialize preferences if missing
  const initialPrefs = {
    user_id: userId,
    ...DEFAULT_USER_PREFERENCES,
  };

  const { data: created, error: insertError } = await supabase
    .from("user_preferences")
    .insert(initialPrefs)
    .select()
    .single();

  if (insertError) {
    // If conflict occurred concurrently, re-fetch
    const { data: refetched } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (refetched) return refetched as UserPreferences;
    return initialPrefs as UserPreferences;
  }

  return created as UserPreferences;
}

export async function updateUserPreferences(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateUserPreferencesInput
): Promise<UserPreferences> {
  const payload: Partial<UserPreferences> = {
    ...input,
  };

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert({
      user_id: userId,
      ...payload,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user preferences: ${error.message}`);
  }

  return data as UserPreferences;
}
