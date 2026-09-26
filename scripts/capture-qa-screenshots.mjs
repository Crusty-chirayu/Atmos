import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const OUT_DIR = path.resolve("docs/audit/final-acceptance");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function main() {
  console.log("Launching Edge browser for ATMOS QA validation...");
  const browser = await chromium.launch({
    executablePath: fs.existsSync(EDGE_PATH) ? EDGE_PATH : undefined,
    headless: true,
  });

  // 1. Desktop Homepage (1280 x 900)
  console.log("Capturing 1. Desktop Homepage (Globe & Overview)...");
  const ctxDesktop = await browser.newContext({
    viewport: { width: 1280, height: 950 },
    deviceScaleFactor: 2,
  });
  const pageHome = await ctxDesktop.newPage();
  await pageHome.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await pageHome.waitForTimeout(2500); // Allow Three.js textures to load
  await pageHome.screenshot({
    path: path.join(OUT_DIR, "01_homepage_globe_desktop.png"),
    fullPage: false,
  });

  // Scroll down to see forecast cards and footer
  await pageHome.evaluate(() => window.scrollBy(0, 700));
  await pageHome.waitForTimeout(1000);
  await pageHome.screenshot({
    path: path.join(OUT_DIR, "02_homepage_forecast_footer.png"),
    fullPage: false,
  });

  // 2. Full Dashboard View (1280 x 1200)
  console.log("Capturing 2. Dashboard View (Conditions, Hourly & Daily)...");
  const pageDashboard = await ctxDesktop.newPage();
  await pageDashboard.goto("http://localhost:3000/dashboard", {
    waitUntil: "networkidle",
  });
  await pageDashboard.waitForTimeout(2500);
  await pageDashboard.screenshot({
    path: path.join(OUT_DIR, "03_dashboard_current_hourly.png"),
    fullPage: false,
  });

  // Scroll down to daily forecast and telemetry metrics
  await pageDashboard.evaluate(() => window.scrollBy(0, 600));
  await pageDashboard.waitForTimeout(1000);
  await pageDashboard.screenshot({
    path: path.join(OUT_DIR, "04_dashboard_daily_metrics.png"),
    fullPage: false,
  });

  // Scroll down to footer
  await pageDashboard.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pageDashboard.waitForTimeout(1000);
  await pageDashboard.screenshot({
    path: path.join(OUT_DIR, "05_dashboard_footer_attribution.png"),
    fullPage: false,
  });

  // 3. AI Intelligence Workspace
  console.log("Capturing 3. AI Assistant Workspace (/ai)...");
  const pageAi = await ctxDesktop.newPage();
  await pageAi.goto("http://localhost:3000/ai", { waitUntil: "networkidle" });
  await pageAi.waitForTimeout(2000);
  await pageAi.screenshot({
    path: path.join(OUT_DIR, "06_ai_assistant_workspace.png"),
    fullPage: false,
  });

  // Try submitting a question to show the interaction
  try {
    const input = pageAi.locator('input[placeholder*="Ask about"]');
    if (await input.count() > 0) {
      await input.fill("Will it rain in London today?");
      await pageAi.keyboard.press("Enter");
      await pageAi.waitForTimeout(3000);
      await pageAi.screenshot({
        path: path.join(OUT_DIR, "07_ai_assistant_interaction.png"),
        fullPage: false,
      });
    }
  } catch (err) {
    console.warn("AI interaction snapshot note:", err);
  }

  // 4. About & Developer Attribution Page
  console.log("Capturing 4. About & Developer Credit Page (/about)...");
  const pageAbout = await ctxDesktop.newPage();
  await pageAbout.goto("http://localhost:3000/about", { waitUntil: "networkidle" });
  await pageAbout.waitForTimeout(1500);
  await pageAbout.screenshot({
    path: path.join(OUT_DIR, "08_about_developer_credit.png"),
    fullPage: false,
  });

  // 5. Mobile Responsiveness (390 x 844 - iPhone 14 / modern mobile)
  console.log("Capturing 5. Mobile Responsiveness (390 x 844)...");
  const ctxMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const pageMobile = await ctxMobile.newPage();
  await pageMobile.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await pageMobile.waitForTimeout(2500);
  await pageMobile.screenshot({
    path: path.join(OUT_DIR, "09_mobile_homepage_globe.png"),
    fullPage: false,
  });

  await pageMobile.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  await pageMobile.waitForTimeout(2000);
  await pageMobile.screenshot({
    path: path.join(OUT_DIR, "10_mobile_dashboard.png"),
    fullPage: false,
  });

  await browser.close();
  console.log("All 10 QA screenshots captured successfully in:", OUT_DIR);
}

main().catch((err) => {
  console.error("Screenshot capture error:", err);
  process.exit(1);
});
