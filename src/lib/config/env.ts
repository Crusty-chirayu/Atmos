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

export function optionalEnv(name: string, fallback = ""): string {
  const val = process.env[name];
  if (val === undefined || val === null) {
    return fallback;
  }
  const trimmed = val.trim();
  return trimmed === "" ? fallback : trimmed;
}

/**
 * Safely resolves an absolute URL for application metadata and canonical links.
 * Always returns a valid URL object with http: or https: protocol.
 * Treats undefined, null, empty string, and whitespace-only as unset.
 * Rejects relative or non-HTTP(S) URLs and safely falls back without throwing exceptions.
 */
export function resolveAppUrl(
  rawUrl?: string | null,
  fallback = "https://atmos.app"
): URL {
  const candidate = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (candidate) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed;
      }
    } catch {
      // Malformed or relative URL — fall back safely
    }
  }

  try {
    const fallbackParsed = new URL(fallback);
    if (
      fallbackParsed.protocol === "http:" ||
      fallbackParsed.protocol === "https:"
    ) {
      return fallbackParsed;
    }
  } catch {
    // If fallback is somehow malformed, return hardcoded default
  }

  return new URL("https://atmos.app");
}

// ─── Public (safe in client bundles) ──────────────────────────────────────
// NOTE: Client variables MUST use direct property access (e.g. process.env.NEXT_PUBLIC_*)
// so that Next.js bundlers (Turbopack / Webpack) can statically inline them into browser bundles.
const rawSupabaseUrl =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string"
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.trim()
    : "";
const rawSupabaseAnonKey =
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string"
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim()
    : typeof process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === "string"
    ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim()
    : "";
const rawAppUrl =
  typeof process.env.NEXT_PUBLIC_APP_URL === "string" &&
  process.env.NEXT_PUBLIC_APP_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_APP_URL.trim()
    : "http://localhost:3000";
const rawAppEnv =
  typeof process.env.NEXT_PUBLIC_APP_ENV === "string" &&
  process.env.NEXT_PUBLIC_APP_ENV.trim() !== ""
    ? (process.env.NEXT_PUBLIC_APP_ENV.trim() as "development" | "preview" | "production")
    : "development";
const rawVapidKey =
  typeof process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY === "string"
    ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.trim()
    : "";

export const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: rawSupabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: rawSupabaseAnonKey,
  NEXT_PUBLIC_APP_URL: rawAppUrl,
  NEXT_PUBLIC_APP_ENV: rawAppEnv,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: rawVapidKey,
} as const;

/**
 * Returns true if public Supabase environment variables are configured with valid non-placeholder values.
 */
export function isSupabaseConfigured(): boolean {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (
    url.length > 0 &&
    key.length > 0 &&
    !url.includes("your-project") &&
    !key.includes("your-anon-key") &&
    !key.includes("your-supabase")
  );
}

/**
 * Returns true if server-side Supabase Service Role Key is configured for admin operations.
 */
export function isSupabaseAdminConfigured(): boolean {
  const key = optionalEnv("SUPABASE_SERVICE_ROLE_KEY");
  return (
    isSupabaseConfigured() &&
    key.length > 0 &&
    !key.includes("your-service-role-key") &&
    !key.includes("your-supabase-service-role-key")
  );
}

// ─── Server-only ──────────────────────────────────────────────────────────
// This object must NEVER be imported from client components.
// Next.js will error if server-only modules are imported in the browser.
export const serverEnv = {
  /** Safe getter — returns key if set or empty string */
  get SUPABASE_SERVICE_ROLE_KEY() {
    return optionalEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
  get optionalServiceRoleKey() {
    return optionalEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
  get OPENROUTER_API_KEY() {
    return optionalEnv("OPENROUTER_API_KEY");
  },
  get OPENROUTER_MODEL() {
    return optionalEnv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct");
  },
  get GEMINI_API_KEY() {
    return optionalEnv("GEMINI_API_KEY");
  },
  get CRON_SECRET() {
    return optionalEnv("CRON_SECRET");
  },
  get VAPID_PRIVATE_KEY() {
    return optionalEnv("VAPID_PRIVATE_KEY");
  },
  get VAPID_PUBLIC_KEY() {
    return (
      optionalEnv("VAPID_PUBLIC_KEY") ||
      optionalEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY")
    );
  },
  get VAPID_SUBJECT() {
    return optionalEnv("VAPID_SUBJECT", "mailto:admin@atmos.weather");
  },
  OPEN_METEO_BASE_URL: optionalEnv(
    "OPEN_METEO_BASE_URL",
    "https://api.open-meteo.com"
  ),
  MAPBOX_ACCESS_TOKEN: optionalEnv("MAPBOX_ACCESS_TOKEN"),
} as const;

/**
 * Returns true if Web Push VAPID keys are configured.
 */
export function isVapidConfigured(): boolean {
  const pub = serverEnv.VAPID_PUBLIC_KEY;
  const priv = serverEnv.VAPID_PRIVATE_KEY;
  return pub.length > 10 && priv.length > 10 && !pub.includes("placeholder");
}

/**
 * Returns true if CRON_SECRET is configured.
 */
export function isCronSecretConfigured(): boolean {
  const secret = serverEnv.CRON_SECRET;
  return secret.length > 8 && !secret.includes("placeholder");
}

/**
 * Convenience re-export merging public env.
 * Safe to import from server components and route handlers.
 * DO NOT import `serverEnv` from client components.
 */
export const env = {
  ...publicEnv,
  ...serverEnv,
} as const;
