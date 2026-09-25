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

## How to use this blueprint

Antigravity should read the entire specification set before making architectural changes. Implement in milestone order. Keep `PLAN.md` and the decision log updated as work progresses. Do not mark a milestone complete until its acceptance criteria and tests pass.
