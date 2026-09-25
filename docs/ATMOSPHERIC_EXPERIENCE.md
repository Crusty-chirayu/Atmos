# ATMOS Atmospheric Experience & Interactive Globe Architecture

**Milestone:** M3 — Public Cinematic Homepage & Interactive Globe  
**Document Version:** 1.0  
**Status:** Authoritative Design Specification  

---

## 1. Architectural Overview

ATMOS transforms from a raw meteorological dashboard into an immersive, cinematic planetary intelligence platform. The user experience seamlessly links global spatial exploration with high-fidelity local weather telemetry.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js Server Shell                            │
│  - SEO Metadata & OpenGraph tags                                       │
│  - Semantic HTML landmarks (<header>, <main>, <section>, <footer>)    │
│  - Immediate visual shell before any JavaScript/WebGL execution        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Cinematic Atmospheric Experience Coordinator               │
│                        (src/components/home/)                          │
│                                                                        │
│  Shared State: selectedLocation, weatherBundle, activeView, isReduced  │
│                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │ AtmosphericScene      │  │ InteractiveGlobe (Three.js)           │  │
│  │ (Adaptive Weather BG) │  │ - Dynamic client-only import (no SSR) │  │
│  │ - Procedural lighting │  │ - Self-contained vector Earth texture │  │
│  │ - Day/Night cycles    │  │ - Day/Night terminator & atmosphere   │  │
│  │ - Weather particles   │  │ - Lat/Lon coordinate beacons & slerp  │  │
│  │ - WebGL/CSS fallback  │  │ - Touch/drag gestures + ARIA controls │  │
│  └───────────────────────┘  └───────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Unified Location Search & Quick-Explore Curated Metropolises     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ WeatherDashboard (M2-T3 Preserved Core)                          │  │
│  │ - Hero Current Conditions                                        │  │
│  │ - 24-Hour Hourly Timeline                                        │  │
│  │ - 7-Day Synoptic Outlook with Range Gradient Bars                │  │
│  │ - 4-Card Meteorological Telemetry Grid                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Rate-Limited API Endpoints                         │
│  - GET /api/weather (Sliding window rate limit + CDN cache)            │
│  - GET /api/weather/geocoding (Rate limit + in-memory cache)           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Shared State Architecture

To prevent conflicting sources of truth between the 3D globe, location search combobox, and weather dashboard:
- **`selectedLocation`**: The single canonical `GeocodingLocation` (or initial default) held at the parent coordinator.
- **`weatherBundle`**: The fetched meteorological bundle corresponding strictly to `selectedLocation`.
- **`activeViewMode`**: View toggle between `"split"` (cinematic side-by-side or stacked globe + forecast), `"globe"` (focused 3D planetary exploration), and `"dashboard"` (expanded in-depth telemetry).
- **`unitPreference`**: Global `"metric"` (°C, km/h, mm) or `"imperial"` (°F, mph, in) synchronized across all widgets.

---

## 3. Geographic Coordinate Conversion

Conversion from geographic coordinates $(\phi = \text{lat}, \lambda = \text{lon})$ to 3D Cartesian coordinates on a sphere of radius $R$:

$$\text{latRad} = \text{lat} \times \frac{\pi}{180}$$
$$\text{lonRad} = \text{lon} \times \frac{\pi}{180}$$

Using standard Three.js right-handed coordinate convention (where $Y$ is up, $Z$ is toward the camera, and $X$ is right):
$$x = R \cdot \cos(\text{latRad}) \cdot \sin(\text{lonRad})$$
$$y = R \cdot \sin(\text{latRad})$$
$$z = R \cdot \cos(\text{latRad}) \cdot \cos(\text{lonRad})$$

