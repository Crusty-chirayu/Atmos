"use client";

import React, { useState } from "react";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/auth/supabase-client";
import { normalizeAuthError } from "@/lib/auth/error-handler";
import { PasswordResetRequestSchema } from "@/lib/auth/validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = PasswordResetRequestSchema.safeParse({ email });
    if (!validation.success) {
      setErrorMessage(
        validation.error.issues[0]?.message || "Invalid email address"
      );
      return;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setErrorMessage("Authentication service is currently unconfigured.");
      return;
    }

    setIsSubmitting(true);
    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      setIsSubmitting(false);

      if (error) {
        const normalized = normalizeAuthError(error);
        setErrorMessage(normalized.message);
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      setIsSubmitting(false);
      const normalized = normalizeAuthError(err);
      setErrorMessage(normalized.message);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl glass-panel relative overflow-hidden shadow-2xl border border-atmos-700/30">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-block font-display font-black text-3xl tracking-tight text-gradient mb-2"
          >
            ATMOS
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Reset your password
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Enter your email and we&apos;ll send you a secure link to recover
            your account
          </p>
        </div>

        {isSuccess ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-success-500/10 border border-success-500/30 text-success-400 mx-auto flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-base font-bold text-text-primary mb-2">
              Recovery link dispatched
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed mb-6">
              If an account is associated with <strong>{email}</strong>, you
              will receive instructions shortly. Please check your spam folder
              if it doesn&apos;t arrive within a few minutes.
            </p>
            <Link
              href="/login"
              className="inline-block py-2 px-5 rounded-xl bg-accent-500 text-atmos-950 font-bold text-xs hover:bg-accent-400 transition-colors"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 rounded-2xl bg-error-500/10 border border-error-500/30 text-error-400 text-xs flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-mono text-text-secondary mb-1.5"
              >
                Registered Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-3.5 py-2.5 rounded-xl glass border border-atmos-700/40 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-accent-500 hover:bg-accent-400 text-atmos-950 font-bold text-sm tracking-tight shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? "Sending link..." : "Send Password Reset Link"}
            </button>

            <div className="pt-4 text-center">
              <Link
                href="/login"
                className="text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                ← Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
