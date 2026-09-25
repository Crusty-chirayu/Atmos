# ATMOS Geocoding & Location Search Engine Documentation

The ATMOS Geocoding & Location Search Engine provides a strongly typed, resilient, provider-agnostic search and normalization layer designed according to `DATA.md`, `TECH.md`, and `ARCHITECTURE.md`. It utilizes **Open-Meteo Geocoding API** as its primary provider while maintaining an extensible provider abstraction supporting alternate future providers (e.g. Mapbox Geocoding, Photon, Nominatim) without altering domain logic or UI components.

---

## 1. Architecture Overview

```
Client / UI Search Combobox / Route Handler
                    │
                    ▼
          [ GeocodingService ]  ── (Deterministic Ranking, Deduplication, Coordinate Normalization)
            │              │
            ▼              ▼
     [ GeocodingCache ] [ GeocodingProviderRegistry ]
     (Memory TTL: 24h,   (Default: Open-Meteo)
      Singleflight)        │
                           ▼
            [ OpenMeteoGeocodingAdapter ] (implements GeocodingProvider)
                           │
                           ▼
         Open-Meteo Geocoding REST Endpoints
         - /v1/search (Forward search by name, multilingual, count)
         - /v1/get    (Direct lookup by GeoNames / Open-Meteo numeric ID)
```

