"use client";

import { useEffect } from "react";

/**
 * ATMOS root error boundary.
 * Catches unexpected runtime errors in the root layout tree.
 * Clean, bright consumer error state.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ATMOS] Unhandled error:", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFFFFF",
          color: "#222222",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <p
            aria-hidden="true"
            style={{ fontSize: "3rem", marginBottom: "1rem" }}
          >
            ⛅
          </p>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
              color: "#222222",
              letterSpacing: "-0.01em",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#6B7280",
              fontSize: "0.9375rem",
              marginBottom: "1.5rem",
              lineHeight: 1.6,
            }}
          >
            ATMOS encountered an unexpected error loading weather data. Please
            try refreshing.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#9CA3AF",
                marginBottom: "1.5rem",
                fontFamily: "monospace",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              background: "#FFC928",
              color: "#222222",
              border: "1px solid #E5E7EB",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
              transition: "background-color 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#F2B900")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#FFC928")}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
