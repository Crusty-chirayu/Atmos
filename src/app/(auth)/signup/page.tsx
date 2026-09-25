"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { SignupSchema } from "@/lib/auth/validation";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextTarget =
    rawNext &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.includes(":")
      ? rawNext
      : "/account";

  const { signUp, isConfigured } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = SignupSchema.safeParse({
      email,
      password,
      displayName: displayName || undefined,
    });

    if (!validation.success) {
      const issue = validation.error.issues[0];
      setErrorMessage(issue?.message || "Invalid input.");
      return;
    }

    setIsSubmitting(true);
    const res = await signUp(email, password, displayName);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || "Failed to create account.");
      return;
    }

    if (res.needsVerification) {
      setVerificationPending(true);
      return;
    }

    router.push(nextTarget);
  };

  if (verificationPending) {
    return (
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl glass-panel relative overflow-hidden shadow-2xl border border-atmos-700/30 text-center">
        <div className="w-12 h-12 rounded-2xl bg-accent-500/10 border border-accent-500/30 text-accent-400 mx-auto flex items-center justify-center mb-4">
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
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-text-primary mb-2">
          Verify your email
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-6">
          We&apos;ve sent a confirmation link to{" "}
          <strong className="text-text-primary">{email}</strong>. Please check
          your inbox and click the link to activate your ATMOS account.
        </p>
        <Link
          href="/login"
          className="inline-block py-2.5 px-6 rounded-xl bg-accent-500 text-atmos-950 font-bold text-xs hover:bg-accent-400 transition-colors"
        >
          Proceed to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl glass-panel relative overflow-hidden shadow-2xl border border-atmos-700/30">
      {/* Atmosphere Glow */}
      <div
        aria-hidden="true"
        className="absolute -top-24 -right-24 w-56 h-56 rounded-full pointer-events-none opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, #00d4ff 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <div className="text-center mb-6">
        <Link
          href="/"
          className="inline-block font-display font-black text-3xl tracking-tight text-gradient mb-2"
        >
          ATMOS
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
          Create an account
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Save your favourite planetary coordinates and custom display settings
        </p>
      </div>

      {!isConfigured && (
        <div
          role="status"
          className="mb-6 p-3.5 rounded-2xl glass border border-warning-500/30 text-warning-300 text-xs flex items-start gap-2.5"
        >
          <svg
            className="w-4 h-4 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p className="font-semibold">Local Environment Notice</p>
            <p className="mt-0.5 text-text-secondary text-[11px] leading-relaxed">
              Supabase Auth is unconfigured. Full account creation requires
              configured Supabase environment keys. Anonymous browsing is
              available without an account.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-3 rounded-2xl bg-error-500/10 border border-error-500/30 text-error-400 text-xs flex items-center gap-2 animate-in fade-in duration-150"
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="signup-name"
            className="block text-xs font-mono text-text-secondary mb-1.5"
          >
            Display name (optional)
          </label>
          <input
            id="signup-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ada Lovelace"
            className="w-full px-3.5 py-2.5 rounded-xl glass border border-atmos-700/40 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="signup-email"
            className="block text-xs font-mono text-text-secondary mb-1.5"
          >
            Email address
          </label>
          <input
            id="signup-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            className="w-full px-3.5 py-2.5 rounded-xl glass border border-atmos-700/40 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500 transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="signup-password"
            className="block text-xs font-mono text-text-secondary mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
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
              {showPassword ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-text-muted">
            Must contain at least 8 characters, one capital letter, and one
            number.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-accent-500 hover:bg-accent-400 text-atmos-950 font-bold text-sm tracking-tight shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Creating Account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      {/* Footer Links */}
      <div className="mt-6 pt-5 border-t border-atmos-700/20 text-center text-xs text-text-secondary">
        Already have an account?{" "}
        <Link
          href={`/login${nextTarget !== "/account" ? `?next=${encodeURIComponent(nextTarget)}` : ""}`}
          className="text-accent-400 font-semibold hover:text-accent-300 transition-colors"
        >
          Sign in
        </Link>
      </div>

      <div className="mt-3 text-center">
        <Link
          href="/"
          className="text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors"
        >
          ← Return to public weather observation
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative z-10">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 rounded-3xl glass-panel animate-pulse h-96" />
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  );
}
