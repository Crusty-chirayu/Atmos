/**
 * Procedural Earth Texture Generator for Three.js.
 *
 * Generates an equirectangular planetary texture with natural
 * earth-toned landmasses, vibrant ocean blues, vegetation greens,
 * arid desert plateaus, and polar ice caps.
 *
 * Used as a dependable, zero-dependency offline fallback.
 */

// Accurate equirectangular coordinate polygons for Earth's primary landmasses
const DETAILED_CONTINENTS: {
  points: [number, number][];
  type: "land" | "desert" | "ice";
}[] = [
  // North America
  {
    type: "land",
    points: [
      [-168, 65],
      [-150, 68],
      [-135, 70],
      [-120, 72],
      [-100, 70],
      [-80, 65],
      [-65, 58],
      [-58, 48],
      [-65, 43],
      [-70, 42],
      [-76, 36],
      [-81, 25],
      [-88, 21],
      [-97, 26],
      [-105, 23],
      [-110, 30],
      [-117, 33],
      [-123, 38],
      [-125, 49],
      [-132, 54],
      [-140, 60],
      [-152, 60],
      [-162, 55],
      [-168, 65],
    ],
  },
  // North American Southwest Desert
  {
    type: "desert",
    points: [
      [-115, 36],
      [-105, 38],
      [-100, 32],
      [-103, 26],
      [-111, 28],
      [-115, 36],
    ],
  },
  // Greenland (Ice Cap)
  {
    type: "ice",
    points: [
      [-52, 60],
      [-42, 60],
      [-25, 68],
      [-20, 76],
      [-28, 83],
      [-55, 83],
      [-60, 76],
      [-52, 60],
    ],
  },
  // Central America
  {
    type: "land",
    points: [
      [-90, 16],
      [-84, 15],
      [-83, 10],
      [-77, 8],
      [-80, 8],
      [-85, 12],
      [-90, 16],
    ],
  },
  // South America
  {
    type: "land",
    points: [
      [-76, 12],
      [-62, 10],
      [-50, 0],
      [-35, -5],
      [-35, -12],
      [-40, -22],
      [-48, -28],
      [-53, -34],
      [-65, -42],
      [-67, -54],
      [-75, -50],
      [-73, -40],
      [-71, -30],
      [-76, -15],
      [-81, -5],
      [-77, 5],
      [-76, 12],
    ],
  },
  // Europe
  {
    type: "land",
    points: [
      [-9, 37],
      [0, 38],
      [15, 40],
      [25, 38],
      [30, 42],
      [32, 47],
      [28, 55],
      [22, 55],
      [14, 54],
      [8, 54],
      [2, 51],
      [-4, 48],
      [-8, 43],
      [-9, 37],
    ],
  },
  // Scandinavia
  {
    type: "land",
    points: [
      [5, 58],
      [10, 56],
      [18, 56],
      [28, 62],
      [30, 70],
      [20, 71],
      [12, 66],
      [5, 62],
      [5, 58],
    ],
  },
  // British Isles (UK & Ireland)
  {
    type: "land",
    points: [
      [-5, 50],
      [1, 51],
      [1, 54],
      [-2, 58],
      [-5, 58],
      [-4, 54],
      [-5, 50],
    ],
  },
  // Africa (Main & Tropical)
  {
    type: "land",
    points: [
      [-17, 32],
      [-5, 36],
      [10, 37],
      [25, 32],
      [33, 31],
      [43, 12],
      [51, 12],
      [42, -2],
      [38, -15],
      [32, -28],
      [26, -34],
      [17, -34],
      [12, -18],
      [8, 4],
      [-5, 5],
      [-15, 12],
      [-17, 22],
      [-17, 32],
    ],
  },
  // Sahara Desert
  {
    type: "desert",
    points: [
      [-12, 28],
      [5, 32],
      [28, 30],
      [33, 26],
      [32, 18],
      [18, 16],
      [-5, 18],
      [-12, 28],
    ],
  },
  // Arabian Peninsula
  {
    type: "desert",
    points: [
      [36, 28],
      [44, 30],
      [54, 25],
      [59, 22],
      [54, 16],
      [45, 12],
      [42, 16],
      [36, 28],
    ],
  },
  // Eurasia / Siberia / Russia
  {
    type: "land",
    points: [
      [30, 55],
      [45, 52],
      [60, 55],
      [75, 52],
      [90, 52],
      [110, 50],
      [130, 48],
      [140, 54],
      [160, 58],
      [175, 65],
      [170, 72],
      [140, 73],
      [105, 75],
      [75, 72],
      [50, 68],
      [30, 60],
      [30, 55],
    ],
  },
  // Central Asia
  {
    type: "desert",
    points: [
      [50, 45],
      [65, 45],
      [85, 45],
      [105, 42],
      [95, 36],
      [70, 35],
      [55, 38],
      [50, 45],
    ],
  },
  // Indian Subcontinent
  {
    type: "land",
    points: [
      [68, 24],
      [72, 32],
      [80, 32],
      [88, 26],
      [85, 18],
      [80, 8],
      [76, 10],
      [72, 18],
      [68, 24],
    ],
  },
  // East Asia (China)
  {
    type: "land",
    points: [
      [100, 22],
      [110, 20],
      [118, 24],
      [122, 32],
      [120, 38],
      [128, 42],
      [122, 46],
      [112, 42],
      [102, 35],
      [100, 22],
    ],
  },
  // Southeast Asia
  {
    type: "land",
    points: [
      [98, 18],
      [105, 20],
      [108, 12],
      [104, 8],
      [100, 4],
      [98, 10],
      [98, 18],
    ],
  },
  // Japan
  {
    type: "land",
    points: [
      [130, 32],
      [134, 34],
      [140, 36],
      [142, 42],
      [140, 44],
      [136, 38],
      [130, 32],
    ],
  },
  // Indonesia / Maritime Continent
  {
    type: "land",
    points: [
      [96, 4],
      [106, -6],
      [116, -8],
      [124, -8],
      [128, -3],
      [118, 2],
      [104, 1],
      [96, 4],
    ],
  },
  // Australia (Temperate Coastlines)
  {
    type: "land",
    points: [
      [114, -22],
      [122, -18],
      [130, -12],
      [136, -12],
      [142, -11],
      [148, -20],
      [153, -28],
      [150, -37],
      [140, -38],
      [134, -34],
      [125, -34],
      [115, -34],
      [114, -22],
    ],
  },
  // Australian Outback (Arid Center)
  {
    type: "desert",
    points: [
      [120, -22],
      [138, -20],
      [142, -26],
      [138, -30],
      [125, -30],
      [120, -22],
    ],
  },
  // New Zealand
  {
    type: "land",
    points: [
      [168, -46],
      [174, -42],
      [178, -38],
      [174, -36],
      [172, -42],
      [168, -46],
    ],
  },
  // Antarctica (Continental Ice Sheet)
  {
    type: "ice",
    points: [
      [-180, -65],
      [-120, -72],
      [-60, -64],
      [-40, -74],
      [0, -68],
      [60, -66],
      [120, -65],
      [160, -68],
      [180, -65],
      [180, -90],
      [-180, -90],
      [-180, -65],
    ],
  },
  // Arctic Polar Ice Cap
  {
    type: "ice",
    points: [
      [-180, 80],
      [-120, 82],
      [-60, 80],
      [0, 81],
      [60, 82],
      [120, 80],
      [180, 80],
      [180, 90],
      [-180, 90],
      [-180, 80],
    ],
  },
];

