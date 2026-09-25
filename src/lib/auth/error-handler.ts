/**
 * ATMOS M4: Authentication & Database Error Handler
 *
 * Normalizes Supabase / PostgreSQL errors into user-safe AuthErrorInfo.
 * Never exposes raw SQL errors, stack traces, or credentials to client.
 */

import type { AuthErrorInfo } from "./types";

export function normalizeAuthError(error: unknown): AuthErrorInfo {
  if (!error) {
    return {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred. Please try again.",
      statusCode: 500,
    };
  }

  // Handle standard error objects or Supabase AuthError
  const err = error as { message?: string; status?: number; code?: string };
  const rawMsg = (err.message ?? "").toLowerCase();
  const rawCode = (err.code ?? "").toLowerCase();

  // Invalid login credentials
  if (
    rawMsg.includes("invalid login credentials") ||
    rawMsg.includes("invalid grant") ||
    rawMsg.includes("invalid_credentials")
  ) {
    return {
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password. Please verify your credentials.",
      statusCode: 401,
    };
  }

  // User already registered
  if (
    rawMsg.includes("user already registered") ||
    rawMsg.includes("user_already_exists") ||
    rawMsg.includes("already registered")
  ) {
    return {
      code: "USER_ALREADY_EXISTS",
      message: "An account with this email address already exists.",
      statusCode: 409,
    };
  }

  // Weak password
  if (
    rawMsg.includes("weak password") ||
    rawMsg.includes("password should be at least")
  ) {
    return {
      code: "WEAK_PASSWORD",
      message: "Password does not meet minimum security requirements.",
      statusCode: 400,
    };
  }

  // Email unconfirmed
  if (
    rawMsg.includes("email not confirmed") ||
    rawMsg.includes("email_not_confirmed")
  ) {
    return {
      code: "EMAIL_NOT_CONFIRMED",
      message:
        "Please check your inbox to confirm your email before signing in.",
      statusCode: 403,
    };
  }

  // Rate limiting
  if (
    rawMsg.includes("too many requests") ||
    rawMsg.includes("rate limit") ||
    err.status === 429
  ) {
    return {
      code: "RATE_LIMITED",
      message: "Too many attempts. Please wait a few moments and try again.",
      statusCode: 429,
    };
  }

  // Session expired or invalid
  if (
    rawMsg.includes("jwt expired") ||
    rawMsg.includes("invalid refresh token") ||
    rawMsg.includes("session expired")
  ) {
    return {
      code: "SESSION_EXPIRED",
      message: "Your session has expired. Please sign in again.",
      statusCode: 401,
    };
  }

  // Not authenticated
  if (rawMsg.includes("not authenticated") || rawMsg.includes("unauthorized")) {
    return {
      code: "NOT_AUTHENTICATED",
      message: "You must be signed in to perform this action.",
      statusCode: 401,
    };
  }

  // Supabase unconfigured
  if (
    rawMsg.includes("supabase unconfigured") ||
    rawCode === "not_configured"
  ) {
    return {
      code: "NOT_CONFIGURED",
      message:
        "Account persistence is currently unavailable in this environment.",
      statusCode: 503,
    };
  }

  // Default safe error
  return {
    code: "INTERNAL_ERROR",
    message: "Unable to complete request. Please try again later.",
    statusCode:
      err.status && err.status >= 400 && err.status < 600 ? err.status : 500,
  };
}
