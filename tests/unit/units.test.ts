import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  kmhToMph,
  mphToKmh,
  kmhToMs,
  msToKmh,
  kmhToKnots,
  knotsToKmh,
  mmToInches,
  inchesToMm,
  hpaToInhg,
  inhgToHpa,
  metersToFeet,
  feetToMeters,
  convertTemperature,
  convertWindSpeed,
  convertPrecipitation,
  convertPressure,
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
} from "../../src/lib/weather/domain/units";

describe("Unit Conversion & Normalization", () => {
  describe("Temperature conversions", () => {
    it("converts freezing point (0°C to 32°F)", () => {
      assert.equal(celsiusToFahrenheit(0), 32);
      assert.equal(fahrenheitToCelsius(32), 0);
    });

    it("converts boiling point (100°C to 212°F)", () => {
      assert.equal(celsiusToFahrenheit(100), 212);
      assert.equal(fahrenheitToCelsius(212), 100);
    });

    it("handles common parity point (-40°C = -40°F)", () => {
      assert.equal(celsiusToFahrenheit(-40), -40);
      assert.equal(fahrenheitToCelsius(-40), -40);
    });

    it("handles negative sub-zero temperatures accurately", () => {
      const f = celsiusToFahrenheit(-15);
      assert.equal(f, 5);
      const c = fahrenheitToCelsius(5);
      assert.equal(c, -15);
    });

    it("preserves canonical value when target is celsius", () => {
      assert.equal(convertTemperature(24.5, "celsius"), 24.5);
    });

    it("converts to fahrenheit using convertTemperature helper", () => {
      assert.equal(convertTemperature(20, "fahrenheit"), 68);
    });
  });

  describe("Wind speed conversions", () => {
    it("converts km/h to mph accurately", () => {
      const mph = kmhToMph(100);
      assert.ok(Math.abs(mph - 62.137) < 0.01);
      assert.ok(Math.abs(mphToKmh(mph) - 100) < 0.001);
    });

    it("converts km/h to m/s accurately", () => {
      assert.equal(kmhToMs(36), 10);
      assert.equal(msToKmh(10), 36);
    });

    it("converts km/h to knots accurately", () => {
      const kn = kmhToKnots(50);
      assert.ok(Math.abs(kn - 26.997) < 0.01);
      assert.ok(Math.abs(knotsToKmh(kn) - 50) < 0.001);
    });

    it("handles 0 wind speed without error", () => {
      assert.equal(convertWindSpeed(0, "mph"), 0);
      assert.equal(convertWindSpeed(0, "ms"), 0);
      assert.equal(convertWindSpeed(0, "kn"), 0);
      assert.equal(convertWindSpeed(0, "kmh"), 0);
    });
  });

  describe("Precipitation conversions", () => {
    it("converts mm to inches accurately", () => {
      const inches = mmToInches(25.4);
      assert.ok(Math.abs(inches - 1.0) < 0.0001);
      assert.ok(Math.abs(inchesToMm(1.0) - 25.4) < 0.0001);
    });

    it("handles zero precipitation accurately without NaN", () => {
      assert.equal(convertPrecipitation(0, "inch"), 0);
      assert.equal(convertPrecipitation(0, "mm"), 0);
    });
  });

  describe("Pressure conversions", () => {
    it("converts standard sea-level pressure (1013.25 hPa to ~29.92 inHg)", () => {
      const inhg = hpaToInhg(1013.25);
      assert.ok(Math.abs(inhg - 29.92) < 0.02);
      assert.ok(Math.abs(inhgToHpa(inhg) - 1013.25) < 0.01);
    });

    it("converts pressure via convertPressure helper", () => {
      assert.equal(convertPressure(1000, "hpa"), 1000);
      assert.ok(convertPressure(1000, "inhg") > 29);
    });
  });

  describe("Elevation conversions", () => {
    it("converts meters to feet and back", () => {
      const ft = metersToFeet(1000);
      assert.ok(Math.abs(ft - 3280.84) < 0.1);
      assert.ok(Math.abs(feetToMeters(ft) - 1000) < 0.001);
    });
  });

  describe("Display formatting helpers", () => {
    it("formats temperature with appropriate symbol", () => {
      assert.equal(formatTemperature(21.4, "celsius"), "21°C");
      assert.equal(formatTemperature(21.4, "fahrenheit"), "71°F");
      assert.equal(formatTemperature(-5.2, "celsius"), "-5°C");
    });

    it("formats wind speed with appropriate label", () => {
      assert.equal(formatWindSpeed(15.4, "kmh"), "15 km/h");
      assert.equal(formatWindSpeed(15.4, "mph"), "10 mph");
      assert.equal(formatWindSpeed(15.4, "ms"), "4 m/s");
      assert.equal(formatWindSpeed(15.4, "kn"), "8 kn");
    });

    it("formats precipitation with appropriate symbol", () => {
      assert.equal(formatPrecipitation(0, "mm"), "0.0 mm");
      assert.equal(formatPrecipitation(12.5, "mm"), "12.5 mm");
      assert.equal(formatPrecipitation(25.4, "inch"), "1.0 in");
    });
  });
});
