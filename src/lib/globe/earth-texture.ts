/**
 * Procedural Earth Texture Generator for Three.js.
 *
 * Generates a cinematic, high-resolution equirectangular planetary texture
 * containing oceans, continents, coastlines, and geographic graticules.
 *
 * Completely self-contained, offline, and license-free.
 */

/**
 * Simplified equirectangular coordinate polygons for Earth's primary landmasses.
 * Coordinates are [longitude, latitude] in degrees (-180..180, -90..90).
 */
const CONTINENT_POLYGONS: [number, number][][] = [
  // North America
  [
    [-168, 65],
    [-140, 70],
    [-120, 75],
    [-85, 70],
    [-60, 50],
    [-65, 44],
    [-75, 35],
    [-80, 25],
    [-90, 20],
    [-100, 22],
    [-105, 28],
    [-118, 34],
    [-124, 48],
    [-135, 58],
    [-165, 60],
  ],
  // Greenland
  [
    [-50, 60],
    [-20, 70],
    [-30, 82],
    [-60, 82],
    [-55, 72],
  ],
  // South America
  [
    [-75, 10],
    [-60, 10],
    [-35, -5],
    [-38, -15],
    [-45, -23],
    [-55, -35],
    [-68, -54],
    [-75, -45],
    [-70, -20],
    [-80, -5],
  ],
  // Europe
  [
    [-10, 36],
    [5, 43],
    [15, 45],
    [30, 40],
    [40, 55],
    [30, 60],
    [25, 70],
    [10, 62],
    [0, 50],
    [-5, 43],
  ],
  // Scandinavia / Britain
  [
    [-5, 50],
    [2, 52],
    [-3, 58],
    [-5, 55],
  ],
  // Africa
  [
    [-17, 30],
    [10, 37],
    [32, 31],
    [43, 12],
    [50, 10],
    [40, -5],
    [35, -20],
    [28, -34],
    [18, -34],
    [12, -15],
    [9, 5],
    [-15, 12],
  ],
  // Asia
  [
    [40, 40],
    [50, 30],
    [60, 25],
    [75, 10],
    [85, 20],
    [100, 5],
    [105, 20],
    [120, 25],
    [130, 35],
    [142, 50],
    [170, 65],
    [140, 72],
    [90, 76],
    [60, 70],
    [50, 55],
  ],
  // India Subcontinent
  [
    [70, 25],
    [88, 22],
    [80, 8],
    [75, 12],
  ],
  // Australia
  [
    [114, -22],
    [125, -15],
    [135, -12],
    [145, -15],
    [153, -28],
    [150, -38],
    [138, -35],
    [115, -34],
  ],
  // Antarctica
  [
    [-180, -70],
    [-120, -75],
    [-60, -65],
    [0, -70],
    [60, -68],
    [120, -66],
    [180, -70],
    [180, -90],
    [-180, -90],
  ],
];

/**
 * Creates an HTMLCanvasElement with the rendered procedural Earth map.
 * Width is 2048px, Height is 1024px (standard 2:1 equirectangular).
 */
export function createProceduralEarthCanvas(
  width = 2048,
  height = 1024
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // 1. Deep Oceanic Base with atmospheric gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, "#050914");
  oceanGrad.addColorStop(0.3, "#081226");
  oceanGrad.addColorStop(0.5, "#0b172f");
  oceanGrad.addColorStop(0.7, "#081226");
  oceanGrad.addColorStop(1, "#050914");
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Helper to convert (lon, lat) to (canvasX, canvasY)
  const toCanvasX = (lon: number) => ((lon + 180) / 360) * width;
  const toCanvasY = (lat: number) => ((90 - lat) / 180) * height;

  // 2. Geographic Graticules (Latitude & Longitude grid lines)
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0, 212, 255, 0.08)";

  // Latitude lines every 30 degrees
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = toCanvasY(lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Longitude lines every 30 degrees
  for (let lon = -150; lon <= 180; lon += 30) {
    const x = toCanvasX(lon);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Equator highlight
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0, 212, 255, 0.16)";
  const equatorY = toCanvasY(0);
  ctx.beginPath();
  ctx.moveTo(0, equatorY);
  ctx.lineTo(width, equatorY);
  ctx.stroke();

  // 3. Render Continents
  ctx.fillStyle = "#142238"; // Dark landmass
  ctx.strokeStyle = "#38deff"; // Glowing coastline cyan
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";

  for (const polygon of CONTINENT_POLYGONS) {
    if (polygon.length < 3) continue;

    ctx.beginPath();
    const firstPoint = polygon[0];
    if (firstPoint) {
      ctx.moveTo(toCanvasX(firstPoint[0]), toCanvasY(firstPoint[1]));
    }

    for (let i = 1; i < polygon.length; i++) {
      const pt = polygon[i];
      if (pt) {
        ctx.lineTo(toCanvasX(pt[0]), toCanvasY(pt[1]));
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Subtle continent interior glow
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(126, 235, 255, 0.4)";
    ctx.stroke();
  }

  // 4. Stippling / Urban Light Points
  ctx.fillStyle = "rgba(255, 230, 150, 0.6)";
  const majorHubs: [number, number][] = [
    [139.65, 35.67], // Tokyo
    [-0.12, 51.5], // London
    [-74.0, 40.71], // New York
    [151.2, -33.86], // Sydney
    [31.23, 30.04], // Cairo
    [-46.63, -23.55], // São Paulo
    [72.87, 19.07], // Mumbai
    [2.35, 48.85], // Paris
    [103.81, 1.35], // Singapore
  ];

  for (const [lon, lat] of majorHubs) {
    const cx = toCanvasX(lon);
    const cy = toCanvasY(lat);

    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6);
    radGrad.addColorStop(0, "rgba(255, 220, 100, 0.9)");
    radGrad.addColorStop(0.5, "rgba(255, 200, 80, 0.4)");
    radGrad.addColorStop(1, "rgba(255, 200, 80, 0)");

    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}
