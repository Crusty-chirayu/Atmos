# ATMOS Product & Development Plan

## 1. Product vision
Build a global weather intelligence platform that makes complex weather understandable through cinematic visualization, trustworthy data, useful AI, and personalized alerts.

## 2. Product principles
1. Trust before spectacle: weather accuracy and provenance outrank visual effects.
2. Cinematic, not cluttered: the first screen is immersive; deeper data is progressively disclosed.
3. Fast by default: load useful weather before expensive 3D scenes.
4. Accessible by design: motion, contrast, keyboard, screen-reader, and reduced-motion support.
5. Global by architecture: provider, locale, unit, and time-zone assumptions must not be hardcoded to one country.
6. Honest AI: clearly distinguish provider facts, model-generated interpretation, and uncertainty.
7. Incremental delivery: vertical slices that can be demonstrated and tested.

## 3. Locked product scope

### Public experience
- Premium cinematic homepage with live global location search and a working weather preview.
- Users can explore a limited weather preview before authentication.
- Clear sign-up/sign-in path to save preferences and unlock personalized features.

### Authenticated platform
- Supabase Auth; email/password and optional Google sign-in.
- Profile, saved locations, preferred units, theme, notification preferences, and AI conversation history.
- Main dashboard with cinematic weather hero, key conditions, forecast detail, alerts, maps, and AI insights.
- Global location search and saved-location switching.
- Up to 16-day forecast where provider data supports it; hourly/daily detail with uncertainty and provider limits represented accurately.
- Historical weather and climate comparisons where a provider/data source supports the requested location and period.
- Interactive 2D map and 3D globe, with weather layers and location selection.
- Gemini-powered floating assistant and dedicated AI workspace.
- Text and voice input/output, with explicit controls for microphone and audio playback.
- Trip planning and location comparison using provider-backed data.
- User-configurable alerts and notification center.
- Installable PWA with responsive desktop/tablet/mobile experiences and carefully scoped offline behavior.

## 4. Explicit non-goals for initial release
- Native iOS/Android applications.
- Guaranteed 16-day forecast availability or accuracy at every coordinate.
- Emergency warning replacement or official life-safety alert service.
- Medical, aviation, maritime, or other regulated decision support.
- Unbounded free AI usage or unlimited push delivery.
- Full offline forecasting; cache only previously retrieved, clearly timestamped data.
- Unreviewed autonomous agent actions that send messages or change user settings.

## 5. Milestones and gates

### M0 — Repository and specification audit
Tasks: inspect repo, identify existing app state, package manager, framework versions, routes, database migrations, environment setup, and tests. Produce `docs/BASELINE_AUDIT.md`.
Gate: no implementation assumptions remain undocumented; existing work is preserved.

### M1 — Foundation and design system
Tasks: establish app shell, route groups, typography, color tokens, spacing, responsive primitives, theme switching, motion utilities, error boundaries, and quality tooling.
Gate: app builds; light/dark themes work; reduced motion works; keyboard navigation and mobile shell are verified.
- **M1-T1 (Framework Scaffold)**: ✅ Verified Complete (2026-09-25). Next.js 16.3.6 (App Router), React 19.2.8, TypeScript 5, Tailwind CSS v4 (@tailwindcss/postcss), ESLint 9, Prettier. Dark-first design system tokens, atmospheric layout, loading state, error boundary, 404 handler, and fail-closed env validation configured. All quality gates passed (tsc --noEmit: 0 errors; eslint: 0 errors; next build: exit 0).
- **Blockers / Next**: None for M1 foundation. Supabase URL/keys and Gemini API key required for later milestones (M4/M6).

