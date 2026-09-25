/**
 * ATMOS M4: Saved Locations Service
 *
 * Handles database operations for user saved locations under strict RLS.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SavedLocation } from "./types";
import { SavedLocationInput } from "./validation";

export async function getSavedLocations(
  supabase: SupabaseClient,
  userId: string
): Promise<SavedLocation[]> {
  const { data, error } = await supabase
    .from("saved_locations")
    .select("*")
    .eq("user_id", userId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch saved locations: ${error.message}`);
  }

  return (data ?? []) as SavedLocation[];
}

export async function saveLocation(
  supabase: SupabaseClient,
  userId: string,
  input: SavedLocationInput
): Promise<SavedLocation> {
  // Normalize coordinates to 5 decimal places (~1.1 meter resolution)
  const normLat = Number(input.latitude.toFixed(5));
  const normLon = Number(input.longitude.toFixed(5));

  // Check if location already exists for this user at these coordinates
  const { data: existing } = await supabase
    .from("saved_locations")
    .select("*")
    .eq("user_id", userId)
    .eq("latitude", normLat)
    .eq("longitude", normLon)
    .maybeSingle();

  if (existing) {
    return existing as SavedLocation;
  }

  const payload = {
    user_id: userId,
    name: input.name,
    country: input.country ?? null,
    country_code: input.country_code ?? null,
    admin_area: input.admin_area ?? null,
    latitude: normLat,
    longitude: normLon,
    timezone: input.timezone ?? null,
    provider_location_id: input.provider_location_id ?? null,
    label: input.label ?? null,
    display_order: input.display_order ?? 0,
  };

  const { data, error } = await supabase
    .from("saved_locations")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save location: ${error.message}`);
  }

  return data as SavedLocation;
}

export async function deleteSavedLocation(
  supabase: SupabaseClient,
  userId: string,
  locationId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("saved_locations")
    .delete()
    .eq("id", locationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete saved location: ${error.message}`);
  }

  return true;
}

export async function updateLocationLabel(
  supabase: SupabaseClient,
  userId: string,
  locationId: string,
  label: string | null
): Promise<SavedLocation> {
  const { data, error } = await supabase
    .from("saved_locations")
    .update({ label })
    .eq("id", locationId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update location label: ${error.message}`);
  }

  return data as SavedLocation;
}
