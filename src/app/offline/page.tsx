"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getOnlineServerSnapshot() {
  return true;
}

export default function OfflinePage() {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );

  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div
      className="bg-white flex-1 flex flex-col items-center justify-center px-4 py-20 text-center"
      role="main"
      aria-labelledby="offline-heading"
    >
      <div
        className="w-16 h-16 rounded-full bg-[#F7F7F7] border border-[#E5E7EB] flex items-center justify-center mb-6 shadow-xs"
        aria-hidden="true"
      >
        <svg
          className="w-8 h-8 text-[#6B7280]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-1.414-1.414M3 3l18 18"
          />
        </svg>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]">
        <span className="w-2 h-2 rounded-full bg-[#FFC928]" />
        Offline Mode
      </div>

      <h1
        id="offline-heading"
        className="font-bold mb-3 text-[#222222] text-2xl sm:text-3xl tracking-tight"
      >
        No Internet Connection
      </h1>

      <p className="mb-6 max-w-md text-[#6B7280] text-sm sm:text-base leading-relaxed">
        {isOnline ? (
          <span className="text-[#059669] font-medium">
            Internet connection re-established! Click retry to resume live
            feeds.
          </span>
        ) : (
          "ATMOS cannot connect to weather services. You are currently offline. Cached forecasts and saved locations remain accessible, but live radar and AI updates are paused."
        )}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleRetry}
          className="px-5 py-2.5 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Retry Connection
        </button>

        <Link
          href="/"
          className="px-5 py-2.5 rounded-md bg-[#F7F7F7] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-sm font-medium text-[#222222] transition-colors"
        >
          Return Home
        </Link>
      </div>

      <div className="mt-12 bg-[#F7F7F7] border border-[#E5E7EB] rounded-lg p-4 max-w-sm text-left text-xs text-[#6B7280]">
        <div className="flex items-center gap-2 text-[#222222] font-semibold mb-1">
          <svg
            className="w-4 h-4 text-[#FFC928]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Offline Availability
        </div>
        Forecast data previously retrieved is safely cached in your local browser storage.
      </div>
    </div>
  );
}
