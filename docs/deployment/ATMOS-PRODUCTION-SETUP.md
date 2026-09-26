# ATMOS — Production Environment Configuration & Variable Specification

**Document Version:** 1.0.0  
**Target Platform:** Next.js 16 (Turbopack) / Node.js 20+  
**Target Hosting:** Vercel / Cloud Container (Docker / Node.js standalone)  
**Database & Auth:** Supabase (PostgreSQL 15+ with pgvector & Row Level Security)  
**Meteorological Services:** Open-Meteo Synoptic Mesh, ECMWF ERA5 Reanalysis, RainViewer Doppler Radar, Esri World Dark Gray Canvas  
**AI Intelligence:** Google Gemini 2.0 Flash (`generativelanguage.googleapis.com`)  

---

## 1. Architectural Overview & Environment Partitioning

ATMOS strictly enforces environment variable isolation in compliance with modern application security standards:
- **Client-Public Variables (`NEXT_PUBLIC_*`)**: Bundled into client-side JavaScript payloads. These variables are visible to any browser visitor inspecting network traffic or compiled scripts. **No secrets, private keys, or bypass tokens may ever carry this prefix.**
- **Server-Only Secrets**: Stripped from client bundles at compile time. Accessed exclusively within Next.js Route Handlers (`src/app/api/*`), Server Components, and server utilities (`src/lib/*`). Any attempt to import server-only variables into client components triggers Next.js build-time bundling errors.
- **Fail-Safe Fallback Model**: The application is architected to boot and operate in **Safe Guest / Preview Mode** even when external cloud providers (Supabase, Gemini, VAPID) are not configured. Missing optional credentials trigger graceful degradation with verified offline telemetry rather than crashing or throwing unhandled 500 errors.

---

## 2. Environment Variable Specification Matrix

| Variable Name | Exposure Tier | Runtime Target | Provider / Source | Required? | Safe Default / Fallback | Purpose & Security Scope |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | **Public** | Client & Server | Host Domain | Recommended | `http://localhost:3000` | Canonical production URL (e.g. `https://atmos.weather.app`). Governs OpenGraph meta tags, sitemaps, and absolute OAuth redirect targets. |
| `NEXT_PUBLIC_APP_ENV` | **Public** | Client & Server | Deployment Platform | Optional | `development` | Environment tier: `development`, `preview`, or `production`. In `production`, triggers strict cron authorization and disables internal error disclosures. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Public** | Client & Server | Supabase Dashboard | **Conditional** | `""` | Supabase API Gateway URL (`https://<project-ref>.supabase.co`). Required for remote authentication and database synchronization. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Public** | Client & Server | Supabase Dashboard | **Conditional** | `""` | Browser-safe anon key. Governed strictly by PostgreSQL Row Level Security (RLS) policies. Safe in client bundles. |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET** | **Server-Only** | Supabase Dashboard | **Conditional** | `""` | Administrative secret key that **bypasses RLS**. Used exclusively for server-side user deletion (`/api/user/account`) and cron alert scanning. **NEVER expose to client**. |
| `GEMINI_API_KEY` | **SECRET** | **Server-Only** | Google AI Studio | Optional | `""` | API key for Gemini 2.0 Flash AI intelligence workspace. When missing, AI workspace operates in simulated meteorological response mode grounded in live Open-Meteo telemetry. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | **Public** | Client & Server | Generated Keypair | Optional | `""` | VAPID public key (RFC 8292) shared with browser `PushManager.subscribe()`. |
| `VAPID_PRIVATE_KEY` | **SECRET** | **Server-Only** | Generated Keypair | Optional | `""` | VAPID private signing key used by server to sign Web Push payloads. **NEVER expose to client**. |
| `VAPID_SUBJECT` | **Secret** | Server-Only | Application Admin | Optional | `mailto:security@atmos.app` | Administrative contact address required by Web Push push services (RFC 8292). |
| `CRON_SECRET` | **SECRET** | **Server-Only** | Generated Token | Recommended | `""` | High-entropy secret token (minimum 32 characters) required to authenticate scheduled requests to `/api/cron/evaluate-alerts`. |
| `OPEN_METEO_BASE_URL` | Config | Server-Only | Open-Meteo | Optional | `https://api.open-meteo.com` | Upstream weather API endpoint. Can be redirected to an edge caching proxy or enterprise tier endpoint if configured. |
| `MAPBOX_ACCESS_TOKEN` | **Public** | Client | Mapbox (Optional) | Optional | `""` | Optional access token for alternate Mapbox tile layers. Defaults to open Esri Dark Canvas and RainViewer radar layers. |

