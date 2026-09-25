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

### Verification & Quality Gates

```bash
# Run complete test suite (272 passing unit and integration tests across 85 suites)
npm test

# Static type analysis (TypeScript strict mode)
npm run typecheck

# Code formatting and linting (zero warnings)
npm run lint
npm run format:check

# Production build (Turbopack)
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

