# Weather Data, Domain Models, and Persistence

## 1. Weather provider strategy
- Begin with Open-Meteo as the primary provider behind a typed adapter.
- Add supplemental providers only for specific fields or coverage gaps (e.g., air quality, radar/tiles, historical data, or fallback).
- Before production, verify current API terms, attribution, commercial-use requirements, rate limits, coverage, and historical retention.
- Never assume every provider supports every location, field, or 16-day horizon.
- Do not promise official severe-weather warnings unless an appropriate official source is integrated and its geography/coverage is documented.

## 2. Normalized domain objects
Define typed, validated models for:
- `Location`: stable internal ID where persisted, name, latitude, longitude, timezone, country/region when available.
- `CurrentWeather`: temperature, feels-like, condition code, humidity, wind, pressure, visibility, precipitation, observation/retrieval timestamps, provider.
- `HourlyForecast`: timestamp with timezone context, temperature, precipitation probability/amount, wind, condition code, available metrics.
- `DailyForecast`: local date, min/max, precipitation probability/amount, sunrise/sunset where available, condition code.
- `HistoricalWeather`: timestamp/date, observed/reanalysis marker, available metrics, source, and data-quality notes.
- `WeatherResponseMeta`: provider, fetchedAt, validAt/period, cache status, stale flag, units, warnings, and coverage limitations.

Use nullable fields for unavailable values. Never substitute zero for missing data.

## 3. Units and time
- Store canonical numeric values and units in domain contracts; convert at presentation boundaries through tested conversion utilities.
- Persist user unit preferences and regional defaults.
- Store timestamps in UTC/ISO format; render using location timezone and user locale as appropriate.
- Handle daylight-saving transitions, missing local hours, and duplicate local hours.
- Never assume the server timezone equals the selected location timezone.

## 4. Cache policy
- Define separate TTLs for current observations, forecast, geocoding, historical queries, and AI context.
- Respect upstream provider terms and freshness. Make TTL configurable server-side.
- Use normalized coordinate precision appropriate to provider resolution; avoid unnecessary cache fragmentation.
- Include data source/version and query parameters in cache keys.
- Surface stale data and last-updated time. Do not silently present stale cached values as current.
- Avoid caching personalized or private AI responses in shared public caches.

## 5. Supabase entities (M4 Implementation)
Implemented in migration `supabase/migrations/20260926000000_m4_auth_and_user_data.sql`:
- `profiles` — `id UUID REFERENCES auth.users(id) ON DELETE CASCADE`, `display_name`, `avatar_url`, `created_at`, `updated_at`.
- `saved_locations` — `id UUID PRIMARY KEY`, `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`, normalized geocoding coordinates (`latitude NUMERIC(8,5)`, `longitude NUMERIC(8,5)`), `name`, `country`, `country_code`, `admin_area`, `timezone`, `provider_location_id`, `label`, `display_order`. Unique constraint `uq_saved_locations_user_coords` prevents duplicate coordinate saves per user.
- `user_preferences` — `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`, `temperature_unit` ('celsius', 'fahrenheit'), `wind_speed_unit` ('kmh', 'mph', 'ms', 'knots'), `precipitation_unit` ('mm', 'inch'), `theme` ('dark', 'light', 'system'), `reduced_motion`, `default_location_id REFERENCES saved_locations(id) ON DELETE SET NULL`.
- Automatic triggers: `set_updated_at()` for automatic timestamping; `handle_new_user()` `SECURITY DEFINER` function for idempotent bootstrap of profile and default preferences upon signup.
- Additional roadmap entities (`ai_conversations`, `notifications`, `push_subscriptions`) remain planned for M6 and M7.

## 6. RLS and integrity
- Enable RLS on every user-owned table.
- Policies must scope access to `auth.uid()` and validate parent-child ownership.
- Use server-side service role only for narrowly scoped trusted operations; never expose it to the browser.
- Add constraints, indexes, uniqueness, and foreign keys through migrations.
- Test that User A cannot read, modify, or delete User B's records.