### M2 — Weather provider and location core
Tasks: typed provider interfaces, Open-Meteo primary adapter, caching, normalized units, geocoding/search, freshness metadata, error and fallback handling.
Gate: tests cover parsing, units, missing fields, time zones, stale data, provider errors, and location edge cases.
- **M2-T1 (Weather Provider Foundation)**: ✅ Verified Complete (2026-09-25). Strongly typed weather domain models, Open-Meteo primary adapter (/v1/forecast, /v1/archive), provider registry and abstraction, canonical unit normalization (Celsius, km/h, mm, hPa) with presentation conversions (Fahrenheit, mph, etc.), in-memory TTL cache with stale-while-revalidate, singleflight request deduplication, structured WeatherError hierarchy with sanitization and bounded retries, and comprehensive automated test suite (67 tests passing across 6 suites). Verified live API smoke test against Open-Meteo. Developer documentation in docs/WEATHER_ENGINE.md.
- **M2-T2 (Geocoding & Location Search)**: ✅ Verified Complete (2026-09-25). Normalized geocoding domain model (`GeocodingLocation` extending `Location`), Zod runtime validation (`GeocodingQuerySchema`, `GeocodingLocationSchema`), Open-Meteo Geocoding API adapter (`/v1/search`, `/v1/get`) with SSRF host validation, 6s bounded timeout, and exponential backoff retry. Deterministic relevance ranking (`calculateLocationScore`, `rankGeocodingResults`) with diacritic normalization and population weighting, geographic coordinate deduplication (`deduplicateGeocodingResults`), 24-hour TTL caching with singleflight deduplication, Next.js Route Handler (`GET /api/weather/geocoding`), accessible combobox UI (`LocationSearch`, `useLocationSearch`) with ARIA live announcements, keyboard navigation, and reduced-motion support. 130 automated tests passing (63 new deterministic tests added). Full documentation in `docs/GEOCODING.md`.
- **M2-T3 (Weather Query API & Interactive Dashboard Core)**: ✅ Verified Complete (2026-09-25). Validation schema (`WeatherApiQuerySchema`), structured `WeatherService.getWeatherBundle` with location input preservation, Next.js Route Handler (`GET /api/weather`) with CDN caching (`s-maxage=600, stale-while-revalidate=1800`), timezone-aware formatting utilities (`formatLocalTime`, `formatLocalDate`, `formatHourlyTime`, `formatWeekday`), SVG condition iconography (`WeatherIcon`), zero-CLS skeleton loader (`WeatherSkeleton`), hero card (`CurrentConditions`), 24-hour horizontal scroll timeline (`HourlyForecast`), 7-day outlook with range gradient bars (`DailyForecast`), deep meteorological telemetry cards (`WeatherMetrics`), and master coordinator (`WeatherDashboard`) with client-side °C/°F unit switching and abort-controller race prevention. 155 automated tests passing (25 new unit & integration tests added). Complete documentation updated in `docs/WEATHER_ENGINE.md`.
- **M2 Gate Status**: ✅ PASSED. All provider adapters, unit normalization, geocoding, search UI, route handlers, error handling, timezone localization, and interactive dashboard components verified with 155 passing automated tests and successful production build.


### M3 — Public cinematic homepage
Tasks: hero scene, search, live preview, globe entry point, loading skeletons, mobile composition, and public rate limiting.
Gate: real provider data only; core content usable before WebGL finishes; keyboard and reduced-motion paths pass.
- **M3-T1 (Cinematic Homepage & Interactive 3D Globe)**: ✅ Verified Complete (2026-09-26). Implemented Three.js client-only 3D Earth globe (`GlobeCanvas`, `InteractiveGlobe`) with procedural 2048x1024 equirectangular planetary texture (continents, coastlines, graticules, urban luminescence), atmospheric glow shell, spherical coordinate converter (`latLonToCartesian`), selection beacon with smooth rotation interpolation, pointer drag/inertia, accessible toolbar (rotate/tilt/zoom/recenter), and 2.5D CSS SVG planetary fallback (`GlobeFallback`). Built adaptive atmospheric scene (`AtmosphericScene`) responding to real weather codes with canvas particles (solar dust, stars, clouds, rain streaks, snow crystals, lightning flashes). Integrated sliding window in-memory rate limiter (`SlidingWindowRateLimiter`) on `GET /api/weather` (60 req/min) and `GET /api/weather/geocoding` (100 req/min). Delivered unified `CinematicHomepage` coordinator with view switcher ("Overview", "3D Globe", "Telemetry"), curated quick-explore metropolises (`FEATURED_CITIES`), live preview badges, theme switcher, and zero layout shift. 181 automated tests passing (26 new tests added). Architecture and asset documentation in `docs/ATMOSPHERIC_EXPERIENCE.md`.
- **M3 Gate Status**: ✅ PASSED. Real Open-Meteo data preserved; core content usable before WebGL finishes; keyboard navigation and prefers-reduced-motion paths verified; production build and quality gates green.