---

## 3. Detailed Provider Configuration Guides

### 3.1 Supabase Configuration (Authentication & User Data)

1. **Dashboard Acquisition**:
   - Sign in to [Supabase Console](https://app.supabase.com/).
   - Select your project → **Project Settings** → **API**.
   - Copy:
     - **Project URL** $\to$ `NEXT_PUBLIC_SUPABASE_URL`
     - **Project API Keys (`anon` / `public`)** $\to$ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **Project API Keys (`service_role` / `secret`)** $\to$ `SUPABASE_SERVICE_ROLE_KEY`
2. **Auth Redirect URLs**:
   - Navigate to **Authentication** → **URL Configuration**.
   - Set **Site URL**: `https://your-production-domain.com`
   - Add to **Redirect URLs**:
     - `https://your-production-domain.com/api/auth/callback`
     - `https://your-production-domain.com/reset-password`
     - `https://your-production-domain.com/account`
     - `https://your-production-domain.com/login`
     - `http://localhost:3000/api/auth/callback` (for local testing)
     - `http://localhost:3000/reset-password` (for local testing)
3. **Database Migrations**:
   - Apply the three SQL migration files in `supabase/migrations/` sequentially via the Supabase SQL Editor or Supabase CLI (see `docs/deployment/ATMOS-DEPLOYMENT-CHECKLIST.md`). All 8 application tables will have Row Level Security (RLS) enabled.

### 3.2 Google Gemini AI Configuration

1. **API Key Generation**:
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Create an API key in a Google Cloud project with billing alerts enabled.
   - Copy key $\to$ `GEMINI_API_KEY`.
2. **Quota & Security Controls**:
   - Rate limiting is enforced in ATMOS at **20 requests per minute per IP** via `SlidingWindowRateLimiter`.
   - Max prompt input length is constrained to **1,000 characters** in `AiChatRequestSchema`.
   - All completions are bounded with `maxOutputTokens: 1024` and `timeoutMs: 12000`.

### 3.3 Web Push (VAPID) Credentials (Optional)

ATMOS includes built-in architecture for Web Push subscriptions (in `push_subscriptions` table and `public/sw.js`). In-app notifications and rule evaluation are 100% active and database-backed out-of-the-box. Live remote browser push delivery to browser vendors (FCM, Apple, Mozilla) operates in preview/simulation mode and requires standard RFC 8292 encrypted payload assembly.

To configure VAPID keys:
```bash
# Generate high-entropy VAPID keypair
npx web-push generate-vapid-keys
```
Output:
```text
Public Key: <Copy into NEXT_PUBLIC_VAPID_PUBLIC_KEY>
Private Key: <Copy into VAPID_PRIVATE_KEY>
```
Configure contact email:
```env
VAPID_SUBJECT=mailto:admin@your-production-domain.com
```

### 3.4 Scheduled Tasks & Cron Security

Generate a high-entropy 32+ character secret for scheduled alert evaluation:
```powershell
# In PowerShell:
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```
Configure:
```env
CRON_SECRET=your-generated-32-char-random-secret
```
Configure your cron runner (e.g. Vercel Cron or GitHub Actions) to include:
```http
Authorization: Bearer your-generated-32-char-random-secret
```

---

## 4. Local Development vs. Production Configuration

### 4.1 Local Development (`.env.local`)
Create `.env.local` from `.env.example`:
```bash
cp .env.example .env.local
```
Minimum required for offline local evaluation:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development
```
*Note: `.env.local` is strictly ignored by Git and must never be committed.*

### 4.2 Production Environment (Vercel)
In Vercel Dashboard → **Project Settings** → **Environment Variables**:
- Add all keys specified in the inventory table.
- Set environment scope to **Production** (and optionally **Preview**).
- Mark `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `VAPID_PRIVATE_KEY`, and `CRON_SECRET` as **Sensitive**.

---

## 5. Security & Verification Checklist

- [x] All server secrets are stripped from client bundles (`tsc --noEmit` and `next build` verified).
- [x] Service worker excludes `/account`, `/api/user/*`, `/api/ai/*`, `/api/auth/*`, and `/api/cron/*` from caching.
- [x] Production security headers active: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`.
- [x] Upstream error responses sanitized to prevent credential or stack trace disclosures.
- [x] Row Level Security (RLS) enabled on all 8 application tables with `REVOKE ALL FROM anon`.
