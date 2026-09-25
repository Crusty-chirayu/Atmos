import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you requested could not be found.",
};

/**
 * ATMOS 404 — not-found page.
 * Per AGENT_RULES §4: every route has a designed empty/not-found state.
 */
export default function NotFound() {
  return (
    <div
      className="bg-atmospheric flex-1 flex flex-col items-center justify-center px-4 py-20 text-center"
      role="main"
      aria-labelledby="not-found-heading"
    >
      <p
        aria-hidden="true"
        style={{ fontSize: "4rem", marginBottom: "1rem", lineHeight: 1 }}
      >
        🌫️
      </p>

      <h1
        id="not-found-heading"
        className="font-display font-bold mb-3"
        style={{
          fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
          color: "var(--text-primary)",
        }}
      >
        Lost in the clouds
      </h1>

      <p
        className="mb-8 max-w-sm"
        style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}
      >
        That page doesn&apos;t exist in our forecast. The URL may be wrong or
        the page may have moved.
      </p>

      <Link
        href="/"
        className="glass inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium"
        style={{
          color: "#00d4ff",
          textDecoration: "none",
          transition: "box-shadow 200ms ease",
        }}
      >
        ← Back to ATMOS
      </Link>
    </div>
  );
}
