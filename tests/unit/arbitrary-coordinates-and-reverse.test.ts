import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  latLonToCartesian,
  cartesianToLatLon,
} from "../../src/lib/globe/coordinates";
import {
  formatCoordinateLabel,
  reverseGeocodeCoordinates,
} from "../../src/lib/geocoding/reverse";

describe("Arbitrary Globe Coordinate Picking & Reverse Resolution", () => {
  it("formats coordinate labels cleanly in hemispherically correct notation", () => {
    assert.strictEqual(
      formatCoordinateLabel(51.5074, -0.1278),
      "51.51° N, 0.13° W"
    );
    assert.strictEqual(
      formatCoordinateLabel(40.7128, -74.006),
      "40.71° N, 74.01° W"
    );
    assert.strictEqual(
      formatCoordinateLabel(-33.8688, 151.2093),
      "33.87° S, 151.21° E"
    );
    assert.strictEqual(formatCoordinateLabel(0, 0), "0.00° N, 0.00° E");
    assert.strictEqual(formatCoordinateLabel(-90, 180), "90.00° S, 180.00° E");
  });

  it("accurately recovers geographic coordinates from rotated Three.js globe group", () => {
    // Simulate a Three.js scene with a parent globe group having arbitrary rotation
    const scene = new THREE.Scene();
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Arbitrary rotation angles simulating user dragging the globe
    globeGroup.rotation.y = 1.842;
    globeGroup.rotation.x = -0.412;

    const testLocations = [
      { name: "London", lat: 51.5074, lon: -0.1278 },
      { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
      { name: "Sydney", lat: -33.8688, lon: 151.2093 },
      { name: "Mumbai", lat: 19.076, lon: 72.8777 },
      { name: "Pacific Ocean", lat: 0.0, lon: -140.0 },
      { name: "Antarctica Dome C", lat: -75.1, lon: 123.35 },
    ];

    for (const loc of testLocations) {
      // 1. Calculate local cartesian position on unit sphere
      const localPos = latLonToCartesian(loc.lat, loc.lon, 1.0);
      const testPoint = new THREE.Vector3(localPos.x, localPos.y, localPos.z);

      // 2. Transform local position to world space (as raycaster hit.point would be)
      globeGroup.updateMatrixWorld(true);
      const worldHitPoint = testPoint
        .clone()
        .applyMatrix4(globeGroup.matrixWorld);

      // 3. Apply the production coordinate picking formula: globeGroup.worldToLocal(hit.point)
      const recoveredLocal = globeGroup.worldToLocal(worldHitPoint.clone());

      // 4. Convert Cartesian back to geographic Lat/Lon
      const { latitude, longitude } = cartesianToLatLon(
        recoveredLocal.x,
        recoveredLocal.y,
        recoveredLocal.z
      );

      assert.ok(
        Math.abs(latitude - loc.lat) < 0.01,
        `Expected ${loc.lat} for ${loc.name}, got ${latitude}`
      );
      assert.ok(
        Math.abs(longitude - loc.lon) < 0.01,
        `Expected ${loc.lon} for ${loc.name}, got ${longitude}`
      );
    }
  });

  it("safely falls back to coordinate label if network is aborted or offline", async () => {
    const controller = new AbortController();
    controller.abort(); // Pre-aborted signal

    const result = await reverseGeocodeCoordinates(
      25.0,
      -71.0,
      controller.signal
    );
    assert.strictEqual(result.name, "25.00° N, 71.00° W");
  });
});
