# ATMOS Production Deployment Runbook & Operational Guide

## 1. Architectural Overview
ATMOS is architected for zero-maintenance edge deployment on **Vercel** coupled with **Supabase (PostgreSQL 16)**, **Open-Meteo API** (meteorological provider), **Google Gemini** (AI intelligence), and **Web Push RFC 8292** (browser alert push).

```
                      ┌───────────────────────┐
                      │   End-User Browser    │
                      │  (PWA / Web Client)   │
                      └───────────┬───────────┘
                                  │ HTTPS / WSS
                                  ▼
                 ┌─────────────────────────────────┐
                 │       Vercel Edge & Node.js     │
                 │   Next.js 16 App Router Engine  │
                 └───────┬────────┬────────┬───────┘
                         │        │        │
           ┌─────────────┘        │        └─────────────┐
           ▼                      ▼                      ▼
┌──────────────────┐    ┌──────────────────┐   ┌───────────────────┐
│  Supabase Cloud  │    │  Open-Meteo API  │   │ Google Gemini AI  │
│  - PostgreSQL 16 │    │  - Forecasts     │   │ - Meteorological  │
│  - Row Level Sec │    │  - Geocoding     │   │   Grounding       │
│  - Auth Engine   │    │  - ERA5 Archive  │   │ - Natural Chat    │
└──────────────────┘    └──────────────────┘   └───────────────────┘
```

---

## 2. Prerequisites & Versions

| Component | Target Version | Verification Command |
|---|---|---|
| **Node.js** | `>= 20.12.0` (LTS) | `node -v` |
| **npm** | `>= 10.5.0` | `npm -v` |
| **Next.js** | `16.3.6` (Turbopack) | `npm run build` |
| **TypeScript** | `5.x` (strict) | `npm run typecheck` |
| **PostgreSQL** | `15.x / 16.x` | `SELECT version();` |

---

## 3. Step-by-Step Deployment Procedure

### Step 3.1: Supabase Infrastructure Provisioning
1. Log in to [Supabase Console](https://supabase.com).
2. Create a new organization project (e.g. `atmos-production`). Choose a region close to your primary audience (e.g. `us-east-1` or `eu-central-1`).
3. Under **Authentication → URL Configuration**:
   - Set **Site URL** to `https://atmos.app` (or your domain).
   - Under **Redirect URLs**, add:
     - `https://atmos.app/api/auth/callback`
     - `http://localhost:3000/api/auth/callback` (for local dev)
4. Apply Database Migrations in sequence using SQL Editor or CLI:
   - `supabase/migrations/20260926000000_m4_auth_and_user_data.sql`
   - `supabase/migrations/20260926010000_m6_ai_conversations.sql`
   - `supabase/migrations/20260926020000_m7_notifications.sql`
5. Collect API Keys from **Project Settings → API**:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret key` -> `SUPABASE_SERVICE_ROLE_KEY`

### Step 3.2: AI & Web Push Provisioning
1. **Google Gemini Key**:
   - Navigate to [Google AI Studio](https://aistudio.google.com/).
   - Create an API Key -> `GEMINI_API_KEY`.
2. **Web Push VAPID Keypair**:
   - Run `npx web-push generate-vapid-keys --json`
   - Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.
   - Set `VAPID_SUBJECT=mailto:security@yourdomain.com`.
3. **Cron Authentication Secret**:
   - Generate a 32-character random string: `openssl rand -hex 24`
   - Set `CRON_SECRET`.

### Step 3.3: Vercel Project Setup
1. Import GitHub repository `Crusty-chirayu/Atmos` into [Vercel](https://vercel.com).
2. Configure Build and Output Settings:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `next build`
   - Output Directory: `.next`
   - Install Command: `npm install`
3. Configure Environment Variables in Vercel:
   ```env
   NEXT_PUBLIC_APP_URL=https://atmos.app
   NEXT_PUBLIC_APP_ENV=production
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   GEMINI_API_KEY=<your-gemini-key>
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-vapid-public-key>
   VAPID_PRIVATE_KEY=<your-vapid-private-key>
   VAPID_SUBJECT=mailto:security@atmos.app
   CRON_SECRET=<your-cron-secret>
   ```
4. Deploy project.

### Step 3.4: Scheduled Job (Cron) Configuration
To trigger alert evaluations every 15 or 30 minutes, configure Vercel Cron or an external cron runner:

**Option A: Vercel Cron (`vercel.json`)**:
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
*Note: Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set in project environment variables.*

**Option B: External HTTPS Ping (e.g. GitHub Actions or Cron-Job.org)**:
```bash
curl -X POST https://atmos.app/api/cron/evaluate-alerts \
  -H "Authorization: Bearer <CRON_SECRET>"
```

---

## 4. Verification & Post-Deployment Smoke Tests

Execute post-deployment smoke tests against the live URL:
1. `GET /` — Returns 200 OK, renders 3D globe and default London weather bundle.
2. `GET /manifest.json` — Returns 200 OK with valid PWA manifest JSON.
3. `GET /sw.js` — Returns 200 OK with service worker script.
4. `GET /api/weather?latitude=40.7128&longitude=-74.006` — Returns 200 OK with normalized NYC weather.
5. `POST /api/cron/evaluate-alerts` (without header) — Returns 401 Unauthorized.
6. `POST /api/cron/evaluate-alerts` (with `Bearer <CRON_SECRET>`) — Returns 200 OK with execution summary.

---

## 5. Rollback & Forward-Fix Runbook

### Application Code Rollback
- In Vercel Dashboard: Navigate to **Deployments** -> select previous successful deployment -> click **Promote to Production**. Instant rollback takes under 5 seconds.
- In Git:
  ```bash
  git revert HEAD
  git push origin main
  ```

### Database Schema Forward-Fix Procedures
- Database migrations are additive (`IF NOT EXISTS`, forward-only).
- **NEVER** run destructive `DROP TABLE` or `DROP COLUMN` in production while active application traffic is running.
- If a schema defect is identified:
  1. Author a new additive forward-fix migration: `20260926030000_fix_<issue>.sql`.
  2. Apply migration using `npx supabase db push`.
  3. Deploy application code update.
