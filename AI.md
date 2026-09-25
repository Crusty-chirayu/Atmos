# ATMOS AI, Gemini, Voice, and Trip Planning

## 1. Product role
Gemini provides weather-grounded explanation, comparison, planning, and conversational interaction. Weather truth comes from ATMOS's provider services, not the language model's unaided memory.

## 2. Provider architecture
- Use a server-side Gemini adapter behind an internal `AIProvider` interface.
- Keep model names and provider-specific request formats in server configuration.
- Keep the adapter replaceable without changing UI or domain services.
- Verify current Gemini model availability, free-tier eligibility, quotas, retention, and terms during implementation; free access is not guaranteed or unlimited.
- Apply per-user and per-IP quotas, request size limits, concurrency controls, and graceful quota messaging.

## 3. Weather grounding flow
1. Authenticate or apply public-preview restrictions.
2. Validate user question and selected location.
3. Retrieve appropriate current/forecast/history data through trusted weather services.
4. Build a compact, timestamped context with source, timezone, units, and missing-data notes.
5. Ask Gemini to answer only from supplied weather context for current/forecast claims.
6. Validate response shape and render source/freshness context where useful.
7. Persist conversation only for authenticated users and according to retention policy.

If required data is unavailable, the assistant must say so and offer a supported alternative. Never invent conditions, warnings, provider citations, or exact forecast confidence.

## 4. Prompt and tool safety
- Treat user prompts, retrieved text, and provider content as untrusted.
- System instructions and tool authorization remain server-controlled.
- The model must not access arbitrary URLs, secrets, databases, or user records without explicit server-authorized tools.
- Tool calls must have strict schemas, allowlists, authorization, timeouts, and output limits.
- Do not allow prompt text to bypass quotas, access controls, or data boundaries.
- Do not execute generated code or SQL from the model.

## 5. AI capabilities
- Conversational weather Q&A grounded in selected location.
- Compare locations and forecast windows.
- Explain forecast metrics and uncertainty in plain language.
- Trip planning using dates, destinations, and available forecasts; clearly distinguish forecast from climatology.
- Personalized recommendations based on user-configured preferences; explain material assumptions.
- Summarize historical patterns only when historical data is available.
- Floating assistant for quick context-aware questions and dedicated workspace for extended sessions.

## 6. Voice
- Define speech-to-text and text-to-speech interfaces independently of Gemini.
- Select provider/browser implementation after current browser support, privacy, cost, and latency review.
- Request microphone permission only after user action; show recording state and an immediate stop control.
- No recording or playback without clear user action. Provide text alternatives and captions/transcripts.
- Handle denied permission, unsupported browser, network failure, and interrupted audio.

## 7. Honest UX
- Mark AI-generated interpretations as AI insights.
- Show the relevant weather data timestamp/source when claims depend on live data.
- State when data is stale, incomplete, or beyond a reliable forecast horizon.
- Never frame the platform as a substitute for official emergency alerts or professional advice.
