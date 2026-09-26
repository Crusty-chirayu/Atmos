# ATMOS — Milestone 8 Architecture & Verification
## PWA, Performance, Accessibility, and Reliability Hardening

### 1. Executive Summary
Milestone 8 advances ATMOS into a Progressive Web App (PWA) with offline resilience, privacy-conscious caching boundaries, performance optimizations, and accessibility hardening.

---

### 2. Progressive Web App (PWA) Architecture

#### 2.1 Web App Manifest (`public/manifest.json`)
The manifest complies with W3C Web App Manifest specifications:
- **Application Name**: `ATMOS`
- **Short Name**: `ATMOS`
- **Description**: `Global AI-powered weather intelligence — live forecasts, 3D globe, and personalized alerts.`
- **Display Mode**: `standalone`
- **Start URL**: `/`
- **Orientation**: `any`
- **Colors**:
  - `theme_color`: `#04060d`
  - `background_color`: `#04060d`
- **Icons**:
  - `/icons/icon-192.png` (192x192, `any`)
  - `/icons/icon-192-maskable.png` (192x192, `maskable`)
  - `/icons/icon-512.png` (512x512, `any`)
  - `/icons/icon-512-maskable.png` (512x512, `maskable`)
  - `/icons/icon.svg` (vector master)

#### 2.2 Installation Experience (`src/components/pwa/`)
- **`PwaProvider`**:
  - Captures browser `beforeinstallprompt` event and defers it.
  - Subscribes to window `(display-mode: standalone)` media query via `useSyncExternalStore`.
  - Subscribes to `navigator.onLine` and `online`/`offline` window events.
  - Displays non-intrusive floating connectivity banners when network status changes.
- **`PwaInstallButton`**:
  - Provides a single-click install prompt for supported browsers (Chrome, Edge, Android).
  - Displays "ATMOS App Installed" confirmation badge when running in standalone mode.

---

### 3. Service Worker & Caching Isolation (`public/sw.js`)

#### 3.1 Cache Boundaries
| Cache Scope | Name | Strategy | Description |
|---|---|---|---|
| **Static Cache** | `atmos-static-v1` | Cache-First | Pre-caches `/offline`, `/manifest.json`, and core brand icons on install. Caches Next.js immutable bundles (`/_next/static/*`), fonts, and images. |
| **Shell Cache** | `atmos-shell-v1` | Network-First | Caches HTML navigation responses with fallback to cached shell. |
| **Weather Cache** | `atmos-weather-v1` | Network-First with bounded TTL | Caches public `/api/weather` GET responses with 30-minute maximum staleness window (`WEATHER_CACHE_TTL_MS = 1800000`). Offline responses include `X-Atmos-Offline-Cached: true` header. |

#### 3.2 Privacy & Security Guarantees
- **Strict Privacy Exclusion**: The Service Worker explicitly bypasses caching for all sensitive endpoints:
  - `/api/user/*` (saved locations, alerts, user preferences, notifications)
  - `/api/ai/*` (Gemini chats, conversation threads)
  - `/api/auth/*` (session cookies, tokens)
  - `/api/cron/*` (cron jobs and evaluation runs)
- No user credentials, tokens, or personal weather alerts are stored in shared browser caches.

#### 3.3 Offline Fallback (`src/app/offline/page.tsx`)
- When network disconnects and an uncached route is requested, the Service Worker immediately serves the pre-cached `/offline` route.
- Built with React 19 `useSyncExternalStore` for flicker-free connection state detection.
- Provides immediate "Retry Connection" action and cached telemetry guidance.

#### 3.4 Web Push Listeners
- `push` event: Extracts JSON/text payloads and invokes `self.registration.showNotification` with branded icons and action metadata.
- `notificationclick` event: Closes notification and focuses existing window or opens `/account`.

---

### 4. Performance Optimizations

1. **Route-Level Code Splitting**:
   - `InteractiveGlobe` uses `next/dynamic` (`ssr: false`) to lazily load Three.js mesh canvases only when requested.
2. **Turbopack Build Optimization**:
   - All 21 app routes statically compiled and optimized with Next.js 16 Turbopack compiler.
3. **Map & Radar Fault Tolerance**:
   - Map tiles and RainViewer radar images implement `onError` opacity hiding to prevent visual glitches during upstream tile provider outages.
4. **Request Debouncing & Sliding Window Rate Limiting**:
   - Upstream Open-Meteo geocoding and weather queries utilize 300ms client debouncing and server-side sliding window limits.

---

### 5. Accessibility (a11y) Hardening

- **Reduced Motion**: Respects `prefers-reduced-motion: reduce` globally via `src/app/globals.css`.
- **Keyboard Navigation**:
  - `NotificationCenter` drawer supports Escape key dismissal with focus restoration to trigger button.
  - Tab navigation throughout all modals, search inputs, and forms.
- **ARIA Semantics**:
  - Notification drawer has `role="dialog"`, `aria-label="Notification Center"`, and `aria-expanded`.
  - Skip-to-content anchor provided at top of layout (`#main-content`).
- **Color Contrast**: All text tokens in both dark and light modes comply with WCAG 2.1 AA 4.5:1 minimum contrast ratios.

---

### 6. Verification Results

| Check | Tool / Command | Result |
|---|---|---|
| **PWA & Offline Unit Tests** | `tsx --test tests/unit/pwa-offline.test.ts` | 4/4 passing |
| **Complete Test Suite** | `npm test` | **292 tests passing across 88 suites** (0 failures) |
| **Type Checking** | `npm run typecheck` (`tsc --noEmit`) | Clean (0 errors) |
| **ESLint** | `npm run lint` (`eslint src/`) | Clean (0 errors, 0 warnings) |
| **Code Formatting** | `npm run format:check` | Clean (100% Prettier compliant) |
| **Production Build** | `npm run build` (`next build`) | Clean (21 routes compiled) |
