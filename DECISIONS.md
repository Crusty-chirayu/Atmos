# ATMOS Decision Register

Record material decisions with date, status, rationale, and consequences. Do not silently reverse accepted decisions.

| ID | Decision | Status |
|---|---|---|
| D-001 | Product name is ATMOS | Locked |
| D-002 | Dark-first premium theme plus complete light mode | Locked |
| D-003 | Hybrid dashboard direction, with cinematic immersive landing as the opening experience | Locked; cinematic hero takes priority |
| D-004 | Full AI platform: chat, voice, dashboard intelligence, trip planning, personalized recommendations, natural-language search | Locked |
| D-005 | Open-Meteo primary weather source with supplemental provider adapters | Locked direction; verify terms/coverage |
| D-006 | Next.js full-stack TypeScript | Locked |
| D-007 | Supabase Auth; email/password and optional Google sign-in | Locked |
| D-008 | Interactive 2D map and 3D globe | Locked |
| D-009 | Gemini API, free tier where eligible, server-side and provider-swappable | Locked direction; quotas/terms must be verified |
| D-010 | Full voice assistant, speech provider selected during implementation | Locked |
| D-011 | Full configurable notification system, in-app and browser push where supported | Locked |
| D-012 | Vercel + Supabase hosting | Locked |
| D-013 | Global weather coverage | Locked |
| D-014 | Up to 16-day forecasts plus historical weather where supported | Locked |
| D-015 | Regional unit defaults with manual overrides | Locked |
| D-016 | Mapbox + MapLibre hybrid strategy | Locked direction; exact provider split requires licensing/cost review |
| D-017 | Motion + Three.js/R3F + GSAP | Locked |
| D-018 | Cinematic public homepage with interactive live weather preview | Locked |
| D-019 | Adaptive hybrid realistic/stylized weather rendering | Locked |
| D-020 | Floating AI assistant plus dedicated AI workspace | Locked |
| D-021 | Mobile-first adaptive PWA | Recommended default, accepted as current blueprint |
| D-022 | Three.js client-only dynamic loading for 3D globe with procedural vector Earth texture and 2.5D CSS SVG fallback | Locked (M3) |
| D-023 | In-memory sliding window rate limiting for public endpoints returning 429 and Retry-After headers | Locked (M3) |
| D-024 | `@supabase/ssr` with Next.js 16 `src/proxy.ts` cookie session management, separating browser, server, and administrative tiers | Locked (M4) |
| D-025 | PostgreSQL Row Level Security on `profiles`, `saved_locations`, and `user_preferences` with `anon` privileges revoked and server-derived identity enforcement | Locked (M4) |
| D-026 | Non-blocking unconfigured Supabase fallback: missing Supabase credentials gracefully disable only account persistence without blocking anonymous weather exploration | Locked (M4) |
| D-027 | Zero-dependency bespoke SVG vector weather charts instead of external charting packages (chart.js/recharts), minimizing bundle size, eliminating SSR hydration mismatches, and matching ATMOS design tokens | Locked (M5) |
| D-028 | 2D Slippy Map with CartoDB Dark Matter / Positron tiles and live RainViewer Doppler precipitation radar layer with dynamic frame lookup and honest provenance notices | Locked (M5) |
| D-029 | Bounded concurrency worker pool (maxConcurrency: 5) and error isolation for batch weather endpoint (`POST /api/weather/batch`), preventing upstream request bursts and isolating partial location failures | Locked (M5) |
| D-030 | Server-side Gemini 2.0 REST adapter (`gemini-2.0-flash`) with mandatory meteorological grounding via `WeatherGroundingSnapshot` and anti-hallucination system instructions | Locked (M6) |
| D-031 | Native Web Speech API integration (`SpeechRecognition` & `SpeechSynthesis`) for zero-dependency hands-free voice I/O, audio narration, and graceful browser capability degradation | Locked (M6) |
| D-032 | Multi-turn AI conversation persistence in Supabase (`ai_conversations`, `ai_messages`) with strict RLS (`auth.uid() = user_id`) and non-blocking unconfigured preview mode | Locked (M6) |
