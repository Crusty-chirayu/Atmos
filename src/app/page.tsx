import { WeatherDashboard } from "@/components/weather/weather-dashboard";

/**
 * ATMOS — Primary Global Weather Intelligence Interface (M2-T3 Dashboard)
 *
 * Full interactive weather platform connecting global geocoding with
 * live Open-Meteo forecasts, hourly progressions, 7-day outlooks, and meteorological telemetry.
 */
export default function HomePage() {
  return (
    <div className="bg-atmospheric flex-1 flex flex-col items-center justify-start min-h-screen">
      {/* Brand Navigation Header */}
      <header className="w-full max-w-5xl mx-auto px-4 pt-8 pb-4 flex items-center justify-between border-b border-atmos-700/20">
        <div className="flex items-center gap-3">
          <span className="font-display font-black text-2xl sm:text-3xl tracking-tight text-gradient">
            ATMOS
          </span>
          <span
            className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium"
            style={{
              background: "rgb(0 212 255 / 0.1)",
              color: "var(--color-accent-400)",
              border: "1px solid rgb(0 212 255 / 0.2)",
            }}
          >
            Global Weather Intelligence
          </span>
        </div>

        <div
          className="flex items-center gap-2 text-xs font-mono"
          style={{ color: "var(--text-muted)" }}
        >
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full inline-block bg-success-500 animate-pulse"
          />
          <span className="hidden sm:inline">Engine Active · Open-Meteo</span>
        </div>
      </header>

      {/* Main Interactive Weather Dashboard */}
      <main className="w-full flex-1 flex flex-col">
        <WeatherDashboard />
      </main>
    </div>
  );
}
