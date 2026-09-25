# ATMOS Weather Engine Documentation

The ATMOS Weather Engine is a strongly typed, resilient, provider-agnostic weather data layer designed according to `DATA.md`, `TECH.md`, and `ARCHITECTURE.md`. It uses **Open-Meteo** as its primary data provider while maintaining an abstraction boundary that allows supplemental or alternate providers to be added without modifying domain logic or UI components.

---

## 1. Architecture Overview

```
Client / Server Action / AI Context
                │
                ▼
       [ WeatherService ]  ── (Unit Conversions, Request Deduplication)
         │           │
         ▼           ▼
  [ WeatherCache ] [ ProviderRegistry ]
  (Memory TTL,     (Default: Open-Meteo)
   SWR, Coalesce)    │
                     ▼
          [ OpenMeteoAdapter ] (implements WeatherProvider)
                     │
                     ▼
       Open-Meteo REST Endpoints
       - /v1/forecast (Current, Hourly, Daily)
       - /v1/archive  (Historical Reanalysis)
```

### Module Organization
All weather code resides in [`src/lib/weather/`](file:///E:/projects/Atmos/src/lib/weather/):
- **`domain/`**:
  - [`location.ts`](file:///E:/projects/Atmos/src/lib/weather/domain/location.ts): Coordinates and Location schemas, bounds validation (-90..90, -180..180), coordinate normalization.
  - [`units.ts`](file:///E:/projects/Atmos/src/lib/weather/domain/units.ts): Canonical unit definitions, unit preferences, conversion formulas, display formatters.
  - [`weather.ts`](file:///E:/projects/Atmos/src/lib/weather/domain/weather.ts): Normalized domain models (`CurrentWeather`, `HourlyForecast`, `DailyForecast`, `HistoricalWeather`, `WeatherBundle`, `WeatherResponseMeta`), WMO code mapping table.
  - [`schemas.ts`](file:///E:/projects/Atmos/src/lib/weather/domain/schemas.ts): Zod schemas for query validation and boundary guarantees.
- **`errors/`**:
  - [`weather-error.ts`](file:///E:/projects/Atmos/src/lib/weather/errors/weather-error.ts): Structured error hierarchy with user-safe sanitization and retry semantics.
- **`providers/`**:
  - [`types.ts`](file:///E:/projects/Atmos/src/lib/weather/providers/types.ts): `WeatherProvider` interface and `ProviderCapabilities`.
  - [`registry.ts`](file:///E:/projects/Atmos/src/lib/weather/providers/registry.ts): `ProviderRegistry` for provider dispatch and fallback readiness.
  - **`open-meteo/`**:
    - [`types.ts`](file:///E:/projects/Atmos/src/lib/weather/providers/open-meteo/types.ts): Raw upstream API response schemas.
    - [`constants.ts`](file:///E:/projects/Atmos/src/lib/weather/providers/open-meteo/constants.ts): Endpoints, variable lists, capabilities.
    - [`adapter.ts`](file:///E:/projects/Atmos/src/lib/weather/providers/open-meteo/adapter.ts): Production adapter implementing `WeatherProvider`.
- **`cache/`**:
  - [`cache.ts`](file:///E:/projects/Atmos/src/lib/weather/cache/cache.ts): In-memory TTL cache with Stale-While-Revalidate, singleflight `RequestDeduplicator`, and normalized cache key generation.
- **`service.ts`**:
  - [`service.ts`](file:///E:/projects/Atmos/src/lib/weather/service.ts): High-level orchestrator (`WeatherService`).
- **`index.ts`**:
  - Public export boundary for the entire library.

---

## 2. Supported Open-Meteo Operations & Endpoints

| Operation | Method | Endpoint | Description |
|---|---|---|---|
| Current Conditions | `getCurrent` | `/v1/forecast?current=...` | Live temperature, humidity, apparent temp, WMO condition, pressure, wind, precipitation, day/night indicator |
| Multi-Day Forecast | `getForecast` | `/v1/forecast?forecast_days=1..16` | Current conditions + hourly time series (up to 16 days) + daily high/low summaries, sunrise/sunset |
| Historical Reanalysis | `getHistorical` | `/v1/archive?start_date=...&end_date=...` | ECMWF ERA5 reanalysis data for historical date ranges |

### Query Construction Rules
- URLs are built strictly using standard `URL` and `URLSearchParams` (no manual string concatenation).
- Coordinates are validated before execution (`latitude`: -90..90, `longitude`: -180..180).
- Endpoint origins are validated against trusted hosts to prevent SSRF vulnerabilities.
- No API keys are required for the standard Open-Meteo non-commercial tier.

---

## 3. Unit System & Normalization

All weather data is stored and cached in **canonical units** internally to prevent conversion compounding and cache fragmentation:
- **Temperature**: Celsius (`°C`)
- **Wind Speed**: Kilometers per hour (`km/h`)
- **Precipitation**: Millimeters (`mm`)
- **Atmospheric Pressure**: Hectopascals (`hPa`)
- **Distance / Visibility**: Kilometers (`km`)
- **Elevation**: Meters (`m`)

When presentation preferences are requested (e.g. `units: ImperialUnits`), the service converts presentation copies at the boundary:
- Temperature converts to Fahrenheit (`°F`)
- Wind Speed converts to Miles per hour (`mph`)
- Precipitation converts to Inches (`in`)
- Pressure converts to Inches of Mercury (`inHg`)
- Distance converts to Miles (`mi`)
- Elevation converts to Feet (`ft`)

Display helpers (`formatTemperature`, `formatWindSpeed`, `formatPrecipitation`) apply rounding strictly for UI presentation; domain numeric data remains high-precision floating point.

---

## 4. Caching & Request Deduplication

### Cache Policies (TTLs)
- **Current Weather**: 10 minutes TTL (`staleSeconds: 300` / 5 minutes)
- **Forecast**: 30 minutes TTL (`staleSeconds: 900` / 15 minutes)
- **Historical Data**: 24 hours TTL (`staleSeconds: 43200` / 12 hours)

### Coordinate Normalization
To prevent cache fragmentation across microscopic GPS differences, coordinates are normalized to 2 decimal places (~1.1 km resolution) when constructing cache keys:
`weather:current:open-meteo:51.51:-0.13:Europe/London`

### Singleflight Request Deduplication
When multiple concurrent requests for the exact same normalized query arrive simultaneously, `RequestDeduplicator` coalesces them into a single in-flight Promise so upstream is called only once, preventing cache stampedes.

### Serverless Runtime Scope
In Vercel / serverless deployments, in-memory cache persists across warm lambda invocations. The cache is isolated behind the `WeatherCache` interface, allowing a distributed Redis or KV cache adapter to be swapped in when multi-region synchronization is required.

---

## 5. Resilience & Error Handling

All errors throw `WeatherError` instances with standardized codes and HTTP status mappings:
- `INVALID_COORDINATES` (HTTP 400, non-retryable)
- `INVALID_PARAMETERS` (HTTP 400, non-retryable)
- `RATE_LIMITED` (HTTP 429, retryable, parses `Retry-After` header)
- `PROVIDER_TIMEOUT` (HTTP 504, retryable, 8s default timeout)
- `PROVIDER_UNAVAILABLE` (HTTP 502/503, retryable on 5xx)
- `NETWORK_ERROR` (HTTP 502, retryable)
- `INVALID_PAYLOAD` (HTTP 502, non-retryable)
- `UNSUPPORTED_OPERATION` (HTTP 501, non-retryable)

Transient errors (5xx, network failures, timeouts) are automatically retried up to `maxRetries` (default: 2) with exponential backoff and jitter. Non-transient errors (400, schema violations, invalid coordinates) fail fast without retrying.

Every `WeatherError` provides `.toSanitizedJSON()` to ensure internal provider URLs, auth tokens, or stack traces are never leaked to client responses.

---

## 6. How to Run Tests

The test suite runs using Node's native test runner via `tsx`:

```bash
# Run the complete weather test suite
npm test

# Run a specific test suite
npx tsx --test tests/unit/units.test.ts
npx tsx --test tests/unit/domain.test.ts
npx tsx --test tests/unit/cache.test.ts
npx tsx --test tests/unit/open-meteo-adapter.test.ts
npx tsx --test tests/unit/registry.test.ts
npx tsx --test tests/integration/weather-service.test.ts
```

All unit and integration tests use checked-in deterministic fixtures located in [`tests/fixtures/weather-fixtures.ts`](file:///E:/projects/Atmos/tests/fixtures/weather-fixtures.ts) with zero external network dependencies.

---

## 7. How to Add a Future Provider

1. Implement the `WeatherProvider` interface defined in [`src/lib/weather/providers/types.ts`](file:///E:/projects/Atmos/src/lib/weather/providers/types.ts).
2. Define capabilities in `ProviderCapabilities`.
3. Register the new provider in the `ProviderRegistry`:
```ts
import { getProviderRegistry } from "@/lib/weather";
import { AlternateProviderAdapter } from "./alternate-adapter";

const registry = getProviderRegistry();
registry.register(new AlternateProviderAdapter());
```
4. Query using the new provider ID:
```ts
const weather = await weatherService.getCurrentWeather(coords, {
  providerId: "alternate-provider",
});
```

---

## 8. Weather Route Handler (`GET /api/weather`)

The Next.js App Router endpoint [`src/app/api/weather/route.ts`](file:///E:/projects/Atmos/src/app/api/weather/route.ts) exposes full weather forecast bundles for client UI and external integrations.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `lat` | `number` | **Yes** | — | Latitude (-90 to 90) |
| `lon` | `number` | **Yes** | — | Longitude (-180 to 180) |
| `name` | `string` | No | `Custom Location` | Human-readable location name |
| `country` | `string` | No | — | Country name |
| `countryCode` | `string` | No | — | 2-letter ISO country code |
| `adminArea` | `string` | No | — | State / province / administrative region |
| `locationId` | `number` | No | — | Upstream unique location identifier |
| `units` | `string` | No | `"metric"` | Presentation units: `"metric"` (°C, km/h, mm) or `"imperial"` (°F, mph, in) |
| `timezone` | `string` | No | `"auto"` | IANA timezone string (e.g., `"America/New_York"`, `"Europe/London"`) |
| `forecastDays` | `number` | No | `7` | Forecast horizon in days (1 to 16) |
| `nocache` | `boolean` | No | `false` | When `true`, bypasses the in-memory cache |

### Response Contract (`WeatherBundle`)

```json
{
  "location": {
    "latitude": 51.5074,
    "longitude": -0.1278,
    "name": "London",
    "country": "United Kingdom",
    "countryCode": "GB",
    "adminArea": "Greater London",
    "timezone": "Europe/London"
  },
  "current": {
    "temperature": 15.2,
    "apparentTemperature": 14.8,
    "relativeHumidity": 72,
    "precipitation": 0.0,
    "weatherCode": 1,
    "condition": "Mainly clear",
    "isDay": true,
    "windSpeed": 14.5,
    "windDirection": 220,
    "pressureMsl": 1014.2,
    "uvIndex": 3.4,
    "timestamp": "2026-09-25T14:00:00Z"
  },
  "hourly": [ ... ],
  "daily": [ ... ],
  "units": {
    "temperature": "°C",
    "windSpeed": "km/h",
    "precipitation": "mm",
    "pressure": "hPa",
    "visibility": "km",
    "elevation": "m"
  },
  "meta": {
    "provider": "open-meteo",
    "retrievedAt": "2026-09-25T14:05:12.345Z",
    "cached": true,
    "stale": false
  }
}
```

### HTTP Caching & Edge Optimization
- Responses return `Cache-Control: public, s-maxage=600, stale-while-revalidate=1800` for CDN and Edge caching.
- Stale background revalidation ensures instant client responses with up-to-date meteorological observations.

---

## 9. Timezone-Aware Localization

Weather telemetry must always be displayed in the target location's native local timezone rather than the user's browser timezone.

[`src/lib/weather/utils/date-format.ts`](file:///E:/projects/Atmos/src/lib/weather/utils/date-format.ts) provides robust `Intl.DateTimeFormat` wrappers:
- `formatLocalTime(isoString, timezone)`: Formats hours and minutes (e.g. `2:30 PM`).
- `formatLocalDate(isoString, timezone)`: Formats weekday and calendar date (e.g. `Thursday, Sep 25`).
- `formatHourlyTime(isoString, timezone)`: Compact hour display for timeline bars (e.g. `2 PM`).
- `formatWeekday(isoString, timezone)`: Short day names with relative "Today" awareness.

---

## 10. Dashboard Component Architecture

The ATMOS weather dashboard (`src/components/weather/`) is built with React 19 and Tailwind CSS v4 design tokens, adhering to the cinematic, dark-first visual direction:

```
[ WeatherDashboard ] (Client coordinator, units toggle, SWR fetch)
  │
  ├── [ LocationSearch ] (Combobox from M2-T2)
  │
  ├── [ WeatherSkeleton ] (Zero-CLS animated skeleton while loading)
  │
  ├── [ CurrentConditions ] (Hero card: temperature, high/low, WMO icon, wind/pressure)
  │
  ├── [ HourlyForecast ] (24-hour horizontal scroll timeline with precipitation bars)
  │
  ├── [ DailyForecast ] (7-day cards with min/max range gradient indicators)
  │
  ├── [ WeatherMetrics ] (4-card deep telemetry: Wind Dynamics, Pressure, Moisture, Celestial)
  │
  └── Provenance Footer (Data source attribution, timestamp, coordinates)
```

### Key Components

- **[`WeatherDashboard`](file:///E:/projects/Atmos/src/components/weather/weather-dashboard.tsx)**: Coordinates location selection, unit preference state (`metric` vs `imperial`), asynchronous fetching with `AbortController` cancellation for stale requests, and error boundary recovery.
- **[`CurrentConditions`](file:///E:/projects/Atmos/src/components/weather/current-conditions.tsx)**: Hero presentation displaying current condition, apparent temperature ("feels like"), daylight-aware icon, UV index severity pill, wind direction with compass degree, and humidity.
- **[`HourlyForecast`](file:///E:/projects/Atmos/src/components/weather/hourly-forecast.tsx)**: Smooth horizontal scrollable 24-hour projection with condition icons, temperature progression, and rain chance percentages.
- **[`DailyForecast`](file:///E:/projects/Atmos/src/components/weather/daily-forecast.tsx)**: 7-day outlook with relative temperature range bars visualising the min/max variance against the 7-day global temperature spread.
- **[`WeatherMetrics`](file:///E:/projects/Atmos/src/components/weather/weather-metrics.tsx)**: Detailed meteorological metrics covering Wind Dynamics & Gusts, Barometric MSL Pressure, Precipitation & Humidity, and Sunrise/Sunset Solar Cycle.
- **[`WeatherIcon`](file:///E:/projects/Atmos/src/components/weather/weather-icon.tsx)**: Accessible, responsive SVG iconography for all standard WMO weather codes, dynamically adjusting for daytime and nighttime conditions.
- **[`WeatherSkeleton`](file:///E:/projects/Atmos/src/components/weather/weather-skeleton.tsx)**: Layout-matched placeholder ensuring zero Cumulative Layout Shift (CLS = 0) during network fetches.

