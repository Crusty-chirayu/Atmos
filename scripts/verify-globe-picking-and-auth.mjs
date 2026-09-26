import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const OUT_DIR = path.resolve("docs/audit/final-acceptance");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function run() {
  console.log("Launching browser for Globe Coordinate Picking & Supabase Auth QA...");
  const browser = await chromium.launch({
    executablePath: fs.existsSync(EDGE_PATH) ? EDGE_PATH : undefined,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // ─── 1. HOMEPAGE GLOBE CLICK ANYWHERE VERIFICATION ───
  console.log("1. Navigating to Homepage...");
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000); // Wait for Three.js canvas to render

  const canvas = await page.$("canvas");
  if (!canvas) {
    throw new Error("Globe canvas element not found!");
  }

  const box = await canvas.boundingBox();
  console.log("Canvas bounding box:", box);

  if (box) {
    // Click on the globe surface slightly offset from center
    const clickX = box.x + box.width * 0.42;
    const clickY = box.y + box.height * 0.48;

    console.log(`Clicking arbitrary point on globe surface at (${clickX.toFixed(1)}, ${clickY.toFixed(1)})...`);
    await page.mouse.click(clickX, clickY);

    // Wait for the weather API request and reverse geocoding to complete
    await page.waitForTimeout(3000);

    console.log("Capturing 11_globe_arbitrary_point_picked.png...");
    await page.screenshot({
      path: path.join(OUT_DIR, "11_globe_arbitrary_point_picked.png"),
      fullPage: false,
    });

    // Test Drag Rotation (should rotate without triggering coordinate pick)
    console.log("Testing drag rotation...");
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5 + 180, box.y + box.height * 0.5 + 30, { steps: 15 });
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Click on another arbitrary point (ocean/continent)
    const oceanX = box.x + box.width * 0.58;
    const oceanY = box.y + box.height * 0.55;
    console.log(`Clicking second point at (${oceanX.toFixed(1)}, ${oceanY.toFixed(1)})...`);
    await page.mouse.click(oceanX, oceanY);
    await page.waitForTimeout(3000);

    console.log("Capturing 12_globe_second_coordinate_picked.png...");
    await page.screenshot({
      path: path.join(OUT_DIR, "12_globe_second_coordinate_picked.png"),
      fullPage: false,
    });
  }

  // ─── 2. SIGN IN PAGE (SUPABASE CONFIGURED VERIFICATION) ───
  console.log("2. Navigating to Login Page (/login)...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const hasLoginNotice = await page.evaluate(() => {
    return document.body.innerText.includes("Supabase Auth is unconfigured");
  });
  console.log("Login page has 'unconfigured' notice:", hasLoginNotice);

  await page.screenshot({
    path: path.join(OUT_DIR, "13_login_page_configured.png"),
    fullPage: false,
  });

  // ─── 3. SIGN UP PAGE (SUPABASE CONFIGURED VERIFICATION) ───
  console.log("3. Navigating to Signup Page (/signup)...");
  await page.goto("http://localhost:3000/signup", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const hasSignupNotice = await page.evaluate(() => {
    return document.body.innerText.includes("Supabase Auth is unconfigured");
  });
  console.log("Signup page has 'unconfigured' notice:", hasSignupNotice);

  await page.screenshot({
    path: path.join(OUT_DIR, "14_signup_page_configured.png"),
    fullPage: false,
  });

  // ─── 4. ACCOUNT OVERVIEW PAGE ───
  console.log("4. Navigating to Account Page (/account)...");
  await page.goto("http://localhost:3000/account", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: path.join(OUT_DIR, "15_account_overview_configured.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("Browser QA verification completed successfully!");
}

run().catch((err) => {
  console.error("Browser QA script failed:", err);
  process.exit(1);
});