### Module Organization
All geocoding code resides under [`src/lib/geocoding/`](file:///E:/projects/Atmos/src/lib/geocoding/):
- **`domain/`**:
  - [`types.ts`](file:///E:/projects/Atmos/src/lib/geocoding/domain/types.ts): `GeocodingLocation` (extending the core `Location` model), `GeocodingSearchResult`, and `formatLocationLabel` disambiguation helper.
  - [`schemas.ts`](file:///E:/projects/Atmos/src/lib/geocoding/domain/schemas.ts): Zod schemas for query parameter validation (`GeocodingQuerySchema`) and boundary guarantees (`GeocodingLocationSchema`).
- **`providers/`**:
  - [`types.ts`](file:///E:/projects/Atmos/src/lib/geocoding/providers/types.ts): `GeocodingProvider` interface and `GeocodingProviderCapabilities`.
  - [`registry.ts`](file:///E:/projects/Atmos/src/lib/geocoding/providers/registry.ts): `GeocodingProviderRegistry` for provider dispatch, dynamic registration, and default selection.
  - **`open-meteo/`**:
    - [`types.ts`](file:///E:/projects/Atmos/src/lib/geocoding/providers/open-meteo/types.ts): Upstream raw API response shapes (`OpenMeteoGeocodingSearchResponse`, `OpenMeteoGeocodingRawItem`).
    - [`constants.ts`](file:///E:/projects/Atmos/src/lib/geocoding/providers/open-meteo/constants.ts): Endpoints, capabilities, and SSRF host whitelist (`geocoding-api.open-meteo.com`).
    - [`adapter.ts`](file:///E:/projects/Atmos/src/lib/geocoding/providers/open-meteo/adapter.ts): Production adapter implementing `GeocodingProvider` with bounded retries, timeout, and error mapping.
- **`ranking/`**:
  - [`ranking.ts`](file:///E:/projects/Atmos/src/lib/geocoding/ranking/ranking.ts): Diacritic normalization (`normalizeSearchString`), relevance scoring (`calculateLocationScore`), deterministic ranking (`rankGeocodingResults`), and geographic coordinate deduplication (`deduplicateGeocodingResults`).
- **`cache/`**:
  - [`cache.ts`](file:///E:/projects/Atmos/src/lib/geocoding/cache/cache.ts): 24-hour TTL caching, singleflight `RequestDeduplicator`, and normalized query cache key generation.
- **`service.ts`**:
  - [`service.ts`](file:///E:/projects/Atmos/src/lib/geocoding/service.ts): High-level orchestrator (`GeocodingService`, `getGeocodingService`).
- **`index.ts`**:
  - Public export boundary for the geocoding library.

---

## 2. Supported Provider Operations & Endpoints

| Operation | Method | Endpoint | Description |
|---|---|---|---|
| Forward Search | `search` | `/v1/search?name=...` | Global location search by name, multilingual support, result count limit (1..100), optional country code filtering |
| Direct Lookup | `getById` | `/v1/get?id=...` | Direct location lookup by upstream GeoNames/Open-Meteo numeric identifier |

### Query Construction Rules
- URLs are constructed strictly using standard `URL` and `URLSearchParams` objects.
- Endpoint origins are validated against trusted hosts (`geocoding-api.open-meteo.com`) to prevent SSRF vulnerabilities.
- Search query terms are automatically trimmed and validated to be between 2 and 100 characters.
- Empty or whitespace-only searches are rejected immediately before making network requests.
- Language codes are normalized to lowercase 2-5 letter strings (default: `"en"`).
- Country codes are normalized to uppercase 2-letter ISO 3166-1 alpha-2 codes (e.g. `"GB"`, `"US"`).
- No API keys are required for the standard Open-Meteo geocoding tier.

---

## 3. Normalized Location Domain Model

Every upstream location item is mapped into a normalized `GeocodingLocation` object extending the core `Location` model:

```typescript
export interface GeocodingLocation extends Location {
  id: string; // Guaranteed stable identifier (e.g. 'open-meteo:2643743')
  providerId: string; // 'open-meteo'
  sourceId?: number | string; // Upstream raw numeric ID (e.g. 2643743)
  name: string; // 'London'
  latitude: number; // 51.50853 (guaranteed within -90..90)
  longitude: number; // -0.12574 (guaranteed within -180..180)
  country?: string; // 'United Kingdom'
  countryCode?: string; // 'GB'
  adminArea?: string; // 'England' (State / Province / Region)
  adminArea2?: string; // 'Greater London' (County / District)
  elevation?: number; // 25 (meters above sea level)
  timezone?: string; // 'Europe/London' (IANA timezone name)
  population?: number; // 8961936
  featureCode?: string; // 'PPLC' (GeoNames capital code)
  formattedAddress: string; // 'London, England, United Kingdom'
}
```

### Disambiguation Strategy
Identically named cities worldwide (e.g., *Springfield, Illinois* vs *Springfield, Massachusetts*; *Paris, France* vs *Paris, Texas*) are disambiguated through:
1. `formattedAddress`: Formatted using `formatLocationLabel({ name, adminArea, country, countryCode })`, which suppresses redundant state names (e.g. *Tokyo, Tokyo* -> *Tokyo, Japan*) while preserving distinguishing administrative divisions.
2. Unique composite identifiers (`id: "open-meteo:2643743"`).
3. Display of country badges, administrative regions, and population in the UI.

---

## 4. Relevance Ranking & Deduplication

Upstream provider results are post-processed deterministically before returning to the caller:

### Scoring Signals (`calculateLocationScore`)
- **+1000 pts**: Exact name match (case and diacritic-insensitive, e.g. "Munchen" == "München").
- **+500 pts**: Prefix name match (e.g. "Lond" matches "London").
- **+250 pts**: Substring name match (e.g. "York" matches "New York").
- **+100 pts**: Match against country name or administrative area.
- **+50 pts**: Capital city bonus (`featureCode: "PPLC"`).
- **0..30 pts**: Logarithmic population weighting (`Math.min(30, Math.log10(population) * 4)`), giving major metropolitan centers a stable, predictable edge over unpopulated hamlets with the same name.

### Coordinate Deduplication (`deduplicateGeocodingResults`)
Upstream geocoding databases frequently contain multiple duplicate entries for the same metropolitan area (e.g. central subway stop vs municipal hall). Results are deduplicated by mapping coordinates to 2 decimal places (~1.1 km resolution) and combining with the normalized name.

---

## 5. Caching & Rate-Conscious Architecture

### Cache Policies
- **Cache TTL**: 24 hours (`DEFAULT_GEOCODING_CACHE_CONFIG.ttlSeconds = 86400`).
- **Stale-While-Revalidate**: 12 hours (`staleSeconds = 43200`).
- **Cache Key Format**:
  `geocoding:<providerId>:<normalizedTerm>:<language>:<count>:<countryCode>`
  Example: `geocoding:open-meteo:london:en:10:GB`

### Request Deduplication (Singleflight)
Concurrent searches for the identical cache key (e.g. during rapid typing across multiple UI listeners or identical pre-fetch calls) coalesce into a single in-flight Promise using `RequestDeduplicator`, preventing redundant outbound HTTP requests.

---

## 6. Client Search & Accessible Interaction Layer

- **Hook**: [`src/hooks/use-location-search.ts`](file:///E:/projects/Atmos/src/hooks/use-location-search.ts)
  - 300ms debounce.
  - AbortController request cancellation preventing stale race conditions.
  - State tracking: `query`, `results`, `isSearching`, `error`, `selectedLocation`.
- **Component**: [`src/components/weather/location-search.tsx`](file:///E:/projects/Atmos/src/components/weather/location-search.tsx)
  - WCAG 2.2 AA compliant combobox pattern (`role="combobox"`, `aria-autocomplete="list"`, `aria-activedescendant`).
  - Full keyboard navigation: `ArrowDown`, `ArrowUp`, `Enter`, `Escape`.
  - Live screen-reader status announcements via `aria-live="polite"`.
  - Reduced-motion compliant animations.

---

## 7. Next.js Route Handler

- **Endpoint**: `GET /api/weather/geocoding`
- **Query Parameters**:
  - `q`: Search query string (required, 2..100 characters).
  - `count`: Max results (optional, 1..100, default: 10).
  - `lang`: Language code (optional, default: `"en"`).
  - `country`: 2-letter ISO country code (optional).
- **Headers**:
  - `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
- **Error Responses**:
  - `400`: Invalid parameters (e.g., query too short, count out of bounds).
  - `429`: Rate limited with upstream `Retry-After` header.
  - `502 / 504`: Upstream provider unavailable or timed out.
  - `500`: Sanitized internal error (no stack traces leaked).

---

## 8. Integration with Weather Engine

Geocoding search outputs feed directly into the M2-T1 weather service without intermediate conversions:

```typescript
import { getGeocodingService } from "@/lib/geocoding";
import { getWeatherService } from "@/lib/weather";

const geocodingService = getGeocodingService();
const weatherService = getWeatherService();

// Step 1: Search for location
const searchResult = await geocodingService.search({ query: "London" });
const selected = searchResult.results[0];

// Step 2: Feed directly into weather engine
const weather = await weatherService.getCurrentWeather({
  latitude: selected.latitude,
  longitude: selected.longitude,
}, { timezone: selected.timezone });
```

---

## 9. Quality Verification & Testing

The geocoding test suite is 100% deterministic and makes zero live external network calls during testing.

### Running Quality Gates
```bash
# Type-check TypeScript
npm run typecheck

# Lint rules (ESLint 9)
npm run lint

# Prettier code formatting
npm run format:check

# Run automated tests
npm test

# Build production Next.js bundle
npm run build
```

### Adding an Alternate Geocoding Provider
To register a secondary provider (e.g., Mapbox, Nominatim):
1. Implement the `GeocodingProvider` interface from `src/lib/geocoding/providers/types.ts`.
2. Register it with the provider registry:
   ```typescript
   import { getGeocodingProviderRegistry } from "@/lib/geocoding";
   getGeocodingProviderRegistry().register(new MyCustomGeocodingAdapter());
   ```