/**
 * Creates an equirectangular procedural Earth canvas with natural
 * blue oceans, verdant continents, desert biomes, and polar ice caps.
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

  // 1. Natural Vibrant Oceans (Deep Blue with Tropical Shallow Shading)
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, "#194d80"); // Subpolar Arctic blue
  oceanGrad.addColorStop(0.2, "#185ea6"); // North Atlantic/Pacific
  oceanGrad.addColorStop(0.5, "#1e6bb8"); // Tropical Equatorial azure
  oceanGrad.addColorStop(0.8, "#185ea6"); // Southern Oceans
  oceanGrad.addColorStop(1, "#194d80"); // Antarctic coastal blue

  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Coordinate converter: [lon, lat] in degrees -> canvas [x, y]
  const toX = (lon: number) => ((lon + 180) / 360) * width;
  const toY = (lat: number) => ((90 - lat) / 180) * height;

  // 2. Faint aeronautical graticules (subtle 30° grid lines)
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";

  // Latitude lines (-60 to +60)
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = toY(lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Longitude lines
  for (let lon = -150; lon <= 180; lon += 30) {
    const x = toX(lon);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Equator line
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  const eqY = toY(0);
  ctx.beginPath();
  ctx.moveTo(0, eqY);
  ctx.lineTo(width, eqY);
  ctx.stroke();

  // 3. Render Continental Shelves (Cyan Shallow Waters)
  for (const land of DETAILED_CONTINENTS) {
    if (land.points.length < 3) continue;

    ctx.beginPath();
    const first = land.points[0];
    if (first) ctx.moveTo(toX(first[0]), toY(first[1]));

    for (let i = 1; i < land.points.length; i++) {
      const pt = land.points[i];
      if (pt) ctx.lineTo(toX(pt[0]), toY(pt[1]));
    }
    ctx.closePath();

    ctx.strokeStyle =
      land.type === "ice" ? "rgba(255, 255, 255, 0.4)" : "#3887d1";
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  // 4. Render Landmasses with Natural Earth Biome Colors
  for (const land of DETAILED_CONTINENTS) {
    if (land.points.length < 3) continue;

    ctx.beginPath();
    const first = land.points[0];
    if (first) ctx.moveTo(toX(first[0]), toY(first[1]));

    for (let i = 1; i < land.points.length; i++) {
      const pt = land.points[i];
      if (pt) ctx.lineTo(toX(pt[0]), toY(pt[1]));
    }
    ctx.closePath();

    // Natural authentic Earth colors
    if (land.type === "ice") {
      ctx.fillStyle = "#EDF5FA"; // Polar ice cap
      ctx.strokeStyle = "#D1E2EE";
    } else if (land.type === "desert") {
      ctx.fillStyle = "#C8A04D"; // Saharan / Outback tan desert
      ctx.strokeStyle = "#B58E3C";
    } else {
      ctx.fillStyle = "#336B3B"; // Verdant continental forest & grassland
      ctx.strokeStyle = "#25532B";
    }

    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // 5. Urban Night Lights (Warm incandescent clusters)
  const urbanClusters: [number, number, number][] = [
    [-0.12, 51.5, 4], // London
    [2.35, 48.85, 4], // Paris
    [13.4, 52.5, 3], // Berlin
    [37.6, 55.75, 4], // Moscow
    [-74.0, 40.7, 5], // New York
    [-87.6, 41.88, 4], // Chicago
    [-118.2, 34.05, 4], // Los Angeles
    [139.69, 35.68, 6], // Tokyo
    [121.47, 31.23, 5], // Shanghai
    [116.4, 39.9, 5], // Beijing
    [77.2, 28.6, 4], // Delhi
    [72.87, 19.07, 4], // Mumbai
    [103.8, 1.35, 3], // Singapore
    [151.2, -33.86, 3], // Sydney
    [-46.63, -23.55, 4], // São Paulo
    [31.23, 30.04, 3], // Cairo
  ];

  for (const [lon, lat, r] of urbanClusters) {
    const cx = toX(lon);
    const cy = toY(lat);

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, "rgba(255, 225, 130, 0.95)");
    grad.addColorStop(0.5, "rgba(255, 190, 70, 0.45)");
    grad.addColorStop(1, "rgba(255, 190, 70, 0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}
