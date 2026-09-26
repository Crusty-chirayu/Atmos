import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAppUrl,
  optionalEnv,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
  isVapidConfigured,
  isCronSecretConfigured,
} from "../../src/lib/config/env";

describe("Environment Configuration & URL Resolution", () => {
  describe("resolveAppUrl", () => {
    it("returns default fallback when input is undefined", () => {
      const url = resolveAppUrl(undefined);
      assert.ok(url instanceof URL);
      assert.equal(url.href, "https://atmos.app/");
    });

    it("returns default fallback when input is null", () => {
      const url = resolveAppUrl(null);
      assert.ok(url instanceof URL);
      assert.equal(url.href, "https://atmos.app/");
    });

    it("returns default fallback when input is empty string", () => {
      const url = resolveAppUrl("");
      assert.ok(url instanceof URL);
      assert.equal(url.href, "https://atmos.app/");
    });

    it("returns default fallback when input is whitespace-only", () => {
      const url = resolveAppUrl("   \t\n  ");
      assert.ok(url instanceof URL);
      assert.equal(url.href, "https://atmos.app/");
    });

    it("accepts valid HTTPS URL", () => {
      const url = resolveAppUrl("https://atmos-preview.vercel.app");
      assert.ok(url instanceof URL);
      assert.equal(url.origin, "https://atmos-preview.vercel.app");
    });

    it("accepts valid HTTP localhost URL", () => {
      const url = resolveAppUrl("http://localhost:3000");
      assert.ok(url instanceof URL);
      assert.equal(url.origin, "http://localhost:3000");
    });

    it("trims whitespace from valid URLs", () => {
      const url = resolveAppUrl("  https://my-app.vercel.app  ");
      assert.ok(url instanceof URL);
      assert.equal(url.origin, "https://my-app.vercel.app");
    });

    it("falls back safely on malformed URL strings without throwing", () => {
      const url = resolveAppUrl("not-a-valid-url");
      assert.ok(url instanceof URL);
      assert.equal(url.href, "https://atmos.app/");
    });

    it("falls back safely on relative paths", () => {
      const url = resolveAppUrl("/dashboard");
      assert.ok(url instanceof URL);
      assert.equal(url.href, "https://atmos.app/");
    });

    it("falls back safely on disallowed protocols (e.g. javascript:, ftp:)", () => {
      const jsUrl = resolveAppUrl("javascript:alert(1)");
      assert.equal(jsUrl.href, "https://atmos.app/");

      const ftpUrl = resolveAppUrl("ftp://files.atmos.app");
      assert.equal(ftpUrl.href, "https://atmos.app/");
    });

    it("honors custom valid fallback when provided", () => {
      const url = resolveAppUrl("", "https://staging.atmos.app");
      assert.equal(url.origin, "https://staging.atmos.app");
    });

    it("falls back to hardcoded default if custom fallback is malformed", () => {
      const url = resolveAppUrl("", "invalid-fallback");
      assert.equal(url.href, "https://atmos.app/");
    });
  });

  describe("optionalEnv", () => {
    const TEST_KEY = "_ATMOS_TEST_VAR_OPTIONAL_ENV";

    it("returns configured value when present and non-empty", () => {
      process.env[TEST_KEY] = "custom-value";
      try {
        assert.equal(optionalEnv(TEST_KEY, "fallback"), "custom-value");
      } finally {
        delete process.env[TEST_KEY];
      }
    });

    it("trims whitespace from configured value", () => {
      process.env[TEST_KEY] = "   trimmed-value   ";
      try {
        assert.equal(optionalEnv(TEST_KEY, "fallback"), "trimmed-value");
      } finally {
        delete process.env[TEST_KEY];
      }
    });

    it("returns fallback when variable is unset", () => {
      delete process.env[TEST_KEY];
      assert.equal(optionalEnv(TEST_KEY, "fallback-default"), "fallback-default");
    });

    it("returns fallback when variable is empty string", () => {
      process.env[TEST_KEY] = "";
      try {
        assert.equal(optionalEnv(TEST_KEY, "fallback-empty"), "fallback-empty");
      } finally {
        delete process.env[TEST_KEY];
      }
    });

    it("returns fallback when variable is whitespace only", () => {
      process.env[TEST_KEY] = "   ";
      try {
        assert.equal(optionalEnv(TEST_KEY, "fallback-ws"), "fallback-ws");
      } finally {
        delete process.env[TEST_KEY];
      }
    });
  });

  describe("Configuration Predicates with Empty / Whitespace Inputs", () => {
    it("isSupabaseConfigured handles empty or whitespace values safely", () => {
      const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      try {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
        assert.strictEqual(isSupabaseConfigured(), false);

        process.env.NEXT_PUBLIC_SUPABASE_URL = "   ";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "   ";
        assert.strictEqual(isSupabaseConfigured(), false);
      } finally {
        if (origUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
        else delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (origKey !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origKey;
        else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      }
    });

    it("isSupabaseAdminConfigured handles empty or whitespace values safely", () => {
      const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      try {
        process.env.SUPABASE_SERVICE_ROLE_KEY = "";
        assert.strictEqual(isSupabaseAdminConfigured(), false);

        process.env.SUPABASE_SERVICE_ROLE_KEY = "   ";
        assert.strictEqual(isSupabaseAdminConfigured(), false);
      } finally {
        if (origKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
        else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      }
    });

    it("isVapidConfigured handles empty or whitespace values safely", () => {
      const origPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const origPriv = process.env.VAPID_PRIVATE_KEY;
      try {
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "";
        process.env.VAPID_PRIVATE_KEY = "";
        assert.strictEqual(isVapidConfigured(), false);
      } finally {
        if (origPub !== undefined) process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = origPub;
        else delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (origPriv !== undefined) process.env.VAPID_PRIVATE_KEY = origPriv;
        else delete process.env.VAPID_PRIVATE_KEY;
      }
    });

    it("isCronSecretConfigured handles empty or whitespace values safely", () => {
      const origSecret = process.env.CRON_SECRET;
      try {
        process.env.CRON_SECRET = "";
        assert.strictEqual(isCronSecretConfigured(), false);

        process.env.CRON_SECRET = "   ";
        assert.strictEqual(isCronSecretConfigured(), false);
      } finally {
        if (origSecret !== undefined) process.env.CRON_SECRET = origSecret;
        else delete process.env.CRON_SECRET;
      }
    });
  });
});
