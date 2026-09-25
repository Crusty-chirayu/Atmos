# ATMOS Authentication and User Data Architecture

**Milestone**: M4 — Authentication and User Data  
**Status**: Implemented & Verified  
**Date**: 2026-09-26  
**Primary Stack**: Next.js 16 App Router (Turbopack), React 19, `@supabase/supabase-js` (v2.117.2), `@supabase/ssr` (v0.12.7), PostgreSQL RLS  

---

## 1. Executive Summary & Design Principles

ATMOS M4 establishes a secure, robust user account and persistence foundation for the platform while strictly preserving anonymous weather exploration.

### Core Principles
1. **Anonymous-First Weather Observation**: Unauthenticated visitors retain 100% access to global weather search, live forecasts, 24-hour progressions, 7-day outlooks, telemetry grids, and the interactive 3D WebGL globe. No weather functionality is gated behind authentication.
2. **Graceful Degradation When Unconfigured**: If Supabase environment variables are missing or unconfigured in local development, the application does not crash. Anonymous browsing proceeds smoothly, and account pages display informative status notifications.
3. **Database-Enforced Security Boundaries**: Row Level Security (RLS) is enabled on all user-owned tables (`profiles`, `saved_locations`, `user_preferences`). Anonymous (`anon`) role privileges are revoked. Security does not rely solely on application middleware.
4. **Zero Client-Supplied Identity**: All mutating API routes and services derive user identity strictly from verified server-side session cookies via `@supabase/ssr`. Client payloads specifying arbitrary `user_id` or `id` fields are rejected.
5. **Modern Next.js 16 Integration**: Uses the first-class `src/proxy.ts` convention for cookie-based session refresh and protected route interception, eliminating deprecated middleware warnings.

---

## 2. Client Architecture

The platform cleanly separates Supabase clients across three operational tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Client                           │
│  src/lib/auth/supabase-client.ts (getBrowserSupabase)       │
│  - Client-side auth state subscriptions (onAuthStateChange) │
│  - Client credentials: NEXT_PUBLIC_SUPABASE_ANON_KEY        │
│  - Gracefully returns null when Supabase unconfigured       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Server Client                            │
│  src/lib/auth/supabase-server.ts (createServerSupabase)     │
│  - Next.js App Router route handlers & server components    │
│  - Cookie management via next/headers cookies()             │
│  - Session verification via getAuthenticatedUser()          │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Admin Client (Server-Only)               │
│  src/lib/auth/supabase-admin.ts (createAdminSupabase)       │
│  - Restricted administrative functions                      │
│  - Server-only SUPABASE_SERVICE_ROLE_KEY                    │
│  - Scoped strictly to verified user account deletion        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema & Migration History

Migration file: `supabase/migrations/20260926000000_m4_auth_and_user_data.sql`

### 3.1 Tables & Schema Structure

#### `public.profiles`
- `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `display_name TEXT` (max 100 chars)
- `avatar_url TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

#### `public.saved_locations`
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `name TEXT NOT NULL`
- `country TEXT`
- `country_code VARCHAR(2)`
- `admin_area TEXT`
- `latitude NUMERIC(8, 5) NOT NULL CHECK (latitude >= -90.00000 AND latitude <= 90.00000)`
- `longitude NUMERIC(8, 5) NOT NULL CHECK (longitude >= -180.00000 AND longitude <= 180.00000)`
- `timezone TEXT`
- `provider_location_id TEXT`
- `label TEXT` (max 60 chars)
- `display_order INTEGER NOT NULL DEFAULT 0`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- **Constraint**: `CONSTRAINT uq_saved_locations_user_coords UNIQUE (user_id, latitude, longitude)` (prevents duplicate coordinate entries per user)
- **Index**: `CREATE INDEX idx_saved_locations_user_order ON public.saved_locations(user_id, display_order, created_at DESC)`

