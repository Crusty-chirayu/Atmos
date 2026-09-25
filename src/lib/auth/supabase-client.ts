/**
 * ATMOS M4: Supabase Browser Client
 *
 * Client-side singleton for authentication and user-scoped data access.
 * Returns null if Supabase is unconfigured, allowing anonymous weather exploration
 * to proceed without interruption.
 */

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, publicEnv } from "@/lib/config/env";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }

  return browserClient;
}

/**
 * Resets the client instance (useful in tests).
 */
export function resetBrowserSupabase(): void {
  browserClient = null;
}
