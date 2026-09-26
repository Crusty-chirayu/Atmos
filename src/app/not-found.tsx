import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | ATMOS",
  description: "The page you requested could not be found.",
};

/**
 * ATMOS 404 — not-found page.
 * Clean, bright consumer empty/not-found state.
 */
export default function NotFound() {
  return (
    <div
      className="bg-white flex-1 flex flex-col items-center justify-center px-4 py-20 text-center"
      role="main"
      aria-labelledby="not-found-heading"
    >
      <p
        aria-hidden="true"
        className="text-5xl mb-4 leading-none select-none"
      >
        🌤️
      </p>

      <h1
        id="not-found-heading"
        className="text-2xl sm:text-3xl font-bold mb-2 text-[#222222] tracking-tight"
      >
        Page Not Found
      </h1>

      <p className="mb-6 max-w-sm text-sm text-[#6B7280] leading-relaxed">
        The weather forecast or page you were looking for doesn&apos;t exist or may have been moved.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-sm font-semibold text-[#222222] transition-colors shadow-xs"
      >
        ← Back to Home
      </Link>
    </div>
  );
}
