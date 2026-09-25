# ATMOS Security, Privacy, and Abuse Prevention

## 1. Threat model
Protect account data, API credentials, user location history, AI conversations, push subscriptions, and service availability. Consider unauthenticated scraping, credential abuse, prompt injection, quota exhaustion, cross-user access, malicious input, and provider outages.

## 2. Secrets
- Server-only: Gemini key, Supabase service role, push private keys, private provider credentials.
- Public client keys must be explicitly designed for browser exposure and restricted where supported.
- Validate environment variables; fail closed for privileged operations.
- Never log authorization headers, tokens, push keys, full private prompts, or secrets.
- Commit only `.env.example`; add actual env files to ignore rules.

## 3. Authentication and authorization
- Implemented Supabase Auth with secure session handling via `@supabase/ssr` and Next.js 16 `src/proxy.ts`.
- Server routes (`/api/user/*`) derive user identity strictly from verified server-side session cookies via `getAuthenticatedUser()`. Never trust client-supplied owner or user IDs.
- Mandatory PostgreSQL Row Level Security (RLS) enabled on all user-owned tables (`profiles`, `saved_locations`, `user_preferences`), scoping operations to `auth.uid() = user_id` / `auth.uid() = id`.
- Explicit revocation of table privileges from the `anon` database role, ensuring anonymous visitors cannot read or mutate private user records.
- Open-redirect protection implemented in `validateRedirectTarget()` (`src/app/api/auth/callback/route.ts`), blocking absolute URLs, protocol-relative attacks (`//evil.com`), and Windows backslash tricks (`/\evil.com`).
- Verified account deletion workflow (`DELETE /api/user/account`) enforcing cascading data deletion and privileged `auth.admin.deleteUser` execution via server-only service role credentials.
- Graceful degradation: public weather queries (`/api/weather`, `/api/weather/geocoding`) operate independently and never require authentication or Supabase availability.

## 4. Input and API security
- Validate and bound all query/body/path inputs using Zod schemas (`WeatherApiQuerySchema`, `GeocodingQuerySchema`, `HistoricalApiQuerySchema`, `BatchWeatherQuerySchema`).
- Add rate limits to geocoding, weather proxy, batch queries, historical reanalysis, AI, voice, and subscription endpoints:
  - Implemented `SlidingWindowRateLimiter` (`src/lib/security/rate-limit.ts`) protecting public endpoints:
    - `GET /api/weather`: 60 requests/minute per client IP.
    - `GET /api/weather/geocoding`: 100 requests/minute per client IP.
    - `GET /api/weather/historical`: 30 requests/minute per client IP (bounded to max 90 days query window, >= 1940).
    - `POST /api/weather/batch`: 30 requests/minute per client IP (bounded to 1..12 locations, maxConcurrency: 5).
  - Safe client IP resolution with `x-forwarded-for`, `x-real-ip`, and `cf-connecting-ip` inspection.
  - Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.
  - Exceeded quotas return HTTP 429 Too Many Requests with a `Retry-After` header and sanitized error payload.
- Apply request timeouts, body-size limits, and bounded retries.
- Use CSRF protections appropriate to the authentication/session mechanism.
- Set secure headers and an appropriate Content Security Policy, accounting for map tiles and WebGL assets.
- Restrict CORS to known origins where cross-origin APIs exist.
- Return sanitized errors without stack traces or provider internals.


## 5. Privacy
- Explain why location, microphone, and notification permissions are requested.
- Ask for permissions only when the user invokes the feature.
- Store only required location and conversation data; provide controls to remove saved locations and conversations.
- Document retention and deletion behavior.
- Do not sell user data or use private conversations for unrelated purposes.
- Avoid sending unnecessary personal profile data to Gemini.

## 6. AI-specific controls
- Treat prompt injection as untrusted input.
- Use server-owned system prompts and narrowly scoped tools.
- Prevent cross-user retrieval and tool access.
- Limit output size and tool-call count.
- Test requests asking for secrets, unauthorized records, or unsupported emergency claims.

## 7. Notification security
- Validate push subscription payloads and protect subscription key material.
- Verify ownership when registering or deleting subscriptions.
- Deduplicate alerts and prevent unbounded fan-out.
- Provide unsubscribe and notification preference controls.