#### `public.user_preferences`
- `user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `temperature_unit TEXT NOT NULL DEFAULT 'celsius' CHECK (temperature_unit IN ('celsius', 'fahrenheit'))`
- `wind_speed_unit TEXT NOT NULL DEFAULT 'kmh' CHECK (wind_speed_unit IN ('kmh', 'mph', 'ms', 'knots'))`
- `precipitation_unit TEXT NOT NULL DEFAULT 'mm' CHECK (precipitation_unit IN ('mm', 'inch'))`
- `theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('dark', 'light', 'system'))`
- `reduced_motion BOOLEAN NOT NULL DEFAULT false`
- `default_location_id UUID REFERENCES public.saved_locations(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### 3.2 Automated Triggers
- `set_updated_at()`: Automatically refreshes `updated_at` on table updates.
- `handle_new_user()`: `SECURITY DEFINER` function with `search_path = public` that triggers on `auth.users` insert to idempotently bootstrap `profiles` and default `user_preferences`. Direct execution privileges are revoked from `PUBLIC`, `anon`, and `authenticated`.

---

## 4. Row Level Security (RLS) Model

Row Level Security is enabled on every table. The `anon` role is explicitly stripped of all permissions:

| Table | Operation | Policy Name | Constraint |
|---|---|---|---|
| `profiles` | SELECT | `profiles_select_own` | `auth.uid() = id` |
| `profiles` | INSERT | `profiles_insert_own` | `auth.uid() = id` (WITH CHECK) |
| `profiles` | UPDATE | `profiles_update_own` | `auth.uid() = id` |
| `profiles` | DELETE | `profiles_delete_own` | `auth.uid() = id` |
| `saved_locations` | SELECT | `saved_locations_select_own` | `auth.uid() = user_id` |
| `saved_locations` | INSERT | `saved_locations_insert_own` | `auth.uid() = user_id` (WITH CHECK) |
| `saved_locations` | UPDATE | `saved_locations_update_own` | `auth.uid() = user_id` |
| `saved_locations` | DELETE | `saved_locations_delete_own` | `auth.uid() = user_id` |
| `user_preferences` | SELECT | `user_preferences_select_own` | `auth.uid() = user_id` |
| `user_preferences` | INSERT | `user_preferences_insert_own` | `auth.uid() = user_id` (WITH CHECK) |
| `user_preferences` | UPDATE | `user_preferences_update_own` | `auth.uid() = user_id` |
| `user_preferences` | DELETE | `user_preferences_delete_own` | `auth.uid() = user_id` |

---

## 5. User-Facing Authentication & Account Flows

### 5.1 Registration (`/signup`)
- Email & password registration with Zod schema validation (min 8 chars, 1 uppercase, 1 number).
- Optional display name.
- Detects whether Supabase project requires email confirmation; renders a dedicated confirmation screen when email verification is pending.
- Redirects to post-signup target (default `/account`).

### 5.2 Login (`/login`)
- Email/password authentication.
- Show/hide password visibility toggle.
- Preserves `next` URL query parameter, passing it through strict `validateRedirectTarget()` to block open-redirect vulnerabilities.
- User-friendly error messaging (`INVALID_CREDENTIALS`, `EMAIL_NOT_CONFIRMED`, `RATE_LIMITED`).

### 5.3 Password Recovery (`/forgot-password` & `/reset-password`)
- Dedicated password reset request page triggering Supabase `resetPasswordForEmail`.
- Reset callback route (`/reset-password`) allows setting a new secure password via `supabase.auth.updateUser`.
- Confirmation screens protect against user-enumeration timing attacks.

### 5.4 Account & Saved Locations Hub (`/account`)
- Profile display with user avatar initials and email.
- Saved locations manager: displays coordinates, country code, administrative region, and custom labels. One-click &ldquo;View&rdquo; links jump directly to live weather for that coordinate.
- Display preferences editor: instant synchronized updates for temperature units, wind speed units, precipitation depth, and visual themes.
- Danger zone: account and data deletion with explicit &ldquo;DELETE&rdquo; confirmation modal.

### 5.5 Save Location Button (`SaveLocationButton`)
- Mounted in live weather header (`CurrentConditions`).
- For anonymous visitors: displays a non-intrusive modal prompting sign-in or sign-up.
- For authenticated users: 1-click toggling of saved location status with optimistic state updates and error rollbacks.

### 5.6 HomeNav User Menu (`UserMenu`)
- If anonymous: displays &ldquo;Sign In&rdquo; action.
- If authenticated: renders user avatar badge with dropdown containing display name, email, quick link to saved locations (with counter badge), preferences, and sign out.

---

## 6. Security & Threat Mitigation

1. **Open Redirect Prevention**: `validateRedirectTarget` rejects absolute URLs, protocol-relative URLs (`//attacker.com`), and backslash bypasses (`/\evil.com`), falling back to safe root `/`.
2. **Client-Side Isolation**: All API mutations (`POST /api/user/locations`, `PUT /api/user/preferences`, `DELETE /api/user/account`) ignore client-supplied owner IDs, determining the user identity strictly from the verified session JWT on the server.
3. **No Credential Logging**: Passwords, authorization tokens, and service role keys are excluded from all logging and error reporting.
4. **Data Cascades on Account Deletion**: The account deletion route (`DELETE /api/user/account`) explicitly deletes user-scoped records from `user_preferences`, `saved_locations`, and `profiles`, invokes `auth.admin.deleteUser` if the service role key is configured, and terminates the active session.

---

## 7. Quality Gates & Verification

- **TypeScript Strict Mode**: 0 errors (`npm run typecheck`).
- **ESLint**: 0 errors, 0 warnings (`npm run lint`).
- **Prettier**: 100% formatted (`npm run format:check`).
- **Automated Tests**: 226 tests passing across 74 test suites (`npm test`).
- **Production Build**: Next.js 16 Turbopack production build succeeded in 6.8s (`npm run build`).
