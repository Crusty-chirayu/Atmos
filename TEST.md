# ATMOS Testing Strategy and Acceptance Matrix

## 1. Testing policy
Testing is part of implementation, not a final cleanup step. Tests must be meaningful and must not be weakened to conceal defects. Record actual commands, outcomes, and known environment limitations.

## 2. Test layers
- Unit: domain rules, unit conversion, forecast normalization, cache keys, alert thresholds, timezone handling.
- Component: loading/error/empty/stale states, forms, accessible controls, theme and responsive behavior.
- Integration: provider adapters, Supabase queries/RLS, AI context construction, notification scheduling and deduplication.
- E2E: critical journeys using Playwright or the repository's established E2E framework.
- Accessibility: automated checks plus keyboard and screen-reader-oriented manual review.
- Visual: screenshot captures at representative breakpoints, theme modes, and reduced-motion mode.
- Security: RLS isolation, auth bypass, rate limits, prompt injection, secret leakage, input validation.
- Performance: bundle analysis, Core Web Vitals, map/3D load, frame-rate sampling on target devices.

## 3. Critical end-to-end journeys
1. Anonymous visitor searches a global location and sees a real, sourced preview.
2. User signs up, verifies/signs in as supported, and receives a profile.
3. User saves a location, changes units/theme, refreshes, and sees preferences persist.
4. User switches location and sees current/hourly/daily forecast with correct local time.
5. User opens 2D map, changes available layers, selects a location, and can use a non-map alternative.
6. User opens 3D globe; unsupported WebGL/reduced-motion path remains usable.
7. User asks Gemini a weather question; response is grounded in server-retrieved context and displays relevant freshness/source.
8. User asks about unavailable data; assistant acknowledges limitation rather than fabricating.
9. User uses voice after permission; denied/unsupported microphone path remains usable via text.
10. User configures an alert, receives at most one notification per dedupe window, and can dismiss/unsubscribe.
11. User A cannot read or mutate User B's records through UI, API, or direct Supabase access.
12. PWA can be installed where supported; offline view labels cached data and its timestamp.

## 4. Data correctness tests
- Celsius/Fahrenheit, wind, precipitation, pressure, and distance conversion.
- Missing/null fields remain missing, not zero.
- UTC/local timezone conversions and daylight-saving boundaries.
- Forecast dates and chart labels match selected location timezone.
- Provider failure, malformed response, rate limiting, and stale cache behavior.
- 16-day request is capped to actual provider availability and never padded with invented values.
- Historical data is labeled by source/type and available coverage.

## 5. UI and accessibility matrix
Run representative tests across:
- Mobile: narrow viewport and common smartphone dimensions.
- Tablet: portrait and landscape.
- Desktop: standard laptop and wide display.
- Dark and light themes.
- Reduced motion enabled.
- Keyboard-only navigation.
- WebGL unavailable or context lost.
- Slow network and offline.
- Notification and microphone permission denied.

## 6. Release gates
- Lint, typecheck, production build, unit tests, integration tests, and critical E2E tests pass.
- No known critical/high severity security defect.
- RLS isolation tests pass.
- No leaked secrets or fabricated production weather.
- Accessibility issues triaged; critical blockers fixed.
- Performance measurements recorded on defined hardware and network.
- Migrations and rollback/backup procedures reviewed.
- Production smoke test and rollback plan documented.

## 7. Evidence log template
For each run record:
- Date/time and commit.
- Environment and browser/device.
- Exact command.
- Passed/failed/skipped counts.
- Failure details and whether environment-related.
- Follow-up issue and owner.

## 8. M5 Verified Test Evidence Log (2026-09-26)
- **Commit**: `da607a3` (`feat(M5): weather dashboard and visualization`)
- **Node & Next.js**: Node 20+, Next.js 16.3.6 (Turbopack), React 19.2.8
- **Commands Executed**:
  1. `npm test` — **251 passed**, 0 failed, 80 suites (duration ~3.1s).
  2. `npm run typecheck` — **0 errors** (`tsc --noEmit`).
  3. `npm run lint` — **0 errors, 0 warnings** (`eslint src/`).
  4. `npm run format:check` — **All matched files use Prettier code style**.
  5. `npm run build` — **Production build exit 0** (Turbopack compiled routes `/`, `/dashboard`, `/account`, `/login`, `/signup`, `/api/weather/historical`, `/api/weather/batch`, etc.).

## 9. M6 Verified Test Evidence Log (2026-09-26)
- **Commit**: In progress (`feat(M6): Gemini AI platform, weather grounding, and conversational workspace`)
- **Node & Next.js**: Node 20+, Next.js 16.3.6 (Turbopack), React 19.2.8
- **Commands Executed**:
  1. `npm test` — **272 passed**, 0 failed, 85 suites (duration ~3.4s).
     - Includes 21 new M6 unit & integration tests:
       - `tests/unit/ai-chat-schema.test.ts` (6 tests): Payload limits, coordinate validation, mode parsing.
       - `tests/unit/gemini-adapter.test.ts` (4 tests): Adapter REST call creation, timeout handling, unconfigured fallback mode.
       - `tests/unit/grounding-snapshot.test.ts` (3 tests): Grounding synthesis from Open-Meteo bundle, hourly/daily slicing.
       - `tests/integration/ai-chat-route.test.ts` (4 tests): Rate limiting (20 req/min), anonymous vs authenticated flow, telemetry injection.
       - `tests/integration/ai-conversations-routes.test.ts` (4 tests): Authenticated CRUD, 401 rejection, thread deletion.
  2. `npm run typecheck` — **0 errors** (`tsc --noEmit`).
  3. `npm run lint` — **0 errors, 0 warnings** (`eslint src/`).
  4. `npm run format:check` — **All matched files use Prettier code style**.
  5. `npm run build` — **Production build exit 0** (Turbopack compiled all routes including `/ai`, `/api/ai/chat`, `/api/ai/conversations`, `/api/ai/conversations/[id]`).
- **Environment Limitations**:
  - Live Gemini API requests require `GEMINI_API_KEY` in environment; when absent, the system operates in verified preview mode without throwing errors.

