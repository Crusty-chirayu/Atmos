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
## 8. Implementation Status (M6)
- **Adapter**: `src/lib/ai/providers/gemini/adapter.ts` (`gemini-2.0-flash`, REST API, 12s timeout, AbortSignal, HTTP 429 quota handling, unconfigured preview mode).
- **Grounding Engine**: `src/lib/ai/context/grounding.ts` (`WeatherGroundingSnapshot` synthesizing Open-Meteo current telemetry, 24h hourly curve, and 7d outlook).
- **Persistence**: `supabase/migrations/20260926010000_m6_ai_conversations.sql` (`ai_conversations`, `ai_messages` with strict RLS and user isolation).
- **UI Surfaces**: Full-screen workspace (`/ai`, `AiWorkspace`) with Q&A, Trip Planner, and City Compare modes; ambient floating assistant (`FloatingAiAssistant`).
- **Voice Controls**: Zero-dependency native Web Speech API (`SpeechRecognition` + `SpeechSynthesis` in `voice-controls.tsx`).
- **Documentation**: Detailed guide in `docs/GEMINI_AI_PLATFORM.md`.
