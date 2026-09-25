# ATMOS Technical Specification

## 1. Core stack
- Next.js App Router with TypeScript, React, and server components by default.
- Vercel for application hosting and supported scheduled workloads.
- Supabase PostgreSQL, Auth, and Row Level Security.
- Open-Meteo as initial primary weather API behind a provider-neutral interface.
- Google Gemini API called only from trusted server-side code.
- Motion for React transitions and interactions.
- Three.js with React Three Fiber for 3D scenes and globe layers.
- GSAP for coordinated timelines and scroll-driven sequences where appropriate.
- Mapbox and MapLibre behind a map abstraction; do not couple domain logic to either SDK.
- PWA capabilities using a maintained, compatible implementation selected after framework/version audit.
- Schema validation at external boundaries (e.g., Zod or equivalent, subject to repository audit).
- Automated tests: unit/component, integration, end-to-end, accessibility, and security-focused checks.

## 2. Architectural rules
- Use server components for static and data-oriented UI where practical; isolate interactive map, audio, and WebGL code into client components.
- Keep secrets and provider calls on the server. Browser code may receive only public, explicitly safe configuration.
- Define typed interfaces for weather, geocoding, AI, mapping, speech, and notification providers.
- Normalize provider responses into internal domain models; do not leak provider-specific JSON throughout the UI.
- Use server-side caching with explicit TTLs, stale-while-revalidate behavior where appropriate, and provider-specific cache rules.
- Make expensive visual modules dynamically loaded. Show a useful lightweight fallback while they load.
- Avoid global state unless cross-route shared state requires it. Keep server state and UI state distinct.
- Use database migrations as the source of truth for schema changes; never rely on manual dashboard-only changes.
- All server endpoints must validate inputs, authorize requests, apply quotas/rate limits, and return structured errors.

## 3. Suggested module boundaries
`src/`
- `app/` — routes, layouts, route handlers, loading/error boundaries.
- `components/ui/` — accessible primitives.
- `components/atmosphere/` — hero scenes, weather effects, visual environment.
- `components/maps/` — map abstraction, 2D map, globe, layers.
- `components/weather/` — current conditions, forecast, history, charts.
- `components/ai/` — floating assistant, chat workspace, voice controls.
- `components/alerts/` — preferences, inbox, subscription UI.
- `lib/config/` — validated environment configuration.
- `lib/domain/` — normalized domain types and business rules.
- `lib/providers/weather/` — provider interfaces and adapters.
- `lib/providers/ai/` — Gemini and future model adapters.
- `lib/providers/maps/` — Mapbox/MapLibre adapters.
- `lib/providers/speech/` — STT/TTS interfaces and implementations.
- `lib/services/` — application use cases.
- `lib/security/` — auth, authorization, rate limiting, validation.
- `lib/cache/` — cache policy and helpers.
- `lib/observability/` — structured logging and error reporting.
- `supabase/migrations/` — versioned SQL migrations.
- `tests/` — unit, integration, E2E, fixtures, and test helpers.

Adapt this structure to the existing repository rather than blindly recreating it.

## 4. Environment configuration
Maintain `.env.example` with descriptions for variable names such as:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key as appropriate to current Supabase conventions)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose)
- `GEMINI_API_KEY` (server-only)
- `OPEN_METEO_BASE_URL` (only if configurable)
- `MAPBOX_ACCESS_TOKEN` (use appropriately restricted public token only if needed client-side)
- Map tile/style configuration for MapLibre provider
- Push/VAPID configuration if web push is implemented
- Optional observability configuration

Validate required variables at startup or at the route boundary with actionable errors. Never provide real values in docs or source control.

## 5. Performance budgets
Establish measured budgets during M1 and record baseline on representative desktop and mid-range mobile hardware. Initial targets:
- Core content and current weather should render before 3D scene completion.
- No blocking full-screen WebGL initialization for core navigation or weather data.
- Avoid unnecessary layout shifts; reserve dimensions for scenes and charts.
- Keep main-thread work and animation frame time within a documented budget on target devices.
- Lazy-load heavy map, globe, and AI/voice modules.
- Respect device pixel ratio caps for WebGL; provide quality tiers.
- Use route-level and component-level code splitting, image optimization, and caching.
- Track Core Web Vitals in production; do not claim a score without measurement.

## 6. Dependency policy
- Inspect current package manager and lockfile before adding dependencies.
- Prefer maintained packages compatible with the selected Next.js/React versions.
- Pin via lockfile; avoid unnecessary duplicate animation, map, or UI libraries.
- Check licensing, usage limits, data attribution, and commercial terms for map tiles and weather providers.
- Document major dependency choices and upgrade risks.
