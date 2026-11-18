/**
 * ATMOS root loading state.
 * Clean, lightweight consumer weather loading indicator.
 */
export default function Loading() {
  return (
    <div
      className="flex-1 flex items-center justify-center min-h-dvh bg-white"
      aria-label="Loading ATMOS"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Clean brand logo */}
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#FFC928]" />
          <span className="font-bold text-2xl tracking-tight text-[#222222]">
            ATMOS
          </span>
        </div>

        {/* Clean loading spinner */}
        <div
          role="progressbar"
          aria-label="Loading weather data"
          className="w-6 h-6 border-2 border-[#E5E7EB] border-t-[#FFC928] rounded-full animate-spin"
        />
        <span className="text-xs text-[#6B7280]">
          Updating forecast data...
        </span>
      </div>
    </div>
  );
}
