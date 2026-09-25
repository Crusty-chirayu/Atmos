# ATMOS UI/UX and Visual Direction

## 1. Experience target
Premium, cinematic, immersive, highly responsive, and usable. The interface should feel like an instrument for exploring the atmosphere, not a generic weather template.

## 2. Visual system
- Dark-first design with a fully designed light mode; both must maintain contrast and visual hierarchy.
- Deep atmospheric surfaces, controlled luminous accents, layered depth, refined typography, and restrained glass effects.
- Avoid excessive blur, low-contrast translucent text, indiscriminate gradients, and decorative clutter.
- Define design tokens for color, typography, spacing, radii, elevation, motion, and responsive breakpoints.
- Use a consistent icon family and coherent icon sizing/stroke.

## 3. Experience hierarchy
1. Hero: selected location, current conditions, local time, weather scene, primary action, astronomical daylight cycle.
2. Section Navigation: segmented controls for "All", "Conditions", "Telemetry Charts", "2D Radar", "Historical ERA5", and "Multi-City" overviews.
3. Essential forecast: temperature range, precipitation probability, wind, humidity, visibility and other available metrics.
4. Forecast exploration: hourly and daily timeline, interactive vector charts (temperature Bézier splines, dual-axis precipitation, wind velocity vectors, barometric pressure).
5. Maps & Overlays: 2D Web Mercator slippy tile map with live RainViewer Doppler radar overlay and Three.js 3D globe toggle; accessible non-map summaries.
6. Historical Weather Explorer: ECMWF ERA5 reanalysis interface with statistical cards (mean temp, record high/low, total precipitation, max gust) and provenance disclosures.
7. Multi-City Overview: live condition cards for saved locations or global metropolises with 1-click jump and bookmark toggles.
8. AI: floating assistant entry point and dedicated workspace.
9. Alerts and settings.

Do not force every metric into the first viewport. Use progressive disclosure and purposeful transitions.

## 4. Motion language
- Motion: component transitions, layout changes, gestures, shared-element-like transitions where stable.
- GSAP: orchestrated hero sequences and complex timelines; avoid competing animation owners on the same element.
- R3F/Three.js: atmospheric particles, globe, clouds, and weather scenes.
- Establish motion tokens for duration, easing, distance, and intensity.
- Animate state changes, not every element continuously. Avoid motion that delays access to information.
- Respect `prefers-reduced-motion`; provide a static or low-motion scene mode.
- Pause or reduce offscreen, hidden-tab, and low-power animations.
- Avoid scroll-jacking. Scroll-triggered effects must not interfere with normal scrolling or keyboard navigation.

## 5. Responsive and adaptive behavior
- Design mobile layouts intentionally, not as a compressed desktop layout.
- Mobile: prioritize readable conditions, thumb-reachable controls, efficient search, compact forecast, and lightweight scene quality.
- Tablet: adapt navigation and data density.
- Desktop: support expansive cinematic hero, map exploration, and richer multi-panel analysis.
- Test narrow viewport, landscape mobile, zoom, and large text settings.

## 6. Accessibility
- Semantic landmarks and heading hierarchy.
- Full keyboard operation, visible focus, focus management for dialogs and chat.
- Accessible names and status announcements for dynamic weather updates.
- Do not communicate weather state through color alone.
- Provide text equivalents for map and animated scene information.
- Contrast checked in both themes.
- Respect reduced motion and audio preferences; no unsolicited sound.
- Microphone and notification permissions requested only after a clear user action with an explanation.

## 7. Required UI states
Every data-backed component must support loading, empty, success, stale, error, offline, and permission-denied states as applicable. Skeletons must match final geometry and avoid layout shifts. Errors need retry or a clear next action.

## 8. Visual QA
Use Playwright screenshots at documented viewports and compare against approved references. Inspect actual browser output; do not mark visual work done based only on source-code review.
