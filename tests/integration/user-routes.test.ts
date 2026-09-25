import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GET as getLocations,
  POST as postLocation,
} from "../../src/app/api/user/locations/route";
import { DELETE as deleteLocation } from "../../src/app/api/user/locations/[id]/route";
import {
  GET as getPreferences,
  PUT as putPreferences,
} from "../../src/app/api/user/preferences/route";
import { DELETE as deleteAccount } from "../../src/app/api/user/account/route";

describe("User Authenticated API Route Handlers (Security & Isolation)", () => {
  describe("GET /api/user/locations", () => {
    it("returns 401 Unauthorized for unauthenticated requests", async () => {
      const response = await getLocations();
      assert.equal(response.status, 401);
      const data = await response.json();
      assert.equal(data.code, "NOT_AUTHENTICATED");
    });
  });

  describe("POST /api/user/locations", () => {
    it("returns 401 Unauthorized when attempting to save location without valid session", async () => {
      const request = new Request("http://localhost:3000/api/user/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Paris",
          latitude: 48.8566,
          longitude: 2.3522,
        }),
      });

      const response = await postLocation(request);
      assert.equal(response.status, 401);
      const data = await response.json();
      assert.equal(data.code, "NOT_AUTHENTICATED");
    });
  });

  describe("DELETE /api/user/locations/[id]", () => {
    it("returns 401 Unauthorized when unauthenticated user attempts to delete a location", async () => {
      const request = new Request(
        "http://localhost:3000/api/user/locations/test-loc-1",
        {
          method: "DELETE",
        }
      );

      const response = await deleteLocation(request, {
        params: Promise.resolve({ id: "test-loc-1" }),
      });
      assert.equal(response.status, 401);
      const data = await response.json();
      assert.equal(data.code, "NOT_AUTHENTICATED");
    });
  });

  describe("GET /api/user/preferences", () => {
    it("returns 401 Unauthorized for unauthenticated requests", async () => {
      const response = await getPreferences();
      assert.equal(response.status, 401);
      const data = await response.json();
      assert.equal(data.code, "NOT_AUTHENTICATED");
    });
  });

  describe("PUT /api/user/preferences", () => {
    it("returns 401 Unauthorized when attempting to mutate preferences without session", async () => {
      const request = new Request(
        "http://localhost:3000/api/user/preferences",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            temperature_unit: "fahrenheit",
          }),
        }
      );

      const response = await putPreferences(request);
      assert.equal(response.status, 401);
      const data = await response.json();
      assert.equal(data.code, "NOT_AUTHENTICATED");
    });
  });

  describe("DELETE /api/user/account", () => {
    it("returns 401 Unauthorized when unauthenticated client attempts account deletion", async () => {
      const response = await deleteAccount();
      assert.equal(response.status, 401);
      const data = await response.json();
      assert.equal(data.code, "NOT_AUTHENTICATED");
    });
  });
});