### M4 — Authentication and user data
Tasks: Supabase Auth, profile bootstrap, RLS, saved locations, preferences, account deletion path.
Gate: cross-user access tests prove isolation; auth flows and session expiry work.
- **M4-T1 (Authentication & User Data Foundation)**: ✅ Verified Complete (2026-09-26). Delivered Supabase Auth integration (`@supabase/supabase-js`, `@supabase/ssr`), three-tier client architecture (`getBrowserSupabase`, `createServerSupabase`, `createAdminSupabase`), and Next.js 16 `src/proxy.ts` cookie session refresh and route protection. Created PostgreSQL migration (`supabase/migrations/20260926000000_m4_auth_and_user_data.sql`) with `profiles`, `saved_locations`, and `user_preferences` tables, check constraints, coordinate deduplication (`uq_saved_locations_user_coords`), automatic bootstrap triggers (`handle_new_user`), and strict Row Level Security policies with `anon` access revoked. Built complete authentication UX: `/login` (with open-redirect sanitization), `/signup` (with verification detection), `/forgot-password`, `/reset-password`, and `/account` (profile info, saved locations manager with 1-click weather jump, live preference synchronization, and verified account deletion modal). Integrated `UserMenu` in `HomeNav` and `SaveLocationButton` in live weather telemetry header. Added 45 new deterministic automated tests (226 total tests passing across 74 suites). Full architecture documentation in `docs/AUTH_AND_USER_DATA.md`.
- **M4 Gate Status**: ✅ PASSED. Verified user isolation, server-derived identity enforcement, open-redirect protection, anonymous browsing preservation, unconfigured environment fallback, zero-warning ESLint, clean typecheck, and successful Turbopack production build.

### M5 — Weather dashboard and visualization
Tasks: current conditions, hourly/daily forecast, historical data, charts, 2D map, 3D globe, weather overlays, adaptive scene renderer.
Gate: provider provenance, units, timezone, loading/error/stale states, WebGL fallback, and performance budgets verified.

### M6 — Gemini AI platform
Tasks: server-side Gemini adapter, weather-grounded chat, floating assistant, dedicated workspace, conversation persistence, quotas, voice integration, trip planning.
Gate: grounding, prompt injection, rate limits, provider failures, and fabricated-data tests pass.

### M7 — Notification system
Tasks: preference UI, alert rules, scheduled processing, in-app inbox, browser push subscription lifecycle, deduplication, quiet hours, unsubscribe.
Gate: no duplicate alert storms; user authorization and push permission handled; scheduler idempotency tested.

### M8 — PWA, performance, accessibility, and hardening
Tasks: installability, service worker, safe offline cache, responsive QA, bundle optimization, accessibility audit, security review.
Gate: performance and accessibility budgets met or exceptions documented and approved.

### M9 — Release candidate and deployment
Tasks: production environment configuration, migrations, Vercel deployment, Supabase configuration, smoke tests, monitoring, rollback plan.
Gate: clean production build, secrets verified, database backup/recovery approach documented, all release checks green.

## 6. Definition of done
A milestone is not complete because a page renders. It is complete only when the associated user journey works end-to-end, its failure states are designed, automated checks pass, and evidence is recorded in `TEST.md` or the release checklist.

## 7. Decision log
- Name: ATMOS.
- Stack: Next.js full-stack TypeScript.
- Hosting: Vercel + Supabase.
- Auth: Supabase Auth; email/password and optional Google.
- Weather: Open-Meteo primary with provider adapters and supplemental sources where needed.
- AI: Gemini API, server-side, provider-swappable.
- Maps: Mapbox + MapLibre strategy, selected per capability, license, and cost review.
- Motion: Motion + GSAP + Three.js/React Three Fiber.
- Visual style: dark-first with complete light mode; cinematic immersive homepage and dashboard; adaptive hybrid weather rendering.
- AI UX: floating assistant and dedicated workspace; text and voice.
- Notifications: full configurable system, subject to provider, browser, permission, and deployment constraints.
- Global coverage; regional defaults with manual unit overrides.
- Forecast target: up to 16 days when available; historical weather where supported.
- Mobile: adaptive installable PWA.

## 8. Open implementation decisions (resolve during M0/M1, document before use)
- Exact package versions and package manager based on repository audit.
- Map tile provider, attribution, quotas, and Mapbox/MapLibre split after licensing/cost review.
- Historical weather provider and coverage/retention policy.
- Speech-to-text and text-to-speech provider and browser fallback.
- Push delivery mechanism and scheduler limits under chosen deployment plans.
- Weather cache TTLs, AI quotas, and alert polling frequency based on provider terms and budget.
