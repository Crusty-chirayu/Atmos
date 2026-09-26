# ATMOS Visual Audit — Screenshot Index

This directory documents the visual inspection performed during the Milestone 10 comprehensive UI/UX audit. All screenshots were captured from the active running Next.js application on `http://localhost:3000`.

---

## Screenshot Gallery & Verified Views

| Screenshot File | Route | Viewport | Verified Elements & Observations |
|---|---|---|---|
| [`home_desktop_1790403341554.png`](./screenshots/home_desktop_1790403341554.png) | `/` | Desktop (1366×768) | Brand header, 3D interactive globe canvas, metropolis quick-select chips, hero search bar with atmospheric radial cyan glow. |
| [`search_tokyo_autocomplete_1790403393376.png`](./screenshots/search_tokyo_autocomplete_1790403393376.png) | `/` | Desktop (1366×768) | Live geocoding combobox dropdown after typing "Tokyo", showing populated suggestion "Tokyo, Japan" with geographic pins. |
| [`dashboard_desktop_top_1790403451256.png`](./screenshots/dashboard_desktop_top_1790403451256.png) | `/dashboard` | Desktop (1366×768) | Dashboard header, search input, unit toggle (`°C · km/h`), theme switch, initial loading skeleton. |
| [`dashboard_desktop_loaded_1790403482484.png`](./screenshots/dashboard_desktop_loaded_1790403482484.png) | `/dashboard` | Desktop (1366×768) | Current conditions hero card (19°C, feels like 19°C, light drizzle), 24h hourly strip, 7-day outlook range bars, and 8 telemetry metric cards. |
| [`dashboard_desktop_middle1_1790403514924.png`](./screenshots/dashboard_desktop_middle1_1790403514924.png) | `/dashboard` | Desktop (1366×768) | Middle scroll view displaying 7-day outlook gradient temperature range bars and detailed meteorological telemetry grid. |
| [`dashboard_desktop_charts_radar_1790403547915.png`](./screenshots/dashboard_desktop_charts_radar_1790403547915.png) | `/dashboard` | Desktop (1366×768) | Bespoke SVG telemetry charts (temperature trend, precipitation accumulation, wind compass vectors) and top of 2D weather map. |
| [`dashboard_desktop_radar_era5_1790403578568.png`](./screenshots/dashboard_desktop_radar_era5_1790403578568.png) | `/dashboard` | Desktop (1366×768) | 2D interactive radar map with RainViewer live Doppler precipitation layer and zoom/opacity controls, plus ECMWF ERA5 historical reanalysis section. |
| [`dashboard_desktop_bottom_1790403611544.png`](./screenshots/dashboard_desktop_bottom_1790403611544.png) | `/dashboard` | Desktop (1366×768) | Historical climate reanalysis explorer with timeframe selector (`Past 7D`, `Past 14D`, `Past 30D`, `1 Year Ago`) and climate anomaly table. |
| [`dashboard_desktop_multicity_1790403647424.png`](./screenshots/dashboard_desktop_multicity_1790403647424.png) | `/dashboard` | Desktop (1366×768) | Multi-city saved locations grid showing live weather telemetry fetched in parallel via batch API. |
| [`dashboard_desktop_bottom_multicity_1790403681039.png`](./screenshots/dashboard_desktop_bottom_multicity_1790403681039.png) | `/dashboard` | Desktop (1366×768) | Full bottom footer, data provider attribution (Open-Meteo, ECMWF ERA5, RainViewer, CartoDB), and version information. |
| [`login_page_desktop_1790403732468.png`](./screenshots/login_page_desktop_1790403732468.png) | `/login` | Desktop (1366×768) | Glassmorphic sign-in card with email/password inputs, Google & GitHub OAuth buttons, and local environment notice. |
| [`login_result_1790403837367.png`](./screenshots/login_result_1790403837367.png) | `/login` | Desktop (1366×768) | Form submission state with loading indicator and validation handling. |
| [`ai_page_desktop_1790403891361.png`](./screenshots/ai_page_desktop_1790403891361.png) | `/ai` | Desktop (1366×768) | Full AI intelligence workspace with mode selector (`General Q&A`, `Trip Planning`, `Climate Comparison`), message history, and suggestion chips. |
| [`ai_workspace_opened_1790403923773.png`](./screenshots/ai_workspace_opened_1790403923773.png) | Global | Desktop (1366×768) | Floating AI assistant drawer opened over the page with preset quick prompts and microphone voice input button. |
| [`ai_assistant_response_1790403965112.png`](./screenshots/ai_assistant_response_1790403965112.png) | Global | Desktop (1366×768) | Rendered AI weather response grounded in live Open-Meteo telemetry (13.6°C, overcast, 76% humidity, 1022.5 hPa) with interactive `Listen` text-to-speech button. |
| [`homepage_mobile_view_1790404061073.png`](./screenshots/homepage_mobile_view_1790404061073.png) | `/` | Mobile (390×844) | Mobile homepage layout: responsive header navigation, full-width search input, wrapped metropolis chips, no horizontal spill. |
| [`dashboard_mobile_view_1790404116822.png`](./screenshots/dashboard_mobile_view_1790404116822.png) | `/dashboard` | Mobile (390×844) | Mobile dashboard layout: sticky header with search, horizontally scrollable section tabs (`Full Dashboard`, `Conditions`, `Charts`, `Radar`, `Historical`), touch-friendly metric cards. |
