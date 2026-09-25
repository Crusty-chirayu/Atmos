"use client";

import { useEffect } from "react";

/**
 * ATMOS root error boundary.
 * Catches unexpected runtime errors in the root layout tree.
 * Per AGENT_RULES §4: every route must have a designed error state.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO (M8): pipe to structured observability/error reporting
    console.error("[ATMOS] Unhandled error:", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en" data-theme="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#04060d",
          color: "#eef4fb",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480 }}>
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
              marginBottom: "0.75rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#8aace0",
              marginBottom: "1.5rem",
              lineHeight: 1.6,
            }}
          >
            ATMOS encountered an unexpected error. Your data is safe.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#5a7eb5",
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
              background: "#00d4ff",
              color: "#04060d",
              border: "none",
              borderRadius: "0.5rem",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
