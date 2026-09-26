# ATMOS — Engineering Blueprint

**Purpose:** This repository of specifications is the source of truth for planning, implementing, testing, and operating ATMOS.

ATMOS is a global, AI-powered weather platform with a cinematic, adaptive interface; live and historical weather; interactive 2D maps and a 3D globe; Gemini-powered weather intelligence; user accounts; personalized alerts; and an installable, mobile-first PWA.

## Read first

1. `AGENT_RULES.md` — mandatory operating rules for Antigravity and all coding agents.
2. `PLAN.md` — product scope, milestones, and acceptance gates.
3. `TECH.md` — technology decisions and implementation constraints.
4. `ARCHITECTURE.md` — system boundaries and data flow.
5. `UI_UX.md` — visual and interaction system.
6. `DATA.md`, `AI.md`, `SECURITY.md`, `TEST.md`, and `DEPLOYMENT.md` — domain requirements.

## Decision status

The selected direction is authoritative unless explicitly changed by the project owner:
- Product name: ATMOS.
- Theme: dark-first, with a complete light theme.
- Dashboard: cinematic immersive landing experience.
- Public homepage: cinematic homepage with interactive live weather preview.
- Global location coverage.
- Forecasts: up to 16 days where the selected provider supports them; historical weather where available.
- Units: regional defaults with complete manual overrides.
- Maps: hybrid Mapbox + MapLibre strategy; provider adapters keep the application replaceable.
- Animation: Motion + Three.js/React Three Fiber + GSAP.
- Weather scenes: adaptive hybrid of realistic 3D and stylized effects.
- AI: Google Gemini, server-side, weather-grounded, provider-swappable.
- AI UX: floating assistant plus dedicated AI workspace; voice and text.
- Notifications: configurable in-app and browser push alerts, subject to permission and platform support.
- Hosting: Vercel + Supabase.
- Mobile: mobile-first adaptive PWA.

## Non-negotiable product truth

Never display fabricated weather, pretend a failed API call succeeded, or represent a mock as live data. Clearly label demo fixtures, stale/cached results, forecast horizons, and provider limitations. Every visible control must work or be clearly disabled/labeled as coming later.

## Implementation Status

- **M0 (Repository & Specification Audit)**: ✅ Complete (`docs/BASELINE_AUDIT.md`)
- **M1-T1 (Framework Scaffold & Design System)**: ✅ Complete (Next.js 16 App Router, React 19, Tailwind CSS v4, dark-first tokens)
- **M2-T1 (Weather Provider Foundation)**: ✅ Complete (Open-Meteo adapter, unit normalization, in-memory TTL caching, deduplication, `docs/WEATHER_ENGINE.md`)
- **M2-T2 (Geocoding & Location Search)**: ✅ Complete (Search API `/api/weather/geocoding`, relevance ranking, coordinate deduplication, accessible combobox UI, `docs/GEOCODING.md`)
- **M2-T3 (Weather Query API & Interactive Dashboard Core)**: ✅ Complete (`GET /api/weather`, hero current conditions, 24-hr hourly timeline, 7-day outlook with range gradient bars, deep meteorological telemetry, timezone-aware formatting, dynamic °C/°F unit switching)
- **M3 (Public Cinematic Homepage & Interactive Globe)**: ✅ Complete (Three.js 3D Earth globe, procedural planetary texture, adaptive weather-driven atmospheric scenes, 2.5D CSS SVG fallback, public rate limiting on API endpoints, quick-explore metropolises, `docs/ATMOSPHERIC_EXPERIENCE.md`)
- **M4 (Authentication & User Data)**: ✅ Complete (Supabase Auth, PostgreSQL schema & migrations, RLS policies, Next.js 16 `src/proxy.ts` session refresh, login/signup/reset flows, saved locations manager, user preferences synchronization, account deletion danger zone, `docs/AUTH_AND_USER_DATA.md`)
- **M5 (Weather Dashboard & Visualization)**: ✅ Complete (Dedicated `/dashboard` page, bespoke zero-dependency SVG weather charts, 2D slippy map with CartoDB tiles & RainViewer Doppler radar overlay, ECMWF ERA5 historical reanalysis explorer, multi-city overview with concurrency-limited batch API `POST /api/weather/batch`, `docs/WEATHER_DASHBOARD.md`)
- **M6 (Gemini AI Platform & Meteorological Grounding)**: ✅ Complete (Server-side Gemini 2.0 REST adapter, meteorological grounding engine, sliding window rate limits, Supabase multi-turn conversation persistence with RLS, full-screen conversational workspace `/ai`, ambient floating assistant, native Web Speech API voice I/O, `docs/GEMINI_AI_PLATFORM.md`)
- **M7 (Weather Alerts and Notification System)**: ✅ Complete (Threshold-based meteorological alert rules, 6 event categories, geographic coordinate deduplication, in-app notification center drawer with unread count, RFC 8292 Web Push lifecycle, and protected cron evaluator `/api/cron/evaluate-alerts`, `docs/NOTIFICATIONS_AND_ALERTS.md`)
- **M8 (PWA, Performance, Accessibility & Reliability)**: ✅ Complete (Installable W3C PWA with standalone launcher, Service Worker with privacy-scoped cache boundaries and 30-min weather TTL, offline fallback `/offline`, React 19 `useSyncExternalStore` connectivity detection, a11y focus restoration and keyboard navigation, `docs/PWA_PERFORMANCE_ACCESSIBILITY.md`)
- **M9 (Release Candidate & Deployment Readiness)**: ✅ Complete (Environment audit and `.env.example`, deployment runbook, database migration audit, 9-journey automated release smoke test suite, GitHub Actions CI workflow, and rollback runbook, `docs/DEPLOYMENT_RUNBOOK.md`, `docs/RELEASE_CHECKLIST.md`)
- **M10 (Final Integration, Security Audit & Handover)**: ✅ Complete (Full end-to-end integration across Journeys A–G, SSRF/injection/auth boundaries, 307 passing tests across 90 suites, 0 npm audit vulnerabilities, and final release candidate handover report, `docs/ATMOS-M10-FINAL-HANDOVER.md`)

### Verification & Quality Gates

```bash
# Run complete test suite (307 passing unit and integration tests across 90 suites)
npm test

# Static type analysis (TypeScript strict mode)
npm run typecheck

# Code formatting and linting (zero warnings)
npm run lint
npm run format:check

# Release smoke test suite
npx tsx --test tests/integration/release-smoke.test.ts

# Production build (Next.js 16 Turbopack)
npm run build
```

### Local Database Migrations (Supabase)

To apply database migrations to a local or linked Supabase project:

```bash
# If using local Supabase CLI (requires Docker Desktop):
supabase start
supabase db reset

# Or link and push to a remote development project:
supabase link --project-ref <your-project-ref>
supabase db push
```


## How to use this blueprint

Antigravity should read the entire specification set before making architectural changes. Implement in milestone order. Keep `PLAN.md` and the decision log updated as work progresses. Do not mark a milestone complete until its acceptance criteria and tests pass.

