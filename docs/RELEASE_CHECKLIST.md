# ATMOS Production Release Candidate Checklist & Signoff Guide

## 1. Release Candidate Metadata
- **Product**: ATMOS Weather Intelligence Platform
- **Release Version**: `0.1.0-rc.1`
- **Target Environment**: Production
- **Platform Architecture**: Vercel (Edge/Serverless) + Supabase (PostgreSQL 16) + Open-Meteo + Google Gemini

---

## 2. Pre-Release Verification Gates

| Check # | Verification Gate | Command / Reference | Required Status | Verified? |
|---|---|---|---|---|
| **G-1** | Git Working Tree | `git status` | Clean, synchronized with `origin/main` | [x] |
| **G-2** | Code Formatting | `npm run format:check` | 100% Prettier compliant (0 issues) | [x] |
| **G-3** | Static Code Analysis | `npm run lint` | ESLint 0 errors, 0 warnings | [x] |
| **G-4** | TypeScript Strictness | `npm run typecheck` | `tsc --noEmit` 0 errors | [x] |
| **G-5** | Automated Tests | `npm test` | All 301 tests passing across 89 suites | [x] |
| **G-6** | Release Smoke Suite | `npx tsx --test tests/integration/release-smoke.test.ts` | 9/9 critical workflows passing | [x] |
| **G-7** | Production Build | `npm run build` | Next.js 16 Turbopack compiles 21 routes | [x] |
| **G-8** | PWA Integrity | `tests/unit/pwa-offline.test.ts` | Manifest valid, 5 icons present, SW active | [x] |

---

## 3. Infrastructure & Environment Readiness

- [x] **Database Migrations Prepared**:
  - `20260926000000_m4_auth_and_user_data.sql` (profiles, locations, preferences)
  - `20260926010000_m6_ai_conversations.sql` (ai_conversations, ai_messages)
  - `20260926020000_m7_notifications.sql` (alert_rules, notifications, push_subscriptions)
- [x] **Row Level Security (RLS)**: Enabled across 100% of user-owned tables; anonymous access strictly blocked.
- [x] **VAPID Keypair Generated**: RFC 8292 keys ready for `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.
- [x] **Cron Secret Generated**: 32-character bearer token configured for `CRON_SECRET`.
- [x] **Gemini API Key**: Validated for meteorological intelligence grounding.
- [x] **Service Worker Security**: Privacy boundary enforced; `/api/user/*`, `/api/ai/*`, `/api/auth/*` bypassed.

---

## 4. Post-Deployment Verification (Smoke Testing)

Perform the following smoke tests against the live deployment URL:

1. **Homepage & 3D Globe**:
   - Navigate to `https://<deployed-domain>/`.
   - Verify Three.js interactive globe initializes and default city (London) telemetry loads.
2. **Geocoding & Search**:
   - Search for "Tokyo" in search bar.
   - Verify auto-complete popover displays ranked matches.
3. **Weather Dashboard**:
   - Navigate to `/dashboard`.
   - Verify 24-hour temperature trend, precipitation probability, and wind vector charts render.
4. **Offline Resilience**:
   - In Chrome DevTools: Network tab -> toggle "Offline".
   - Reload page -> verify `/offline` fallback page appears with "Radar Signal Disconnected" notice.
   - Toggle back to "Online" -> click "Retry Connection".
5. **Weather Alert & Notifications**:
   - Sign in as a test user.
   - Navigate to `/account` -> click "New Weather Alert Rule".
   - Create a test threshold alert (`Temperature Above 25°C`).
   - Trigger `/api/cron/evaluate-alerts` with bearer token.
   - Verify unread notification badge increments in header bell icon.
6. **Web Push Subscription**:
   - In `/account`, toggle "Enable Push Notifications".
   - Verify browser prompts for permission and subscription record is stored.

---

## 5. Rollback Procedures

### Instant Frontend Rollback
1. Open Vercel Dashboard -> **Deployments**.
2. Identify the last validated deployment.
3. Click `...` -> **Promote to Production**. Rollback completes in `< 5s`.

### Database Schema Recovery
- Migrations are strictly forward-only and additive (`IF NOT EXISTS`).
- Do not execute destructive `DROP TABLE` or `DROP COLUMN` commands.
- If a table schema defect occurs, apply a forward-fix patch migration (`supabase/migrations/*_fix.sql`).
