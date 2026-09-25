import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  latLonToCartesian,
  cartesianToLatLon,
  haversineDistanceKm,
  FEATURED_CITIES,
} from "../../src/lib/globe/coordinates";

describe("Globe Coordinate Transformations", () => {
  const EPSILON = 1e-4;

  it("correctly converts North Pole (90, 0) to Cartesian (0, R, 0)", () => {
    const v = latLonToCartesian(90, 0, 10);
    assert.ok(Math.abs(v.x) < EPSILON);
    assert.ok(Math.abs(v.y - 10) < EPSILON);
    assert.ok(Math.abs(v.z) < EPSILON);
  });

  it("correctly converts South Pole (-90, 0) to Cartesian (0, -R, 0)", () => {
    const v = latLonToCartesian(-90, 0, 10);
    assert.ok(Math.abs(v.x) < EPSILON);
    assert.ok(Math.abs(v.y - -10) < EPSILON);
    assert.ok(Math.abs(v.z) < EPSILON);
  });

  it("correctly converts Prime Meridian at Equator (0, 0) to Cartesian (0, 0, R)", () => {
    const v = latLonToCartesian(0, 0, 5);
    assert.ok(Math.abs(v.x) < EPSILON);
    assert.ok(Math.abs(v.y) < EPSILON);
    assert.ok(Math.abs(v.z - 5) < EPSILON);
  });

  it("correctly converts 90 deg East at Equator (0, 90) to Cartesian (R, 0, 0)", () => {
    const v = latLonToCartesian(0, 90, 5);
    assert.ok(Math.abs(v.x - 5) < EPSILON);
    assert.ok(Math.abs(v.y) < EPSILON);
    assert.ok(Math.abs(v.z) < EPSILON);
  });

  it("correctly converts Antimeridian at Equator (0, 180) to Cartesian (0, 0, -R)", () => {
    const v = latLonToCartesian(0, 180, 5);
    assert.ok(Math.abs(v.x) < EPSILON);
    assert.ok(Math.abs(v.y) < EPSILON);
    assert.ok(Math.abs(v.z - -5) < EPSILON);
  });

  it("correctly converts 90 deg West at Equator (0, -90) to Cartesian (-R, 0, 0)", () => {
    const v = latLonToCartesian(0, -90, 5);
    assert.ok(Math.abs(v.x - -5) < EPSILON);
    assert.ok(Math.abs(v.y) < EPSILON);
    assert.ok(Math.abs(v.z) < EPSILON);
  });

  it("roundtrips conversion between latLon and Cartesian coordinate spaces", () => {
    const coords = [
      { lat: 51.5074, lon: -0.1278 }, // London
      { lat: 35.6762, lon: 139.6503 }, // Tokyo
      { lat: -33.8688, lon: 151.2093 }, // Sydney
      { lat: -23.5505, lon: -46.6333 }, // São Paulo
      { lat: 64.1466, lon: -21.9426 }, // Reykjavik
    ];

    for (const c of coords) {
      const v = latLonToCartesian(c.lat, c.lon, 1);
      const back = cartesianToLatLon(v.x, v.y, v.z);
      assert.ok(
        Math.abs(back.latitude - c.lat) < 0.05,
        `Latitude mismatch for ${c.lat}: got ${back.latitude}`
      );
      assert.ok(
        Math.abs(back.longitude - c.lon) < 0.05,
        `Longitude mismatch for ${c.lon}: got ${back.longitude}`
      );
    }
  });

  it("clamps extreme coordinates beyond geographic bounds", () => {
    const vClamped = latLonToCartesian(105, 200, 1);
    const vNormal = latLonToCartesian(90, 180, 1);
    assert.ok(Math.abs(vClamped.x - vNormal.x) < EPSILON);
    assert.ok(Math.abs(vClamped.y - vNormal.y) < EPSILON);
    assert.ok(Math.abs(vClamped.z - vNormal.z) < EPSILON);
  });

  it("calculates accurate great-circle distances with Haversine formula", () => {
    // London to Paris: ~343 km
    const dist = haversineDistanceKm(51.5074, -0.1278, 48.8566, 2.3522);
    assert.ok(dist > 330 && dist < 360, `Distance was ${dist}`);

    // Same coordinates: 0 km
    assert.strictEqual(haversineDistanceKm(0, 0, 0, 0), 0);
  });

  it("contains valid coordinates for all featured metropolises", () => {
    assert.ok(FEATURED_CITIES.length >= 8);
    for (const city of FEATURED_CITIES) {
      assert.ok(city.latitude >= -90 && city.latitude <= 90);
      assert.ok(city.longitude >= -180 && city.longitude <= 180);
      assert.ok(city.name.length > 0);
      assert.ok(city.countryCode.length === 2);
      assert.ok(city.timezone.length > 0);
    }
  });
});
