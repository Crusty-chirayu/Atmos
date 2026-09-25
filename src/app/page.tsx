/**
 * ATMOS — Homepage stub (M1 foundation)
 *
 * The cinematic homepage (M3) will replace this.
 * This stub verifies the shell renders, theme works, and
 * routing is functional without any mock weather data.
 */
export default function HomePage() {
  return (
    <div className="bg-atmospheric flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
      {/* Hero wordmark */}
      <h1 className="font-display font-bold tracking-tight mb-4">
        <span
          className="text-gradient"
          style={{ fontSize: "clamp(3rem, 10vw, 7rem)", lineHeight: 1 }}
        >
          ATMOS
        </span>
      </h1>

      <p
        className="max-w-lg mx-auto mb-8"
        style={{
          color: "var(--text-secondary)",
          fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
          lineHeight: 1.7,
        }}
      >
        Global AI-powered weather intelligence.
        <br />
        <span style={{ color: "var(--text-muted)", fontSize: "0.9em" }}>
          Foundation scaffold — cinematic homepage coming in M3.
        </span>
      </p>

      {/* Status badge */}
      <div
        className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#22d3a4",
            display: "inline-block",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
        M1 Foundation · Next.js 16 · React 19 · Tailwind v4
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="pulse"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
