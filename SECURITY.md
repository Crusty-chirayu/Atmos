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
- Use Supabase Auth with secure session handling compatible with Next.js.
- Protect server routes and server actions with verified sessions and ownership checks.
- RLS is mandatory for user-owned database records.
- Enforce ownership in nested resources such as messages belonging to conversations.
- Handle sign-out, expired sessions, account deletion, and revoked push subscriptions.

## 4. Input and API security
- Validate and bound all query/body/path inputs using Zod schemas (`WeatherApiQuerySchema`, `GeocodingQuerySchema`).
- Add rate limits to geocoding, weather proxy, AI, voice, and subscription endpoints:
  - Implemented `SlidingWindowRateLimiter` (`src/lib/security/rate-limit.ts`) protecting public endpoints:
    - `GET /api/weather`: 60 requests/minute per client IP.
    - `GET /api/weather/geocoding`: 100 requests/minute per client IP.
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
