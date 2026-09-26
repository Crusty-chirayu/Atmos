"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { LoginSchema } from "@/lib/auth/validation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextTarget =
    rawNext &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.includes(":")
      ? rawNext
      : "/";

  const { signIn, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = LoginSchema.safeParse({ email, password });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setErrorMessage(issue?.message || "Invalid input.");
      return;
    }

    setIsSubmitting(true);
    const res = await signIn(email, password);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || "Failed to sign in.");
      return;
    }

    router.push(nextTarget);
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-lg bg-white relative overflow-hidden shadow-xs border border-[#E5E7EB]">
      {/* Header */}
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
          Sign in to your account
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
          Access your saved locations and custom preferences
        </p>
      </div>

      {!isConfigured && (
        <div
          role="status"
          className="mb-5 p-3.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs flex items-start gap-2.5"
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
            <p className="mt-0.5 text-[#B45309] text-xs leading-relaxed">
              Supabase Auth is unconfigured in this environment. Anonymous weather exploration remains fully operational.
            </p>
          </div>
        </div>
      )}

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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-[#222222] mb-1.5"
          >
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            className="w-full px-3.5 py-2.5 rounded-md bg-white border border-[#E5E7EB] text-sm text-[#222222] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FFC928] focus:ring-1 focus:ring-[#FFC928] transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-[#222222]"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#6B7280] hover:text-[#222222] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 pr-10 rounded-md bg-white border border-[#E5E7EB] text-sm text-[#222222] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FFC928] focus:ring-1 focus:ring-[#FFC928] transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
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
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-2.5 px-4 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
                  strokeWidth={4}
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      {/* Footer Links */}
      <div className="mt-6 pt-5 border-t border-[#E5E7EB] text-center text-xs text-[#6B7280]">
        Don&apos;t have an account?{" "}
        <Link
          href={`/signup${nextTarget !== "/" ? `?next=${encodeURIComponent(nextTarget)}` : ""}`}
          className="text-[#222222] font-semibold hover:underline"
        >
          Create an account
        </Link>
      </div>

      <div className="mt-3 text-center">
        <Link
          href="/"
          className="text-xs text-[#6B7280] hover:text-[#222222] transition-colors"
        >
          ← Return to weather home
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md p-8 rounded-lg bg-[#F7F7F7] border border-[#E5E7EB] animate-pulse h-96" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
