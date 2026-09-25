# ATMOS Weather Dashboard & Visualization (M5) Documentation

ATMOS M5 introduces a production-oriented, data-rich weather intelligence dashboard accessible at `/dashboard`. It balances cinematic visual aesthetics with deep scientific meteorological telemetry, interactive vector charts, real-time 2D radar mapping, historical atmospheric reanalysis, and multi-location management for authenticated and anonymous users alike.

---

## 1. Information Architecture & Navigation

The dashboard is structured as a dedicated Next.js App Router page ([`src/app/dashboard/page.tsx`](file:///E:/projects/Atmos/src/app/dashboard/page.tsx)) orchestrating interactive client components rooted in [`src/components/weather/weather-dashboard-view.tsx`](file:///E:/projects/Atmos/src/components/weather/weather-dashboard-view.tsx).

```
[ Navigation Bar ] ── (Brand, Dashboard link, Home link, Units toggle, Auth / Account Menu)
       │
[ Dashboard Header ] ── (Active City Name, Coordinates, Local Timezone Clock, Live Refresh, Unit Pills)
       │
[ Location Geocoding Bar ] ── (Async Search with Debounce, Scoring, and Recent Picks)
       │
[ Sub-View Tabs ] ── [ All ] [ Conditions ] [ Telemetry Charts ] [ 2D Radar ] [ Historical ERA5 ] [ Multi-City ]
       │
┌──────┴────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  [ Primary Hero Summary ]                                                     │
│  ├── Current Temperature, Apparent Feels-Like, High/Low, Condition Pill       │
│  ├── Live Astronomical Cycle (Sunrise, Sunset, Dawn/Dusk Progression)         │
│  └── Meteorological Grid (Humidity, Dew Point, Barometric Pressure, Wind,     │
│      Precipitation Volume & Probability, Visibility, Cloud Cover, UV Index)   │
│                                                                               │
│  [ Interactive Vector Charts ]                                                │
│  ├── 24-Hour Temperature & Feels-Like Bézier Splines                          │
│  ├── Hourly Precipitation Probability Bars & Volume Hydrograph                │
│  ├── Wind Velocity Vectors, Gust Extents & Compass Direction Glyphs           │
│  ├── Barometric Pressure Gradient & Relative Humidity Fill                     │
│  └── 7-Day Temperature Range Variance & Condition Telemetry                   │
│                                                                               │
│  [ Interactive 2D Weather Map & Live Precipitation Radar ]                    │
│  ├── CartoDB Dark Matter / OSM High-DPI Vector/Raster Slippy Tiles            │
│  ├── RainViewer Near-Real-Time Doppler Radar Tiles with Opacity Control       │
│  └── Interactive Pin Dropper (Click anywhere to synchronize dashboard)        │
│                                                                               │
│  [ Historical Atmosphere Explorer ]                                           │
│  ├── ECMWF ERA5 Reanalysis Interface (1940 – Present-2D)                      │
│  ├── Statistical Aggregates (Mean Temp, Max/Min, Total Precip, Max Gust)       │
│  └── Provenance Callouts (ERA5 Reanalysis vs. In-situ Station Observations)   │
│                                                                               │
│  [ Saved Locations & Multi-City Overview ]                                    │
│  ├── Authenticated User Saved Cities (M4 RLS-backed persistence)              │
│  ├── Server-Side Concurrency-Limited Batch Telemetry (POST /api/weather/batch)│
│  └── Anonymous Fallback with Live Telemetry for Global Metropolises           │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Hierarchy

All M5 dashboard components reside in [`src/components/weather/`](file:///E:/projects/Atmos/src/components/weather/) and [`src/components/maps/`](file:///E:/projects/Atmos/src/components/maps/):

1. **[`WeatherDashboardView`](file:///E:/projects/Atmos/src/components/weather/weather-dashboard-view.tsx)**:
   - Primary state coordinator: manages selected location, weather bundle, active view tab, unit overrides, and auto-sync with user account preferences.
2. **[`WeatherMetricsComponent`](file:///E:/projects/Atmos/src/components/weather/weather-metrics.tsx)**:
   - Detailed meteorological telemetry grid: calculates and displays humidity, barometric pressure, UV index, wind speed/direction, precipitation rate, and visibility without fabricating missing provider values.
3. **[`WeatherChartsContainer`](file:///E:/projects/Atmos/src/components/weather/charts/weather-charts-container.tsx)**:
   - Chart switcher hosting 5 specialized vector charts:
     - [`TemperatureTrendChart`](file:///E:/projects/Atmos/src/components/weather/charts/temperature-trend-chart.tsx): Cubic Bézier temperature & apparent curves with min/max bounds and scrub hover tooltip.
     - [`PrecipitationChart`](file:///E:/projects/Atmos/src/components/weather/charts/precipitation-chart.tsx): Dual-axis probability bars (%) and volume line (mm/in).
     - [`WindChart`](file:///E:/projects/Atmos/src/components/weather/charts/wind-chart.tsx): Sustained speed curve, gust extent, and rotated SVG directional arrow glyphs.
     - [`PressureHumidityChart`](file:///E:/projects/Atmos/src/components/weather/charts/pressure-humidity-chart.tsx): Dual-axis barometric pressure (hPa/inHg) and humidity (%) area.
     - [`SevenDayRangeChart`](file:///E:/projects/Atmos/src/components/weather/charts/seven-day-range-chart.tsx): 7-day temperature range variance bars with condition glyphs.
4. **[`WeatherMap2D`](file:///E:/projects/Atmos/src/components/maps/weather-map-2d.tsx)**:
   - Zero-dependency HTML5/CSS Slippy Tile Map using Web Mercator projection mathematics.
   - Base layer: CartoDB Dark Matter (light mode: CartoDB Positron / OSM).
   - Weather overlay: RainViewer Real-Time Doppler Precipitation Radar (latest frame dynamically retrieved from `https://api.rainviewer.com/public/weather-maps.json`).
   - Interactive map inspector: panning, zoom buttons, coordinate readout, and click-to-sync dashboard location.
5. **[`HistoricalExplorer`](file:///E:/projects/Atmos/src/components/weather/historical-explorer.tsx)**:
   - Historical atmospheric reanalysis view powered by ECMWF ERA5.
   - Quick range presets ("Past 7 Days", "Past 14 Days", "Past 30 Days", "Same Week 1 Year Ago") + custom date picker with validation (1940 to present - 2 days, maximum 90 days span).
   - Provenance indicator explaining ERA5 model assimilation vs. direct station measurements.
6. **[`SavedLocationsOverview`](file:///E:/projects/Atmos/src/components/weather/saved-locations-overview.tsx)**:
   - Multi-city grid for authenticated users displaying live current conditions fetched via batched API endpoint.
   - 1-click location bookmarking and un-bookmarking.
   - Anonymous visitor mode showcasing 6 global metropolises (Tokyo, London, New York, Paris, Sydney, Cairo).

---

## 3. Data Flow & API Contracts

### Endpoints

| Route | Method | Purpose | Cache Policy | Rate Limit |
|---|---|---|---|---|
| `/api/weather` | `GET` | Current, hourly, and daily forecasts for a single coordinate | In-memory SWR (10m current, 30m forecast) + Edge header | 60 req / min |
| `/api/weather/historical` | `GET` | ECMWF ERA5 atmospheric reanalysis time-series | In-memory 24h TTL + Edge header (`s-maxage=86400`) | 30 req / min |
| `/api/weather/batch` | `POST` | Parallel weather retrieval for 1 to 12 locations with concurrency pool | Aggregated per-location cache hits + SWR | 30 req / min |
| `/api/weather/geocoding` | `GET` | Location search and coordinate resolution | In-memory cache + Edge header | 60 req / min |

### Batch Query Contract (`POST /api/weather/batch`)
```json
{
  "locations": [
    { "id": "loc_1", "name": "London", "latitude": 51.5074, "longitude": -0.1278 },
    { "id": "loc_2", "name": "Tokyo", "latitude": 35.6762, "longitude": 139.6503 }
  ],
  "units": {
    "temperature": "celsius",
    "windSpeed": "kmh",
    "precipitation": "mm",
    "pressure": "hpa"
  }
}
```
**Response Contract**:
```json
{
  "results": [
    {
      "id": "loc_1",
      "name": "London",
      "bundle": { "current": { ... }, "meta": { ... } }
    },
    {
      "id": "loc_2",
      "name": "Tokyo",
      "bundle": { "current": { ... }, "meta": { ... } }
    }
  ]
}
```
*Note*: The service layer uses bounded concurrency (`maxConcurrency: 5`) and isolates errors per location so partial failures never degrade other locations.

---

## 4. Vector Chart Architecture (Zero Dependencies)

Rather than introducing bulky external charting libraries (such as `chart.js` or `recharts`) which inflate client bundles and risk SSR hydration mismatches, ATMOS implements custom responsive SVG charts designed specifically around ATMOS design tokens:

- **Mathematical Foundations**:
  - Continuous data points are normalized into SVG viewbox coordinate space `(0, 0, width, height)`.
  - Spline smoothing utilizes cubic Bézier control points computed from neighboring nodes.
  - Directional wind vectors compute geometric angle rotations using SVG `transform="rotate(deg, cx, cy)"`.
- **Accessibility & Contrast**:
  - Every SVG chart includes accessible `<title>` and `<desc>` tags.
  - High-contrast color tokens: Cyan `#22d3ee`, Emerald `#34d399`, Amber `#fbbf24`, Indigo `#818cf8`.
  - Mouse hover and touch scrubbing provides an accessible interactive tooltip.

---

## 5. Map & Weather Overlays

### Base Map Tiles
- **Dark Mode**: CartoDB Dark Matter (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`)
- **Light Mode**: CartoDB Positron / OSM
- **Attribution**: &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, &copy; [CARTO](https://carto.com/attributions).

### Live Radar Overlay
- **Provider**: [RainViewer API](https://www.rainviewer.com/api.html)
- **Data Source**: Real-time composite Doppler radar imagery updated every 10 minutes.
- **Integration**: The client asynchronously inspects `https://api.rainviewer.com/public/weather-maps.json` to discover the latest past radar timestamp and constructs tile URLs dynamically:
  `https://tilecache.rainviewer.com/v2/radar/{timestamp}/256/{z}/{x}/{y}/2/1_1.png`
- **Fallback & Licensing**: RainViewer open radar tiles are free for non-commercial open data presentation with attribution. If the radar service is unreachable or coordinates lack radar coverage, an honest notice is rendered while base map navigation remains completely functional.

---

## 6. Historical Data (ERA5 Reanalysis) Coverage & Limitations

- **Provider**: Open-Meteo Historical Weather API (`/v1/archive`) backed by ECMWF ERA5 & ERA5-Land reanalysis models.
- **Coverage**: Global spatial coverage from **1940-01-01** up to **5 days before present** (reanalysis model assimilation delay).
- **Validation**:
  - `HistoricalApiQuerySchema` enforces `startDate >= 1940-01-01`.
  - Enforces `startDate <= endDate`.
  - Maximum query window is constrained to **90 consecutive days** to prevent abusive upstream payloads.
- **Data Provenance**:
  - ERA5 blends historical in-situ station observations with atmospheric physics models. It is **not** purely a local ground station reading and is explicitly labeled as such in the UI.

---

## 7. Security, State, & Reliability

1. **Authentication Boundary**:
   - Public exploration requires **no credentials or login**.
   - Saved locations are protected by Supabase Row-Level Security (RLS) established in M4; client requests never provide raw user IDs.
2. **Server-Side Protection**:
   - All external provider calls are routed through server API routes (`/api/weather/*`).
   - Rate limiting via sliding-window limiters protects against scrape floods.
3. **Resilience**:
   - Upstream timeouts (5,000ms default) trigger structured error envelopes with fallback data or retry suggestions.
   - Partial batch failures render error cards for the failed location without interrupting other locations.

---

## 8. Verification & Test Suite

The M5 implementation is covered by 251 automated tests across unit and integration suites:
- `tests/unit/historical-query-schema.test.ts`: Date boundaries, range limit (90d), coordinate ranges.
- `tests/unit/batch-weather-schema.test.ts`: Batch length limits (1..12), location structure.
- `tests/unit/weather-service-historical.test.ts`: Retrieval, unit conversions, caching.
- `tests/unit/weather-service-batch.test.ts`: Parallel batch execution, error isolation.
- `tests/integration/historical-route.test.ts`: `GET /api/weather/historical` status codes, validation, headers.
- `tests/integration/batch-route.test.ts`: `POST /api/weather/batch` validation, concurrency, rate limits.
