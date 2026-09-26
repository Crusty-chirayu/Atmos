# ATMOS Environment Configuration & Variable Audit

## 1. Overview
ATMOS follows strict environment variable isolation (SECURITY.md §2). Variables are partitioned into **Client-Public** (prefixed with `NEXT_PUBLIC_`) and **Server-Only** secrets. Server secrets are validated through `src/lib/config/env.ts` with graceful fallback handling when external cloud providers (Supabase, Gemini, VAPID) are not configured.

---

## 2. Environment Variable Inventory

| Variable Name | Type | Runtime | Required? | Default / Fallback | Purpose & Security Scope |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public | Client & Server | Recommended | `http://localhost:3000` | Canonical application base URL used for metadataBase, OpenGraph URLs, and absolute OAuth callbacks. |
| `NEXT_PUBLIC_APP_ENV` | Public | Client & Server | Optional | `development` | Environment tier: `development`, `preview`, or `production`. Governs debug logging and telemetry. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Client & Server | Conditional | `""` | Supabase API Gateway URL (`https://<project>.supabase.co`). When unconfigured, application operates in local memory mock mode. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Client & Server | Conditional | `""` | Browser-safe Supabase API key. Access is strictly constrained by PostgreSQL Row Level Security (RLS) policies. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | **Server-Only** | Conditional | `""` | Supabase administrative secret. Bypasses RLS for secure account deletion (`/api/user/account`) and cron dispatch. **NEVER expose to browser**. |
| `GEMINI_API_KEY` | **Secret** | **Server-Only** | Optional | `""` | Google Gemini API key for meteorological intelligence workspace. When unset, AI assistant operates in simulated meteorological response mode. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public | Client & Server | Optional | `""` | VAPID public key (RFC 8292) shared with browser `PushManager.subscribe()`. |
| `VAPID_PRIVATE_KEY` | **Secret** | **Server-Only** | Optional | `""` | VAPID private signing key used by server to sign Web Push payloads. **NEVER expose to browser**. |
| `VAPID_SUBJECT` | Secret | Server-Only | Optional | `mailto:security@atmos.app` | VAPID administrative contact address required by Web Push push services. |
| `CRON_SECRET` | **Secret** | **Server-Only** | Recommended | `""` | Secret bearer token required to authenticate requests to `/api/cron/evaluate-alerts`. |
| `OPEN_METEO_BASE_URL` | Public/Config | Server-Only | Optional | `https://api.open-meteo.com` | Upstream weather API base URL. Can be redirected to an edge cache or corporate proxy. |
| `MAPBOX_ACCESS_TOKEN` | Public | Client | Optional | `""` | Optional access token for alternate Mapbox tile layers. Defaults to open OpenStreetMap/RainViewer layers. |

---

## 3. Validation & Fail-Safe Architecture

1. **Client Isolation**:
   - `src/lib/config/env.ts` provides `publicEnv` and `serverEnv`.
   - `serverEnv` getters throw or return safe fallbacks; importing `serverEnv` inside client components triggers Next.js build-time bundling errors.
2. **Graceful Preview Mode**:
   - `isSupabaseConfigured()` checks that URL and Key are present and do not match placeholder patterns (`your-project`).
   - `isVapidConfigured()` verifies VAPID key lengths.
   - If keys are missing, the UI gracefully warns the user without crashing, and API routes provide preview responses.
3. **Production Guardrails**:
   - In production environments (`NEXT_PUBLIC_APP_ENV=production`), missing required secrets like `CRON_SECRET` reject cron requests with HTTP 401 Unauthorized to prevent open denial-of-service triggers.

---

## 4. Secret Management Best Practices

- **Local Development**: Copy `.env.example` to `.env.local`. `.env.local` is ignored in `.gitignore`.
- **CI / GitHub Actions**: Injected through GitHub Repository Secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`).
- **Production Hosting (Vercel)**: Configured in Vercel Project Settings → Environment Variables. Set sensitive variables (`*_KEY`, `*_SECRET`) to "Sensitive" / Production-only.
- **Auditing**: Run `npm run typecheck` and `npm run build` during CI to ensure no secret references are accidentally bundled into `_next/static`.
