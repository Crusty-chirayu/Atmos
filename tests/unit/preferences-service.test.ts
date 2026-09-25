import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../../src/lib/auth/preferences-service";
import { DEFAULT_USER_PREFERENCES } from "../../src/lib/auth/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(existingPrefs?: any) {
  return {
    from: (table: string) => {
      assert.equal(table, "user_preferences");
      return {
        select: () => ({
          eq: (_col: string, val: string) => ({
            maybeSingle: () =>
              Promise.resolve({
                data: existingPrefs ? { user_id: val, ...existingPrefs } : null,
                error: null,
              }),
          }),
        }),
        insert: (payload: any) => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: payload,
                error: null,
              }),
          }),
        }),
        upsert: (payload: any) => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: payload,
                error: null,
              }),
          }),
        }),
      };
    },
  } as unknown as SupabaseClient;
}

describe("User Preferences Service", () => {
  it("retrieves existing preferences for authenticated user", async () => {
    const mock = createMockSupabase({
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      precipitation_unit: "inch",
      theme: "light",
      reduced_motion: false,
    });

    const prefs = await getUserPreferences(mock, "user-456");
    assert.equal(prefs.temperature_unit, "fahrenheit");
    assert.equal(prefs.wind_speed_unit, "mph");
    assert.equal(prefs.theme, "light");
  });

  it("initializes default preferences when row does not exist", async () => {
    const mock = createMockSupabase(null);
    const prefs = await getUserPreferences(mock, "user-789");

    assert.equal(prefs.user_id, "user-789");
    assert.equal(
      prefs.temperature_unit,
      DEFAULT_USER_PREFERENCES.temperature_unit
    );
    assert.equal(prefs.theme, DEFAULT_USER_PREFERENCES.theme);
  });

  it("updates preferences via upsert", async () => {
    const mock = createMockSupabase();
    const updated = await updateUserPreferences(mock, "user-123", {
      temperature_unit: "fahrenheit",
      theme: "dark",
    });

    assert.equal(updated.user_id, "user-123");
    assert.equal(updated.temperature_unit, "fahrenheit");
    assert.equal(updated.theme, "dark");
  });
});
