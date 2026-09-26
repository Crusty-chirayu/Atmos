# ATMOS — Production Deployment Checklist & Operations Runbook

**Document Version:** 1.0.0  
**Repository:** `Crusty-chirayu/Atmos`  
**Target Release:** ATMOS v1.0 Production  
**Deployment Target:** Vercel (Recommended) / Node.js 20+ Container  

---

## 1. Pre-Deployment Quality Gates (Local Verification)

Before triggering any remote deployment, execute and verify all local quality gates:

```powershell
# 1. Type Check (Strict TypeScript validation)
npm run typecheck
# Required: Exit code 0 (0 errors)

# 2. ESLint Static Analysis
npm run lint
# Required: Exit code 0 (0 errors, 0 warnings)

# 3. Unit & Integration Test Suite
npm test
# Required: Exit code 0 (307/307 tests pass across 90 suites)

# 4. Dependency Vulnerability Audit
npm audit
# Required: Exit code 0 (0 vulnerabilities)

# 5. Production Next.js Turbopack Build
npm run build
# Required: Exit code 0 (All 28 routes and endpoints cleanly compiled)
```

---

## 2. External Provider Account Setup

### 2.1 Supabase Project Provisioning & Migration

1. **Create Supabase Project**:
   - Region: Select region closest to target users (e.g. `us-east-1` or `eu-west-1`).
   - Database Password: Generate strong high-entropy password (store in secure password manager).
2. **Execute Database Migrations** (in strict sequential order):
   Execute each migration in the Supabase SQL Editor (`supabase/migrations/`):
   - **Migration 1**: `supabase/migrations/20260926000000_m4_auth_and_user_data.sql`
     - Creates: `profiles`, `saved_locations`, `user_preferences`.
     - Creates: `handle_new_user()` trigger for automated profile creation on signup.
     - Enforces: RLS on all 3 tables with `auth.uid() = user_id` and revokes `anon` permissions.
   - **Migration 2**: `supabase/migrations/20260926010000_m6_ai_conversations.sql`
     - Creates: `ai_conversations`, `ai_messages`.
     - Enforces: RLS on both tables with cascading parent user ownership.
   - **Migration 3**: `supabase/migrations/20260926020000_m7_notifications.sql`
     - Creates: `alert_rules`, `notifications`, `push_subscriptions`.
     - Enforces: RLS on all 3 tables with user ownership.
3. **Verify RLS Enablement**:
   Run in SQL Editor:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```
   *Expected: All 8 application tables (`profiles`, `saved_locations`, `user_preferences`, `ai_conversations`, `ai_messages`, `alert_rules`, `notifications`, `push_subscriptions`) must return `rowsecurity = true`.*
4. **Configure Authentication Settings**:
   - Go to **Authentication** → **Providers** → **Email**.
   - Enable Email Signup: `ON`.
   - Confirm Email: `ON` (recommended for production) or `OFF` for instant demo access.
   - Configure Redirect URLs under **Authentication** → **URL Configuration**:
     - `https://your-domain.com/api/auth/callback`
     - `https://your-domain.com/reset-password`
     - `https://your-domain.com/account`
     - `https://your-domain.com/login`
     - `http://localhost:3000/api/auth/callback` (for local development)
     - `http://localhost:3000/reset-password` (for local development)

### 2.2 Google Gemini AI Studio Setup

