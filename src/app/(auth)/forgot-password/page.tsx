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
    <div className="min-h-dvh flex items-center justify-center p-4 bg-white relative z-10">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-lg bg-white relative overflow-hidden shadow-xs border border-[#E5E7EB]">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-3 focus:outline-none"
          >
            <span className="w-3 h-3 rounded-full bg-[#FFC928]" />
            <span className="font-bold text-2xl tracking-tight text-[#222222]">
              ATMOS
            </span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#222222]">
            Reset your password
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Enter your email and we&apos;ll send you a secure link to recover
            your account
          </p>
        </div>

        {isSuccess ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] mx-auto flex items-center justify-center mb-4">
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
            <h2 className="text-base font-bold text-[#222222] mb-2">
              Recovery link dispatched
            </h2>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-6">
              If an account is associated with <strong>{email}</strong>, you
              will receive instructions shortly. Please check your spam folder
              if it doesn&apos;t arrive within a few minutes.
            </p>
            <Link
              href="/login"
              className="inline-block py-2.5 px-5 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] font-semibold text-xs transition-colors"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-md bg-[#FFF5F5] border border-[#FED7D7] text-[#D94841] text-xs flex items-center gap-2"
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
                className="block text-xs font-semibold text-[#222222] mb-1.5"
              >
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-3.5 py-2.5 rounded-md bg-white border border-[#E5E7EB] text-sm text-[#222222] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FFC928] focus:ring-1 focus:ring-[#FFC928] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? "Sending link..." : "Send Password Reset Link"}
            </button>

            <div className="pt-4 text-center">
              <Link
                href="/login"
                className="text-xs text-[#6B7280] hover:text-[#222222] transition-colors"
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
