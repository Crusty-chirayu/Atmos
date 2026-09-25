/**
 * ATMOS root loading state.
 * Shown while the root route segment suspends.
 * Per AGENT_RULES §4 & UI_UX.md §7: all data-backed views
 * must have loading, skeleton, or transition states.
 */
export default function Loading() {
  return (
    <div
      className="flex-1 flex items-center justify-center min-h-dvh bg-atmospheric"
      aria-label="Loading ATMOS"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-5">
        {/* Animated wordmark */}
        <span
          className="font-display font-bold text-gradient"
          style={{
            fontSize: "clamp(2rem, 6vw, 4rem)",
            letterSpacing: "-0.02em",
            animation: "atmos-pulse 2s ease-in-out infinite",
          }}
          aria-hidden="true"
        >
          ATMOS
        </span>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-label="Loading"
          style={{
            width: "8rem",
            height: "2px",
            background: "var(--border-subtle)",
            borderRadius: "1px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, #00d4ff, transparent)",
              animation: "atmos-shimmer 1.4s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes atmos-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes atmos-shimmer {
          0% { transform: translateX(-200%); }
          100% { transform: translateX(200%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="atmos-pulse"],
          [style*="atmos-shimmer"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
