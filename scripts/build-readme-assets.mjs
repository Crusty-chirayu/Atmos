// Generates the SVG artwork used by README.md  ->  docs/readme/*.svg
// Run:  node scripts/build-readme-assets.mjs
// Every image has its own opaque background, so it reads on GitHub light AND dark mode.
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'docs/readme';
mkdirSync(OUT, { recursive: true });

const C = {
  white: '#FFFFFF', paper: '#F6F6F3', line: '#E3E1D9', line2: '#CFCCC1',
  ink: '#111418', ink700: '#3A3F47', ink500: '#656B75',
  yellow: '#FFC928', yellowSoft: '#FFF1BF', yellowDeep: '#B98600',
  green: '#1F8A4C', blue: '#2F6FEB',
};
const SANS = "Inter, 'Segoe UI', system-ui, -apple-system, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', 'DejaVu Sans Mono', monospace";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const est = (t, size, r) => Math.round(t.length * size * r);
const monoW = (t, size = 20, sp = 0) => Math.round(t.length * (size * 0.6 + sp) - sp);
const write = (name, s) => { writeFileSync(`${OUT}/${name}`, s); console.log('wrote', `${OUT}/${name}`, (s.length / 1024).toFixed(1) + ' KB'); };

function svg(w, h, body, { title, desc, bg = C.white, style = '' }) {
  const id = 'a' + Math.abs([...title].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}">
<title id="${id}">${esc(title)}</title>${desc ? `<desc>${esc(desc)}</desc>` : ''}
<style>${style}@media (prefers-reduced-motion: reduce){*{animation:none !important}}</style>
<rect width="${w}" height="${h}" fill="${bg}"/>
${body}
</svg>
`;
}
// text helper; len forces the width so layout never depends on the viewer's font
const T = (x, y, text, { size = 24, weight = 400, fill = C.ink, anchor = 'start', len = null, font = SANS, spacing = null, extra = '' } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${len ? ` textLength="${len}" lengthAdjust="spacingAndGlyphs"` : ''}${spacing != null ? ` letter-spacing="${spacing}"` : ''} ${extra}>${esc(text)}</text>`;
const M = (x, y, text, { size = 18, fill = C.ink500, anchor = 'start', sp = 2, weight = 400 } = {}) => {
  const len = Math.round(text.length * (size * 0.6 + sp) - sp);
  return `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" textLength="${len}" lengthAdjust="spacing">${esc(text)}</text>`;
};
function wrap(text, max) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur); return lines;
}
const pill = (x, y, w, h, fill, stroke, sw = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

/* ------------------------------------------------------------------ BANNER */
function banner() {
  const W = 1600, H = 760, cx = 1308, cy = 394, r = 248;
  // wireframe globe
  let g = '';
  for (const k of [-60, -30, 0, 30, 60]) {
    const dy = r * Math.sin((k * Math.PI) / 180), rx = r * Math.cos((k * Math.PI) / 180);
    g += `<ellipse cx="${cx}" cy="${cy + dy}" rx="${rx.toFixed(1)}" ry="${(rx * 0.16).toFixed(1)}" fill="none" stroke="${C.line2}" stroke-width="2"/>`;
  }
  for (const k of [0.28, 0.56, 0.84]) g += `<ellipse cx="${cx}" cy="${cy}" rx="${(r * k).toFixed(1)}" ry="${r}" fill="none" stroke="${C.line2}" stroke-width="2"/>`;
  g += `<line x1="${cx}" x2="${cx}" y1="${cy - r}" y2="${cy + r}" stroke="${C.line2}" stroke-width="2"/>`;
  const body = `
<rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="36" fill="${C.white}" stroke="${C.line}" stroke-width="3"/>
<rect x="3" y="3" width="${W - 6}" height="14" rx="7" fill="${C.yellow}"/>

<!-- left column -->
${pill(72, 80, 338, 52, C.yellowSoft, C.yellow, 2.5)}
<circle cx="102" cy="106" r="9" fill="${C.yellow}"/>
${M(124, 113, 'AI WEATHER INTELLIGENCE', { size: 17, fill: C.ink, sp: 2.5, weight: 500 })}

${T(68, 330, 'ATMOS', { size: 230, weight: 800, len: 800, spacing: -6 })}
<circle cx="908" cy="292" r="30" fill="${C.yellow}"/>

<rect x="684" y="396" width="270" height="28" fill="${C.yellowSoft}"/>
${T(72, 440, 'Weather, understood by', { size: 52, weight: 700, len: 606 })}
${T(692, 440, 'exploring', { size: 52, weight: 700, len: 257 })}
${T(72, 504, 'not just reading.', { size: 52, weight: 700, fill: C.ink500, len: 410 })}

${T(72, 580, 'Click a real 3D Earth, ask in plain language or by voice,', { size: 26, fill: C.ink700, len: 780 })}
${T(72, 618, 'and get answers grounded in live data for exactly', { size: 26, fill: C.ink700, len: 690 })}
${T(72, 656, 'the place you’re looking at.', { size: 26, fill: C.ink700, len: 390 })}

${['NEXT.JS 16', 'REACT 19', 'THREE.JS', 'SUPABASE', 'OPEN-METEO'].reduce((acc, t) => { const w = monoW(t, 17, 2) + 34; const s = `${pill(acc.x, 690, w, 40, C.white, C.ink, 2)}${M(acc.x + w / 2, 716, t, { size: 17, fill: C.ink, anchor: 'middle', sp: 2, weight: 500 })}`; acc.s += s; acc.x += w + 12; return acc; }, { x: 72, s: '' }).s}

<!-- globe -->
<circle cx="${cx}" cy="${cy}" r="${r + 26}" fill="none" stroke="${C.yellow}" stroke-width="6" stroke-opacity=".55"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.paper}" stroke="${C.ink}" stroke-width="4"/>
<clipPath id="gc"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
<g clip-path="url(#gc)">
  ${g}
  <path d="M${cx + 40} ${cy - r} A${r} ${r} 0 0 1 ${cx + 40} ${cy + r} A${r * 0.62} ${r} 0 0 0 ${cx + 40} ${cy - r} Z" fill="${C.ink}" fill-opacity=".09"/>
</g>
<!-- marker + label -->
<circle class="pulse" cx="${cx - 40}" cy="${cy + 56}" r="16" fill="${C.yellow}" fill-opacity=".45"/>
<circle cx="${cx - 40}" cy="${cy + 56}" r="11" fill="${C.yellow}" stroke="${C.ink}" stroke-width="3"/>
<path d="M${cx - 40} ${cy + 44} L${cx - 40} ${cy - 46}" stroke="${C.ink}" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round"/>
<g transform="translate(${cx - 168} ${cy - 150})">
  <rect x="6" y="6" width="300" height="104" rx="18" fill="${C.ink}"/>
  <rect width="300" height="104" rx="18" fill="${C.white}" stroke="${C.ink}" stroke-width="3"/>
  ${M(22, 32, 'SAMPLE · BENGALURU', { size: 15, sp: 2.5 })}
  ${T(22, 86, '21°C', { size: 54, weight: 800, len: 128 })}
  ${T(166, 86, 'Clear sky', { size: 26, weight: 600, fill: C.ink700, len: 112 })}
</g>`;
  const style = `.pulse{transform-box:fill-box;transform-origin:center;animation:p 2.4s ease-out infinite}@keyframes p{0%{transform:scale(.8);opacity:.9}100%{transform:scale(2.6);opacity:0}}`;
  write('banner.svg', svg(W, H, body, { title: 'ATMOS: weather, understood by exploring, not just reading.', desc: 'AI-powered weather intelligence platform with an interactive 3D Earth, a grounded assistant and voice.', style }));
}

/* ---------------------------------------------------------------- LABELS */
function label(file, n, title, right) {
  const W = 1600, H = 120;
  const body = `
<circle cx="22" cy="58" r="12" fill="${C.yellow}"/>
${M(50, 50, `${n} /`, { size: 20, fill: C.ink500, sp: 3 })}
${T(48, 104, title, { size: 56, weight: 800, len: est(title, 56, 0.55) })}
${M(W - 4, 50, right, { size: 18, fill: C.ink500, sp: 3, anchor: 'end' })}
<line x1="0" x2="${W}" y1="116" y2="116" stroke="${C.ink}" stroke-width="3"/>
<rect x="0" y="110" width="120" height="12" fill="${C.yellow}"/>`;
  write(file, svg(W + 64, H + 8, `<g transform="translate(32 0)">${body}</g>`, { title }));
}

/* ------------------------------------------------------------------ FLOW */
function flow() {
  const W = 1600, H = 330;
  const steps = [
    ['Click the', 'globe', 'Drag, zoom and click on a real 3D Earth.'],
    ['Raycast to', 'lat / lng', 'Any point on the planet becomes real coordinates.'],
    ['Fetch the', 'weather', 'Open-Meteo data, validated, cached and timestamped.'],
    ['Sync every', 'surface', 'Dashboard, radar map and assistant share one location.'],
    ['Ask in plain', 'words or voice', 'Answers are grounded in live data for that place.'],
  ];
  const cw = 270, gap = 62, x0 = 34 + 0;
  let body = '';
  steps.forEach(([a, b, sub], i) => {
    const x = x0 + i * (cw + gap), y = 50;
    body += `<rect x="${x + 8}" y="${y + 8}" width="${cw}" height="236" rx="22" fill="${C.ink}"/>
<rect x="${x}" y="${y}" width="${cw}" height="236" rx="22" fill="${C.white}" stroke="${C.ink}" stroke-width="3"/>
<circle cx="${x + 44}" cy="${y + 46}" r="22" fill="${C.yellow}" stroke="${C.ink}" stroke-width="3"/>
${T(x + 44, y + 55, String(i + 1), { size: 24, weight: 800, anchor: 'middle' })}
${T(x + 24, y + 112, a, { size: 28, weight: 800, len: est(a, 28, 0.54) })}
${T(x + 24, y + 146, b, { size: 28, weight: 800, len: est(b, 28, 0.54) })}
${wrap(sub, 25).map((l, k) => T(x + 24, y + 184 + k * 24, l, { size: 18, fill: C.ink500 })).join('')}`;
    if (i < steps.length - 1) {
      const ax = x + cw + 8;
      body += `<line x1="${ax}" x2="${ax + gap - 18}" y1="${y + 118}" y2="${y + 118}" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>
<path d="M${ax + gap - 30} ${y + 104} L${ax + gap - 14} ${y + 118} L${ax + gap - 30} ${y + 132}" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  });
  write('flow.svg', svg(W + 40, H, body, { title: 'How ATMOS works: click the globe, raycast to coordinates, fetch the weather, sync every surface, ask in plain words or voice.' }));
}

/* -------------------------------------------------------------- FEATURES */
const glyph = {
  globe: `<circle cx="24" cy="24" r="17" fill="none" stroke="${C.ink}" stroke-width="3"/><ellipse cx="24" cy="24" rx="7" ry="17" fill="none" stroke="${C.ink}" stroke-width="3"/><line x1="7" x2="41" y1="24" y2="24" stroke="${C.ink}" stroke-width="3"/>`,
  chat: `<path d="M8 10 H40 a4 4 0 0 1 4 4 V30 a4 4 0 0 1 -4 4 H24 L14 43 V34 H8 a4 4 0 0 1 -4 -4 V14 a4 4 0 0 1 4 -4 Z" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`,
  mic: `<rect x="17" y="4" width="14" height="26" rx="7" fill="none" stroke="${C.ink}" stroke-width="3"/><path d="M10 24 a14 14 0 0 0 28 0 M24 38 V44" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`,
  chart: `<path d="M4 40 H44 M8 32 L18 20 L26 28 L40 8" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  radar: `<circle cx="24" cy="24" r="18" fill="none" stroke="${C.ink}" stroke-width="3"/><circle cx="24" cy="24" r="9" fill="none" stroke="${C.ink}" stroke-width="3"/><line x1="24" y1="24" x2="38" y2="10" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`,
  bell: `<path d="M24 5 a3 3 0 0 1 3 3 a13 13 0 0 1 10 12 V30 l4 5 H7 l4 -5 V20 a13 13 0 0 1 10 -12 a3 3 0 0 1 3 -3 Z M19 39 a5 5 0 0 0 10 0" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`,
  pin: `<path d="M24 44 C12 30 8 24 8 18 a16 16 0 0 1 32 0 c0 6 -4 12 -16 26 Z" fill="none" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="18" r="5" fill="none" stroke="${C.ink}" stroke-width="3"/>`,
  phone: `<rect x="12" y="3" width="24" height="42" rx="5" fill="none" stroke="${C.ink}" stroke-width="3"/><line x1="20" x2="28" y1="39" y2="39" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`,
};
function features() {
  const tiles = [
    ['globe', 'Interactive 3D Earth', 'Rotate, zoom and click anywhere. Raycasting turns a click into real coordinates, with clouds, day and night and city beacons.'],
    ['chat', 'Grounded AI assistant', 'Answers use live, timestamped weather for your place, not the model’s memory. Weather Q&A, trip planner and city compare.'],
    ['mic', 'Voice in, voice out', 'Browser speech recognition and synthesis, with permission handling, error states and text clean-up for natural playback.'],
    ['chart', 'Dashboard and charts', 'Current conditions, hourly and 7-day forecast, multi-city overview, and hand-built SVG charts for temperature, rain and wind.'],
    ['radar', 'Radar and history', 'Live RainViewer radar on a 2D map, plus ERA5 reanalysis history for any point on Earth, with provenance notes.'],
    ['bell', 'Alerts and push', 'Six alert rule types with de-duplication and cooldowns, an in-app notification center and standards-based Web Push.'],
    ['pin', 'Accounts and saved places', 'Supabase auth with row-level security, saved locations, unit preferences and synced AI conversations.'],
    ['phone', 'Installable PWA', 'Manifest, service worker and offline page, with stale data clearly labelled instead of passed off as live.'],
  ];
  const cw = 372, ch = 340, gap = 24, W = 4 * cw + 3 * gap + 48, H = 2 * ch + gap + 40;
  let body = '';
  tiles.forEach(([g, t, d], i) => {
    const x = 24 + (i % 4) * (cw + gap), y = 20 + Math.floor(i / 4) * (ch + gap);
    body += `<rect x="${x + 7}" y="${y + 7}" width="${cw}" height="${ch}" rx="22" fill="${C.ink}"/>
<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="22" fill="${C.white}" stroke="${C.ink}" stroke-width="3"/>
<rect x="${x + 24}" y="${y + 24}" width="72" height="72" rx="18" fill="${C.yellow}" stroke="${C.ink}" stroke-width="3"/>
<g transform="translate(${x + 36} ${y + 36})">${glyph[g]}</g>
${M(x + cw - 24, y + 48, String(i + 1).padStart(2, '0'), { size: 18, anchor: 'end', sp: 3 })}
${T(x + 24, y + 140, t, { size: 27, weight: 800, len: Math.min(est(t, 27, 0.55), cw - 48) })}
${wrap(d, 29).map((l, k) => T(x + 24, y + 182 + k * 28, l, { size: 20, fill: C.ink700 })).join('')}`;
  });
  write('features.svg', svg(W, H, body, { title: 'Features: 3D Earth, grounded AI assistant, voice, dashboard and charts, radar and history, alerts and push, accounts, installable PWA.', desc: tiles.map(([, t, d]) => `${t}: ${d}`).join(' ') }));
}

/* ----------------------------------------------------------- ARCHITECTURE */
function architecture() {
  const W = 1640, H = 900;
  const band = (y, h, name) => `<rect x="20" y="${y}" width="${W - 40}" height="${h}" rx="26" fill="${C.paper}" stroke="${C.line2}" stroke-width="2.5"/>${M(48, y + 40, name, { size: 18, fill: C.ink, sp: 4, weight: 500 })}`;
  const box = (x, y, w, h, t, sub, accent = false) => `<rect x="${x + 6}" y="${y + 6}" width="${w}" height="${h}" rx="16" fill="${C.ink}"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${accent ? C.yellowSoft : C.white}" stroke="${C.ink}" stroke-width="3"/>
${T(x + 20, y + 44, t, { size: 24, weight: 800, len: Math.min(est(t, 24, 0.55), w - 40) })}
${wrap(sub, Math.floor((w - 40) / 10.2)).map((l, k) => T(x + 20, y + 78 + k * 24, l, { size: 18, fill: C.ink700 })).join('')}`;
  const arrow = (x, y1, y2) => `<line x1="${x}" x2="${x}" y1="${y1}" y2="${y2 - 14}" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/><path d="M${x - 11} ${y2 - 24} L${x} ${y2 - 8} L${x + 11} ${y2 - 24}" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  const ctx = (y, text) => `<rect x="60" y="${y}" width="${W - 120}" height="42" rx="21" fill="${C.yellow}" stroke="${C.ink}" stroke-width="3"/>${M(W / 2, y + 28, text, { size: 18, fill: C.ink, anchor: 'middle', sp: 3, weight: 500 })}`;

  const bx = 60, bw = 360, gap = 24;
  let body = band(20, 300, 'BROWSER / PWA');
  [['Interactive globe', 'Three.js, raycasting, day and night, clouds and city beacons'], ['Dashboard and charts', 'Hourly and daily forecast, SVG charts, radar map, ERA5 history'], ['Assistant and voice', 'Chat, trip planner, city compare, speech in and out'], ['App shell', 'Next.js 16, React 19, service worker, offline page, install']]
    .forEach(([t, s], i) => { body += box(bx + i * (bw + gap), 76, bw, 140, t, s); });
  body += ctx(244, 'SHARED LOCATION CONTEXT  /  ONE SELECTION DRIVES EVERY SURFACE');

  body += arrow(W / 2 - 300, 322, 366) + arrow(W / 2 + 300, 322, 366);
  body += band(366, 270, 'SERVER / NEXT.JS ROUTE HANDLERS');
  [['Route handlers', '/api/weather, /api/ai/chat, /api/user/*, /api/cron'], ['Session proxy', 'proxy.ts refreshes Supabase sessions on every request'], ['Guardrails', 'Zod schemas, rate limits, caches, typed error codes'], ['Alert engine', 'Deterministic evaluator, de-dup keys, protected cron']]
    .forEach(([t, s], i) => { body += box(bx + i * (bw + gap), 422, bw, 140, t, s, i === 0); });

  body += arrow(W / 2 - 300, 638, 682) + arrow(W / 2 + 300, 638, 682);
  body += band(682, 200, 'SERVICES');
  const sw = 284, sg = 20;
  [['Open-Meteo', 'Forecast, ERA5, geocoding'], ['RainViewer', 'Radar tiles'], ['OpenRouter / Gemini', 'Llama 3.3 70B behind one provider interface'], ['Supabase', 'Auth, Postgres, RLS'], ['Web Push', 'VAPID delivery']]
    .forEach(([t, s], i) => { body += box(bx + i * (sw + sg), 738, sw, 120, t, s); });
  write('architecture.svg', svg(W, H, body, { title: 'ATMOS architecture: browser and PWA, Next.js server, external services.', desc: 'Browser surfaces share one location context; Next.js route handlers validate, cache and rate-limit; services are Open-Meteo, RainViewer, OpenRouter or Gemini, Supabase and Web Push.' }));
}

/* --------------------------------------------------------------- NUMBERS */
function numbers() {
  const cells = [['340+', 'AUTOMATED TESTS'], ['15+', 'API ROUTES'], ['6', 'ALERT RULE TYPES'], ['12', 'CITIES PER BATCH'], ['3', 'SQL MIGRATIONS'], ['1940+', 'ERA5 HISTORY']];
  const W = 1600, cw = 256, H = 250;
  let body = '';
  cells.forEach(([big, lab], i) => {
    const x = 20 + i * (cw + 12), y = 24;
    body += `<rect x="${x + 6}" y="${y + 6}" width="${cw}" height="190" rx="20" fill="${C.ink}"/>
<rect x="${x}" y="${y}" width="${cw}" height="190" rx="20" fill="${i % 2 ? C.white : C.yellow}" stroke="${C.ink}" stroke-width="3"/>
${T(x + cw / 2, y + 100, big, { size: 84, weight: 800, anchor: 'middle', len: Math.min(est(big, 84, 0.58), cw - 40) })}
${M(x + cw / 2, y + 156, lab, { size: 16, fill: C.ink, anchor: 'middle', sp: 2.5, weight: 500 })}`;
  });
  write('numbers.svg', svg(W, H, body, { title: 'By the numbers: 340+ automated tests, 15+ API routes, 6 alert rule types, 12 cities per batch, 3 SQL migrations, ERA5 history from 1940.' }));
}

/* ----------------------------------------------------------------- STACK */
function stack() {
  const groups = [
    ['APPLICATION', ['Next.js 16', 'React 19', 'TypeScript 5', 'Tailwind CSS 4', 'Zod 4']],
    ['3D AND VISUALS', ['Three.js', 'Custom SVG charts', 'Web Speech API', 'react-markdown']],
    ['DATA AND AI', ['Open-Meteo', 'ERA5', 'RainViewer', 'OpenRouter', 'Llama 3.3 70B', 'Gemini adapter']],
    ['BACKEND', ['Supabase', 'Postgres + RLS', 'Web Push (VAPID)', 'Cron endpoint']],
    ['QUALITY', ['tsx test runner', 'Playwright', 'ESLint 9', 'Prettier', 'GitHub Actions']],
    ['DELIVERY', ['Vercel', 'PWA', 'Service worker']],
  ];
  const colW = 500, gap = 50, W = 3 * colW + 2 * gap + 64;
  const hs = groups.map(([, it]) => { let x = 0, lines = 1; it.forEach((t) => { const w = monoW(t, 19) + 32; if (x + w > colW) { x = 0; lines++; } x += w + 10; }); return 56 + lines * 52; });
  const rows = [Math.max(...hs.slice(0, 3)), Math.max(...hs.slice(3))];
  const H = rows[0] + rows[1] + 30 + 56;
  let body = '';
  groups.forEach(([t, items], i) => {
    const gx = 32 + (i % 3) * (colW + gap), gy = 28 + (i < 3 ? 0 : rows[0] + 30);
    body += `<g transform="translate(${gx} ${gy})">${M(0, 22, t, { size: 18, sp: 3, fill: C.ink })}<line x1="0" x2="${colW}" y1="36" y2="36" stroke="${C.ink}" stroke-width="3"/>`;
    let x = 0, y = 54;
    items.forEach((it, k) => {
      const w = monoW(it, 19) + 32;
      if (x + w > colW) { x = 0; y += 52; }
      body += `${pill(x, y, w, 40, k === 0 ? C.yellow : C.white, C.ink, 2.5)}${M(x + w / 2, y + 26, it, { size: 19, sp: 0, fill: C.ink, anchor: 'middle', weight: 500 })}`;
      x += w + 10;
    });
    body += '</g>';
  });
  write('stack.svg', svg(W, H, body, { title: 'Technology stack', desc: groups.map(([t, it]) => `${t}: ${it.join(', ')}`).join('. ') }));
}

/* ---------------------------------------------------------------- BUTTONS */
function button(file, text, fill) {
  const W = 300, H = 76;
  write(file, svg(W, H, `<rect x="6" y="8" width="288" height="64" rx="32" fill="${C.ink}"/><rect x="2" y="2" width="288" height="64" rx="32" fill="${fill}" stroke="${C.ink}" stroke-width="3"/>${M(146, 43, text, { size: 22, fill: C.ink, anchor: 'middle', sp: 1, weight: 700 })}`, { title: text, bg: C.white }));
}

/* ----------------------------------------------------------------- FOOTER */
function footer() {
  const W = 1600, H = 210;
  const body = `<rect width="${W}" height="${H}" fill="${C.yellow}"/><rect y="${H - 12}" width="${W}" height="12" fill="${C.ink}"/>
${T(48, 104, 'Weather, understood by exploring.', { size: 64, weight: 800, len: est('Weather, understood by exploring.', 64, 0.53) })}
${M(48, 160, 'MIT LICENSED / BUILT BY CHIRAYU BABU JAYSAWAL / BENGALURU', { size: 18, fill: C.ink, sp: 3, weight: 500 })}
${M(W - 48, 160, 'ATMOS', { size: 18, fill: C.ink, sp: 6, anchor: 'end', weight: 700 })}`;
  write('footer.svg', svg(W, H, body, { title: 'ATMOS. Weather, understood by exploring. MIT licensed. Built by Chirayu Babu Jaysawal in Bengaluru.', bg: C.yellow }));
}

/* ------------------------------------------------------------------- RUN */
banner();
label('h-idea.svg', '01', 'The idea', 'EXPLORE, THEN ASK');
label('h-see.svg', '02', 'See it', 'LIVE SCREENSHOTS');
label('h-inside.svg', '03', 'What’s inside', 'EIGHT BUILDING BLOCKS');
label('h-built.svg', '04', 'How it’s built', 'ARCHITECTURE');
label('h-numbers.svg', '05', 'By the numbers', 'MEASURED FROM THE REPO');
label('h-run.svg', '06', 'Run it', 'LOCAL SETUP');
label('h-quality.svg', '07', 'Quality and safety', 'HOW IT STAYS HONEST');
flow();
features();
architecture();
numbers();
stack();
button('btn-live.svg', 'LIVE APP ↗', C.yellow);
button('btn-repo.svg', 'SOURCE ↗', C.white);
button('btn-docs.svg', 'DOCS ↗', C.white);
footer();