# ATMOS System Architecture

## 1. High-level request flow

Browser / PWA
→ Next.js application shell (with AuthProvider state synchronization)
→ Next.js 16 proxy / session refresh (`src/proxy.ts`)
→ authenticated or public server route/action
→ domain service (locations-service, preferences-service, weather service)
→ provider adapter (Open-Meteo, geocoding, future Gemini/speech/push)
→ normalized response with source, freshness, and error metadata
→ UI rendering and accessible feedback.

Supabase PostgreSQL with Row Level Security stores user-owned records (profiles, saved locations, preferences). External provider secrets remain strictly server-side.

## 2. Domain boundaries
- Identity: Supabase Auth, session refresh via Next.js 16 `src/proxy.ts`, server session extraction via `getAuthenticatedUser()`, and client-side subscription via `onAuthStateChange`.
- Profile/preferences: `profiles`, `user_preferences` with optimistic UI updates, live server persistence, and fallback to local state for anonymous visitors.
- Location: geocoding, canonical coordinates, display name, timezone, and user-scoped `saved_locations` with coordinate deduplication.
- Weather: current, hourly, daily, historical reanalysis (ECMWF ERA5 via `/api/weather/historical`), and batch multi-location fetching via `/api/weather/batch` with worker pool concurrency limiting.
- Visualization: presentation-only rendering driven by normalized weather domain data: responsive vector SVG charts (temperature splines, dual-axis precipitation, wind velocity vectors, barometric pressure), 2D Web Mercator slippy tile maps (CartoDB tiles + live RainViewer radar overlay), and 3D Three.js planetary globe.
- AI: server-side Gemini 2.0 REST adapter (`gemini-2.0-flash`), meteorological grounding engine (`WeatherGroundingSnapshot` synthesizing real-time Open-Meteo telemetry), sliding window rate limiting (20 req/min), anti-hallucination system instructions, multi-turn thread persistence in Supabase (`ai_conversations`, `ai_messages`) with strict RLS (`auth.uid() = user_id`), Web Speech API voice synthesis and speech recognition, and unconfigured preview fallback.
- Notifications: alert evaluation, deduplication, delivery, subscription management, user preferences.
- Observability: sanitized logs, metrics, provider latency/errors, quota events.

## 3. Data flow constraints
- Geocode query is validated and rate-limited before provider call.
- Weather coordinates are validated and normalized. Cache key includes provider, coordinates/precision, requested fields, units where relevant, and time range.
- AI requests retrieve weather context server-side. The model receives timestamped structured data and explicit limits; it cannot independently assert live weather unless a tool/service provided it.
- Alert evaluation uses provider-backed values and rule definitions. Every event has a stable deduplication key and evaluation timestamp.
- Push delivery is best-effort. In-app notifications remain the durable source of notification history.
- Cached/offline data must display its observation/retrieval timestamp and stale status.

## 4. Reliability
- Timeouts and bounded retries for transient provider errors; no unbounded retry loops.
- Circuit-break or temporarily disable providers after repeated failures where justified.
- Fallback to another provider only when field semantics and licensing permit; indicate source changes.
- Graceful degradation: weather text and essential metrics remain usable if map/WebGL/audio is unavailable.
- Return structured error codes, not raw provider stack traces.
- Define provider health and operational alert thresholds before production release.

## 5. Deployment topology
- Vercel hosts Next.js pages, route handlers, and supported scheduled tasks.
- Supabase provides PostgreSQL, Auth, RLS, and suitable edge/background capabilities.
- Alert scheduling must account for Vercel plan limits, execution duration, and Supabase limits. Select the final scheduler after checking current plan constraints.
- Do not rely on an in-memory process or browser tab for durable scheduling.
