"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/auth/supabase-client";
import { normalizeAuthError } from "@/lib/auth/error-handler";
import { UpdatePasswordSchema } from "@/lib/auth/validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const validation = UpdatePasswordSchema.safeParse({ password });
    if (!validation.success) {
      setErrorMessage(
        validation.error.issues[0]?.message || "Password is invalid."
      );
      return;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setErrorMessage("Authentication service unavailable.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      setIsSubmitting(false);

      if (error) {
        const normalized = normalizeAuthError(error);
        setErrorMessage(normalized.message);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/account");
      }, 2000);
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
            Set new password
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Choose a strong, secure password for your ATMOS account
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
              Password updated!
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Your password has been changed. Redirecting to your account
              dashboard...
            </p>
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
                htmlFor="new-password"
                className="block text-xs font-mono text-text-secondary mb-1.5"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl glass border border-atmos-700/40 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-mono text-text-secondary mb-1.5"
              >
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full px-3.5 py-2.5 rounded-xl glass border border-atmos-700/40 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-accent-500 hover:bg-accent-400 text-atmos-950 font-bold text-sm tracking-tight shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