### Boundary Test Matrix
- **North Pole** $(90^\circ, 0^\circ) \implies (0, R, 0)$
- **South Pole** $(-90^\circ, 0^\circ) \implies (0, -R, 0)$
- **Equator / Prime Meridian** $(0^\circ, 0^\circ) \implies (0, 0, R)$
- **Equator / $90^\circ\text{E}$** $(0^\circ, 90^\circ) \implies (R, 0, 0)$
- **Equator / Antimeridian** $(0^\circ, 180^\circ) \implies (0, 0, -R)$
- **Equator / $90^\circ\text{W}$** $(0^\circ, -90^\circ) \implies (-R, 0, 0)$

---

## 4. Earth Texture & Planetary Assets

To eliminate external runtime network dependencies, asset license ambiguity, and large binary blobs in source control:
- Earth landmasses and continental coastlines are generated procedurally on a high-resolution offscreen canvas using an equirectangular projection of simplified geographic vector polygons.
- The procedural map features deep oceanic blues (`#081226`), continental dark landmasses (`#16243d`), subtle coastline borders (`#38deff`), and latitude/longitude graticule lines (`rgba(90, 126, 181, 0.15)`).
- Layered with an atmospheric Fresnel glow shader creating a luminous blue planetary rim.
- Day/night terminator simulated with directional sunlight based on the selected location's local time.

---

## 5. Weather-Driven Atmospheric Scene

The background atmospheric environment responds dynamically to the active weather conditions:

| Weather State | WMO Codes | Visual Traits |
|---|---|---|
| **Clear Day** | 0, 1 (isDay: true) | Cyan-gold solar illumination, subtle golden atmospheric dust particles, high contrast |
| **Clear Night** | 0, 1 (isDay: false) | Deep indigo/obsidian velvet sky, shimmering celestial stars, gentle moonlight glow |
| **Partly Cloudy** | 2 | Soft drifting cumulus clouds, balanced ambient illumination |
| **Overcast** | 3, 45, 48 | Dense atmospheric haze, muted contrast, slate-blue undertones |
| **Rain / Drizzle** | 51–67, 80–82 | Vertical precipitation streaks, darkened horizon, cool rain mist |
| **Snow** | 71–77, 85–86 | Gentle drifting crystalline snowflakes, crisp glacial highlight |
| **Thunderstorm** | 95–99 | Deep electric violet shadows, periodic ambient lightning flashes |

---

## 6. Performance & Quality Tiers

1. **High-Performance (Desktop / Dedicated GPU)**:
   - Full 60 FPS animation loop with smooth globe inertia.
   - Dual-pass atmospheric glow and dynamic starfield.
   - Max DPR capped at `2.0` to preserve GPU memory on Retina displays.
2. **Mobile / Tablet Tier**:
   - Particle count throttled to $\le 60$.
   - Touch drag with single-finger rotation and pinch-zoom prevention on page scroll.
   - Max DPR capped at `1.5`.
3. **Visibility Awareness**:
   - `document.addEventListener('visibilitychange')` halts animation when tab is inactive, dropping CPU/GPU usage to 0%.
4. **Reduced Motion (`prefers-reduced-motion`)**:
   - Globe continuous auto-rotation disabled.
   - Background particles and flashes halted; static, high-contrast atmospheric gradient rendered.
5. **WebGL Fallback**:
   - If WebGL initialization throws or `canvas.getContext('webgl2')` fails, an accessible 2.5D CSS SVG planet illustration with interactive quick-city pills takes over gracefully with 0 disruption to weather telemetry.

---

## 7. Public API Rate Limiting

To protect public endpoints (`/api/weather` and `/api/weather/geocoding`) from denial-of-service or scraping attacks:
- **Token Bucket / Sliding Window**: Built into [`src/lib/security/rate-limit.ts`](file:///E:/projects/Atmos/src/lib/security/rate-limit.ts).
- **Default Limits**:
  - Weather Forecast: 60 requests per minute per IP.
  - Geocoding Search: 100 requests per minute per IP.
- **Headers Returned**:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
- **Exceeded Limit**: Returns HTTP `429 Too Many Requests` with `Retry-After` header and user-safe JSON payload.
