import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAtmosphereCondition,
  getAtmosphereThemeFromWeather,
  ATMOSPHERE_THEMES,
} from "../../src/lib/atmosphere/weather-theme";

describe("Atmosphere Weather Theme Mapping", () => {
  it("maps clear sky (0, 1) accurately based on day/night cycle", () => {
    assert.strictEqual(resolveAtmosphereCondition(0, true), "clear-day");
    assert.strictEqual(resolveAtmosphereCondition(0, false), "clear-night");
    assert.strictEqual(resolveAtmosphereCondition(1, true), "clear-day");
    assert.strictEqual(resolveAtmosphereCondition(1, false), "clear-night");
  });

  it("maps partly cloudy (2) based on day/night cycle", () => {
    assert.strictEqual(
      resolveAtmosphereCondition(2, true),
      "partly-cloudy-day"
    );
    assert.strictEqual(
      resolveAtmosphereCondition(2, false),
      "partly-cloudy-night"
    );
  });

  it("maps overcast (3) and fog (45, 48)", () => {
    assert.strictEqual(resolveAtmosphereCondition(3, true), "overcast");
    assert.strictEqual(resolveAtmosphereCondition(3, false), "overcast");
    assert.strictEqual(resolveAtmosphereCondition(45, true), "fog");
    assert.strictEqual(resolveAtmosphereCondition(48, false), "fog");
  });

  it("maps rain and drizzle codes (51-67, 80-82)", () => {
    const rainCodes = [51, 55, 61, 63, 65, 80, 81, 82];
    for (const code of rainCodes) {
      assert.strictEqual(
        resolveAtmosphereCondition(code, true),
        "rain",
        `Expected ${code} to map to rain`
      );
    }
  });

  it("maps snow codes (71-77, 85, 86)", () => {
    const snowCodes = [71, 73, 75, 77, 85, 86];
    for (const code of snowCodes) {
      assert.strictEqual(
        resolveAtmosphereCondition(code, true),
        "snow",
        `Expected ${code} to map to snow`
      );
    }
  });

  it("maps thunderstorm codes (95, 96, 99) with lightning enabled", () => {
    const stormCodes = [95, 96, 99];
    for (const code of stormCodes) {
      assert.strictEqual(
        resolveAtmosphereCondition(code, true),
        "thunderstorm"
      );
      const theme = getAtmosphereThemeFromWeather(code, true);
      assert.strictEqual(theme.lightning, true);
    }
  });

  it("contains complete theme specifications for all conditions", () => {
    const conditions = Object.keys(ATMOSPHERE_THEMES);
    assert.ok(conditions.length >= 8);

    for (const cond of conditions) {
      const theme = ATMOSPHERE_THEMES[cond as keyof typeof ATMOSPHERE_THEMES];
      assert.ok(theme.id);
      assert.ok(theme.backgroundGradient.startsWith("radial-gradient"));
      assert.ok(theme.ambientColor.startsWith("#"));
      assert.ok(theme.lightColor.startsWith("#"));
      assert.ok(
        theme.particles.count <= 100,
        "Particle budget must be capped at 100"
      );
      assert.ok(theme.particles.speed > 0);
    }
  });
});
