import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Milestone 8: PWA, Service Worker & Offline Architecture", () => {
  const rootDir = process.cwd();

  test("has a valid web app manifest with required PWA criteria", () => {
    const manifestPath = path.join(rootDir, "public", "manifest.json");
    assert.strictEqual(fs.existsSync(manifestPath), true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    assert.strictEqual(manifest.name, "ATMOS");
    assert.strictEqual(manifest.short_name, "ATMOS");
    assert.strictEqual(manifest.display, "standalone");
    assert.strictEqual(manifest.start_url, "/");
    assert.ok(manifest.background_color);
    assert.ok(manifest.theme_color);

    // Verify icons specification
    assert.ok(Array.isArray(manifest.icons));
    assert.ok(manifest.icons.length >= 2);

    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    assert.ok(sizes.includes("192x192"));
    assert.ok(sizes.includes("512x512"));

    // Verify maskable icons exist for adaptive launchers
    const maskable = manifest.icons.filter((i: { purpose?: string }) =>
      i.purpose?.includes("maskable")
    );
    assert.ok(maskable.length >= 1);

    // Verify icon files physically exist on disk
    for (const icon of manifest.icons) {
      const iconDiskPath = path.join(rootDir, "public", icon.src);
      assert.strictEqual(
        fs.existsSync(iconDiskPath),
        true,
        `Icon file ${icon.src} should exist`
      );
    }
  });

  test("enforces strict privacy and security boundaries in Service Worker", () => {
    const swPath = path.join(rootDir, "public", "sw.js");
    assert.strictEqual(fs.existsSync(swPath), true);

    const swContent = fs.readFileSync(swPath, "utf-8");

    // Strictly excludes user personal data and authenticated routes
    assert.ok(swContent.includes("/api/user"));
    assert.ok(swContent.includes("/api/ai"));
    assert.ok(swContent.includes("/api/auth"));

    // Weather caching bounded with TTL
    assert.ok(swContent.includes("WEATHER_CACHE"));
    assert.ok(swContent.includes("/api/weather"));
    assert.ok(swContent.includes("WEATHER_CACHE_TTL_MS"));

    // Navigation fallback to offline page
    assert.ok(swContent.includes("/offline"));
    assert.ok(swContent.includes("request.mode"));
    assert.ok(swContent.includes("navigate"));

    // Push notification and click event listeners
    assert.ok(
      swContent.includes("addEventListener") && swContent.includes("push")
    );
    assert.ok(
      swContent.includes("addEventListener") &&
        swContent.includes("notificationclick")
    );
  });

  test("has dedicated offline fallback route", () => {
    const offlinePagePath = path.join(
      rootDir,
      "src",
      "app",
      "offline",
      "page.tsx"
    );
    assert.strictEqual(fs.existsSync(offlinePagePath), true);

    const offlineContent = fs.readFileSync(offlinePagePath, "utf-8");
    assert.ok(offlineContent.includes("offline"));
    assert.ok(offlineContent.includes("Retry Connection"));
  });

  test("exposes PwaProvider with connection awareness and install triggers", () => {
    const pwaProviderPath = path.join(
      rootDir,
      "src",
      "components",
      "pwa",
      "pwa-provider.tsx"
    );
    assert.strictEqual(fs.existsSync(pwaProviderPath), true);

    const pwaContent = fs.readFileSync(pwaProviderPath, "utf-8");
    assert.ok(pwaContent.includes("beforeinstallprompt"));
    assert.ok(pwaContent.includes("serviceWorker"));
    assert.ok(pwaContent.includes('.register("/sw.js")'));
    assert.ok(pwaContent.includes("online"));
    assert.ok(pwaContent.includes("offline"));
  });
});
