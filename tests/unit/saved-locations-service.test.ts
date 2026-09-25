import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  saveLocation,
  getSavedLocations,
  deleteSavedLocation,
  updateLocationLabel,
} from "../../src/lib/auth/locations-service";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(overrides: {
  existingRecord?: unknown;
  insertResult?: unknown;
  selectResult?: unknown;
  insertError?: Error;
  deleteError?: Error;
}) {
  const createQueryBuilder = () => {
    const builder: any = {
      eq: () => builder,
      order: () => builder,
      maybeSingle: () =>
        Promise.resolve({
          data: overrides.existingRecord ?? null,
          error: null,
        }),
      then: (resolve: any, reject?: any) =>
        Promise.resolve({
          data: overrides.selectResult ?? [],
          error: null,
        }).then(resolve, reject),
    };
    return builder;
  };

  return {
    from: (table: string) => {
      assert.equal(table, "saved_locations");
      return {
        select: (_cols?: string) => createQueryBuilder(),
        insert: (payload: any) => ({
          select: () => ({
            single: () => {
              if (overrides.insertError) {
                return Promise.resolve({
                  data: null,
                  error: overrides.insertError,
                });
              }
              return Promise.resolve({
                data: {
                  id: "mock-loc-uuid-1",
                  ...payload,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              });
            },
          }),
        }),
        delete: () => {
          const deleteBuilder: any = {
            eq: () => deleteBuilder,
            then: (resolve: any, reject?: any) => {
              if (overrides.deleteError) {
                return Promise.resolve({ error: overrides.deleteError }).then(
                  resolve,
                  reject
                );
              }
              return Promise.resolve({ error: null }).then(resolve, reject);
            },
          };
          return deleteBuilder;
        },
        update: (updates: any) => {
          const updateBuilder: any = {
            eq: () => updateBuilder,
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "mock-loc-uuid-1",
                    user_id: "user-123",
                    name: "Paris",
                    latitude: 48.8566,
                    longitude: 2.3522,
                    ...updates,
                  },
                  error: null,
                }),
            }),
          };
          return updateBuilder;
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("Saved Locations Service", () => {
  it("normalizes coordinates and saves new location for user", async () => {
    const mock = createMockSupabase({});
    const result = await saveLocation(mock, "user-456", {
      name: "Tokyo",
      latitude: 35.67619999, // should normalize to 35.6762
      longitude: 139.6503111, // should normalize to 139.65031
      country: "Japan",
      country_code: "JP",
      display_order: 0,
    });

    assert.equal(result.user_id, "user-456");
    assert.equal(result.name, "Tokyo");
    assert.equal(result.latitude, 35.6762);
    assert.equal(result.longitude, 139.65031);
  });

  it("returns existing record without duplicate insertion if coordinates match", async () => {
    const existing = {
      id: "existing-uuid",
      user_id: "user-456",
      name: "Tokyo",
      latitude: 35.6762,
      longitude: 139.65031,
      country: "Japan",
    };

    const mock = createMockSupabase({ existingRecord: existing });
    const result = await saveLocation(mock, "user-456", {
      name: "Tokyo Duplicate",
      latitude: 35.6762,
      longitude: 139.65031,
      display_order: 1,
    });

    assert.equal(result.id, "existing-uuid");
    assert.equal(result.name, "Tokyo");
  });

  it("retrieves saved locations ordered for user", async () => {
    const records = [
      { id: "1", name: "London", user_id: "user-1", display_order: 0 },
      { id: "2", name: "New York", user_id: "user-1", display_order: 1 },
    ];
    const mock = createMockSupabase({ selectResult: records });
    const locations = await getSavedLocations(mock, "user-1");

    assert.equal(locations.length, 2);
    assert.equal(locations[0]?.name, "London");
    assert.equal(locations[1]?.name, "New York");
  });

  it("deletes saved location scoped to user", async () => {
    const mock = createMockSupabase({});
    const success = await deleteSavedLocation(mock, "user-1", "loc-123");
    assert.equal(success, true);
  });

  it("updates custom label on saved location", async () => {
    const mock = createMockSupabase({});
    const updated = await updateLocationLabel(
      mock,
      "user-1",
      "mock-loc-uuid-1",
      "Home Base"
    );
    assert.equal(updated.label, "Home Base");
  });
});