1. **Obtain API Key**:
   - Navigate to [Google AI Studio](https://aistudio.google.com/).
   - Click **Get API key** → **Create API key**.
   - Restrict key by API (Gemini API) and configure billing alerts in Google Cloud Console.
2. **Confirm Target Model**:
   - ATMOS is pre-configured for `gemini-2.0-flash` (balanced latency, 1M context window, high efficiency).

### 2.3 Web Push (VAPID) Credentials

Generate production keypair:
```bash
npx web-push generate-vapid-keys
```
Save:
- Public Key $\to$ `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Private Key $\to$ `VAPID_PRIVATE_KEY`
- Subject $\to$ `VAPID_SUBJECT` (`mailto:security@your-domain.com`)

### 2.4 Cron Secret Generation

Generate a 32-character random string:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```
Save $\to$ `CRON_SECRET`.

---

## 3. Hosting Platform Setup (Vercel)

### 3.1 Initial Repository Import
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → **Add New Project**.
2. Select repository: `Crusty-chirayu/Atmos`.
3. Framework Preset: **Next.js**.
4. Root Directory: `./`.
5. Build Command: `next build` (or leave default).
6. Output Directory: `.next` (default).

### 3.2 Inject Environment Variables
Under **Environment Variables**, add:

| Key | Value Description | Scope |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://your-custom-domain.com` | Production, Preview |
| `NEXT_PUBLIC_APP_ENV` | `production` | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<id>.supabase.co` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret administrative key | Production |
| `GEMINI_API_KEY` | `AIzaSy...` | Production, Preview |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID Public Key | Production, Preview |
| `VAPID_PRIVATE_KEY` | VAPID Private Key | Production |
| `VAPID_SUBJECT` | `mailto:admin@your-domain.com` | Production |
| `CRON_SECRET` | 32-char cron secret | Production |

### 3.3 Configure Scheduled Alert Cron (Optional)

ATMOS includes `/api/cron/evaluate-alerts` (accepts GET/POST with `Authorization: Bearer <CRON_SECRET>`). If you wish to trigger automated evaluations via Vercel Cron, create `vercel.json` in the project root:
```json
{
  "crons": [
    {
      "path": "/api/cron/evaluate-alerts",
      "schedule": "*/15 * * * *"
    }
  ]
}
```
*Note: Vercel Cron automatically injects `Authorization: Bearer <CRON_SECRET>` into cron invocations when `CRON_SECRET` is set in Vercel Environment Variables.*

Alternatively, an external scheduler (e.g. GitHub Actions scheduled workflow, Upstash QStash, or cron-job.org) can invoke `https://your-domain.com/api/cron/evaluate-alerts` with header `Authorization: Bearer <CRON_SECRET>`.

---

## 4. Deployment Execution Steps

1. **Commit & Push to Main**:
   - Verify local branch is clean and all tests pass.
   - Push to `origin main` to trigger automated Vercel build.
2. **Monitor Build Logs**:
   - Verify TypeScript check passes in build.
   - Verify 28 routes and endpoints are generated.
   - Verify middleware proxy bundle completes.
3. **Assign Custom Domain**:
   - In Vercel Project Settings → **Domains**, add custom domain.
   - Configure DNS CNAME/A records with domain registrar.
   - Verify SSL certificate issuance (automatic via Let's Encrypt).

---

## 5. Post-Deployment Verification (Smoke Tests)

Immediately after deployment to production, perform the following live verification tests against the production URL:

### 5.1 Security Headers Verification
```bash
curl -I https://your-domain.com/
```
Verify presence of:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(self), geolocation=(self)`

### 5.2 Public Endpoint Verification
- **Weather Forecast**:
  `curl -s "https://your-domain.com/api/weather?lat=51.5074&lon=-0.1278" | jq .meta`
  *Expected: HTTP 200, valid units and coordinates.*
- **Geocoding Search**:
  `curl -s "https://your-domain.com/api/weather/geocoding?q=Tokyo" | jq .count`
  *Expected: HTTP 200, matching location objects.*
- **Historical Reanalysis**:
  `curl -s "https://your-domain.com/api/weather/historical?lat=51.5074&lon=-0.1278&startDate=2024-01-01&endDate=2024-01-07" | jq .daily`
  *Expected: HTTP 200, daily temperature arrays.*
- **Batch Weather**:
  `curl -s -X POST -H "Content-Type: application/json" -d '{"locations":[{"name":"Tokyo","latitude":35.6762,"longitude":139.6503}]}' https://your-domain.com/api/weather/batch | jq .results`
  *Expected: HTTP 200, batch results.*

### 5.3 Protected Authentication & Account Verification
- Visit `/signup`: Register a new test account.
- Confirm email verification receipt (if email confirmation is enabled).
- Visit `/login`: Sign in with created credentials.
- Verify redirect to `/account` with active profile.
- Save a custom location in `/dashboard`: verify location appears in saved list.
- Sign out: Verify immediate redirect and session termination.
- Visit `/account` while logged out: verify immediate redirect to `/login?next=/account`.

### 5.4 AI Intelligence Workspace Verification
- Visit `/ai`:
  - Submit query: *"What are the current flight hazards for London?"*
  - Verify streaming or complete response returns grounded in Open-Meteo telemetry.
  - Verify citation badge: `Grounded in Open-Meteo`.

### 5.5 PWA & Offline Verification
- Visit `/offline` directly: verify high-contrast diagnostic card renders.
- Open DevTools → Application → Service Workers:
  - Verify `/sw.js` is registered in production.
  - Verify Cache Storage does not cache `/account` or `/api/user/*`.

---

## 6. Rollback & Disaster Recovery Procedures

If critical defects or regressions are detected in production:

1. **Instant Rollback via Vercel**:
   - Go to Vercel Project Dashboard → **Deployments**.
   - Locate the previous successful deployment.
   - Click `...` menu → **Promote to Production**.
   - Traffic switches instantly with zero downtime.
2. **Database Rollback**:
   - If an applied migration caused issues, each table can be disabled or dropped individually:
     ```sql
     -- Emergency RLS disable (administrative only)
     ALTER TABLE public.<table_name> DISABLE ROW LEVEL SECURITY;
     ```
3. **Emergency Service Worker Cache Flush**:
   - In `public/sw.js`, bump `CACHE_VERSION` (e.g. from `v3` to `v4`).
   - On activate, the service worker purges all legacy caches matching `atmos-*`.
