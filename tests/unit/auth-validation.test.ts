import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LoginSchema,
  SignupSchema,
  PasswordResetRequestSchema,
  UpdatePasswordSchema,
  SavedLocationInputSchema,
  UpdateUserPreferencesSchema,
} from "../../src/lib/auth/validation";
import { validateRedirectTarget } from "../../src/app/api/auth/callback/route";
import { normalizeAuthError } from "../../src/lib/auth/error-handler";

describe("Auth Validation Schemas", () => {
  describe("LoginSchema", () => {
    it("accepts valid email and password", () => {
      const result = LoginSchema.safeParse({
        email: "user@example.com",
        password: "password123",
      });
      assert.equal(result.success, true);
    });

    it("trims whitespace from email address", () => {
      const result = LoginSchema.parse({
        email: "  user@example.com  ",
        password: "password123",
      });
      assert.equal(result.email, "user@example.com");
    });

    it("rejects invalid email formats", () => {
      const result = LoginSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      assert.equal(result.success, false);
    });

    it("rejects password shorter than 6 characters", () => {
      const result = LoginSchema.safeParse({
        email: "user@example.com",
        password: "123",
      });
      assert.equal(result.success, false);
    });
  });

  describe("SignupSchema", () => {
    it("accepts strong password meeting all criteria", () => {
      const result = SignupSchema.safeParse({
        email: "newuser@example.com",
        password: "ValidPass123",
        displayName: "Meteorologist",
      });
      assert.equal(result.success, true);
    });

    it("rejects password without uppercase letter", () => {
      const result = SignupSchema.safeParse({
        email: "user@example.com",
        password: "password123",
      });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error.issues[0]?.message ?? "", /uppercase/i);
      }
    });

    it("rejects password without number", () => {
      const result = SignupSchema.safeParse({
        email: "user@example.com",
        password: "PasswordWithoutNumber",
      });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.match(result.error.issues[0]?.message ?? "", /number/i);
      }
    });

    it("rejects password shorter than 8 characters", () => {
      const result = SignupSchema.safeParse({
        email: "user@example.com",
        password: "P1a",
      });
      assert.equal(result.success, false);
    });

    it("allows omitting optional displayName", () => {
      const result = SignupSchema.safeParse({
        email: "user@example.com",
        password: "ValidPass123",
      });
      assert.equal(result.success, true);
    });
  });

  describe("PasswordResetRequestSchema & UpdatePasswordSchema", () => {
    it("validates valid password reset email request", () => {
      const result = PasswordResetRequestSchema.safeParse({
        email: "recover@domain.org",
      });
      assert.equal(result.success, true);
    });

    it("validates new password update meets complexity", () => {
      const result = UpdatePasswordSchema.safeParse({
        password: "SuperSecret99",
      });
      assert.equal(result.success, true);
    });
  });

  describe("SavedLocationInputSchema", () => {
    it("accepts valid location within geographic boundaries", () => {
      const result = SavedLocationInputSchema.safeParse({
        name: "Reykjavík",
        country: "Iceland",
        country_code: "IS",
        admin_area: "Capital Region",
        latitude: 64.1466,
        longitude: -21.9426,
        timezone: "Atlantic/Reykjavik",
        label: "Nordic Base",
        display_order: 0,
      });
      assert.equal(result.success, true);
    });

    it("rejects latitude out of bounds (> 90)", () => {
      const result = SavedLocationInputSchema.safeParse({
        name: "North of Pole",
        latitude: 91.5,
        longitude: 0,
      });
      assert.equal(result.success, false);
    });

    it("rejects longitude out of bounds (< -180)", () => {
      const result = SavedLocationInputSchema.safeParse({
        name: "Past Antimeridian",
        latitude: 0,
        longitude: -185.0,
      });
      assert.equal(result.success, false);
    });

    it("rejects empty location name", () => {
      const result = SavedLocationInputSchema.safeParse({
        name: "   ",
        latitude: 48.8566,
        longitude: 2.3522,
      });
      assert.equal(result.success, false);
    });
  });

  describe("UpdateUserPreferencesSchema", () => {
    it("accepts valid unit and theme combinations", () => {
      const result = UpdateUserPreferencesSchema.safeParse({
        temperature_unit: "fahrenheit",
        wind_speed_unit: "mph",
        precipitation_unit: "inch",
        theme: "light",
        reduced_motion: true,
      });
      assert.equal(result.success, true);
    });

    it("rejects invalid temperature unit", () => {
      const result = UpdateUserPreferencesSchema.safeParse({
        temperature_unit: "kelvin",
      });
      assert.equal(result.success, false);
    });

    it("rejects invalid theme name", () => {
      const result = UpdateUserPreferencesSchema.safeParse({
        theme: "neon-cyberpunk",
      });
      assert.equal(result.success, false);
    });
  });
});

