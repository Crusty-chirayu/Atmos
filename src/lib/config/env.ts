/**
 * ATMOS Environment Configuration
 *
 * Validates required environment variables at startup.
 * Fails closed — missing required server vars throw on first import.
 * Client-safe vars are explicitly exported; server vars are never re-exported
 * to client bundles (SECURITY.md §2, TECH.md §4).
 *
 * Usage:
 *   import { env } from "@/lib/config/env";
 *   env.GEMINI_API_KEY // server-only
 *   env.NEXT_PUBLIC_SUPABASE_URL // safe for client
 */

export function requireServerEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `[ATMOS] Missing required server environment variable: ${name}\n` +
        `Copy .env.example to .env.local and fill in the value.`
    );
  }
  return val;
}

function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

// ─── Public (safe in client bundles) ──────────────────────────────────────
export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_APP_ENV: (process.env.NEXT_PUBLIC_APP_ENV ?? "development") as
    "development" | "preview" | "production",
} as const;

/**
 * Returns true if public Supabase environment variables are configured with valid non-placeholder values.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return (
    url.length > 0 &&
    key.length > 0 &&
    !url.includes("your-project") &&
    !key.includes("your-anon-key")
  );
}

/**
 * Returns true if server-side Supabase Service Role Key is configured for admin operations.
 */
export function isSupabaseAdminConfigured(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return (
    isSupabaseConfigured() &&
    key.length > 0 &&
    !key.includes("your-service-role-key")
  );
}

// ─── Server-only ──────────────────────────────────────────────────────────
// This object must NEVER be imported from client components.
// Next.js will error if server-only modules are imported in the browser.
export const serverEnv = {
  /** Safe getter — returns key if set or empty string */
  get SUPABASE_SERVICE_ROLE_KEY() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  },
  get optionalServiceRoleKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  },
  get GEMINI_API_KEY() {
    return process.env.GEMINI_API_KEY ?? "";
  },
  OPEN_METEO_BASE_URL: optionalEnv(
    "OPEN_METEO_BASE_URL",
    "https://api.open-meteo.com"
  ),
  MAPBOX_ACCESS_TOKEN: optionalEnv("MAPBOX_ACCESS_TOKEN"),
} as const;

/**
 * Convenience re-export merging public env.
 * Safe to import from server components and route handlers.
 * DO NOT import `serverEnv` from client components.
 */
export const env = {
  ...publicEnv,
  ...serverEnv,
} as const;
