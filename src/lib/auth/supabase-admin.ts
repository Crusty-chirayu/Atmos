/**
 * ATMOS M4: Supabase Admin Client
 *
 * Strictly server-only client using SUPABASE_SERVICE_ROLE_KEY.
 * Never exposed to browser bundles or public routes.
 * Used exclusively for verified operations such as auth.admin.deleteUser.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isSupabaseAdminConfigured,
  publicEnv,
  serverEnv,
} from "@/lib/config/env";

export function createAdminSupabase(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.optionalServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