describe("validateRedirectTarget (Open Redirect Prevention)", () => {
  it("allows safe internal relative paths", () => {
    assert.equal(validateRedirectTarget("/account"), "/account");
    assert.equal(validateRedirectTarget("/weather"), "/weather");
    assert.equal(
      validateRedirectTarget("/?lat=48.8&lon=2.3"),
      "/?lat=48.8&lon=2.3"
    );
  });

  it("falls back to root for null or empty string", () => {
    assert.equal(validateRedirectTarget(null), "/");
    assert.equal(validateRedirectTarget(""), "/");
    assert.equal(validateRedirectTarget("   "), "/");
  });

  it("blocks protocol-relative URLs (//evil.com)", () => {
    assert.equal(validateRedirectTarget("//evil.com"), "/");
    assert.equal(validateRedirectTarget("//evil.com/phishing"), "/");
  });

  it("blocks Windows backslash relative tricks (/\\evil.com)", () => {
    assert.equal(validateRedirectTarget("/\\evil.com"), "/");
  });

  it("blocks absolute external URLs (https://attacker.org)", () => {
    assert.equal(validateRedirectTarget("https://attacker.org"), "/");
    assert.equal(validateRedirectTarget("http://evil.com"), "/");
    assert.equal(validateRedirectTarget("javascript:alert(1)"), "/");
  });
});

describe("normalizeAuthError", () => {
  it("maps invalid credentials to 401 with user-friendly message", () => {
    const error = normalizeAuthError({
      message: "Invalid login credentials",
      status: 400,
    });
    assert.equal(error.code, "INVALID_CREDENTIALS");
    assert.equal(error.statusCode, 401);
    assert.match(error.message, /invalid email or password/i);
  });

  it("maps duplicate account error to 409 USER_ALREADY_EXISTS", () => {
    const error = normalizeAuthError({
      message: "User already registered",
      status: 422,
    });
    assert.equal(error.code, "USER_ALREADY_EXISTS");
    assert.equal(error.statusCode, 409);
  });

  it("maps rate limiting errors to 429 RATE_LIMITED", () => {
    const error = normalizeAuthError({
      message:
        "For security purposes, you can only request this once every 60 seconds",
      status: 429,
    });
    assert.equal(error.code, "RATE_LIMITED");
    assert.equal(error.statusCode, 429);
  });

  it("maps unconfirmed email to 403 EMAIL_NOT_CONFIRMED", () => {
    const error = normalizeAuthError({
      message: "Email not confirmed",
      status: 400,
    });
    assert.equal(error.code, "EMAIL_NOT_CONFIRMED");
    assert.equal(error.statusCode, 403);
  });

  it("returns safe internal error without leaking database internals", () => {
    const error = normalizeAuthError({
      message:
        "FATAL: connection to server at '10.0.0.1' failed: password authentication failed",
      status: 500,
    });
    assert.equal(error.code, "INTERNAL_ERROR");
    assert.equal(error.statusCode, 500);
    assert.equal(error.message.includes("10.0.0.1"), false);
  });
});
