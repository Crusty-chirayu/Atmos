/**
 * ATMOS M4: Supabase Server Client
 *
 * App Router server client for route handlers, server actions, and server components.
 * Derives user authentication strictly from verified session cookies.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isSupabaseConfigured, publicEnv } from "@/lib/config/env";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function createServerSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // Ignored if middleware refreshes user sessions.
          }
        },
      },
    }
  );
}

/**
 * Returns verified authenticated user from the current request session.
 * Fails safely (returns null) if session is invalid or Supabase is unconfigured.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}
