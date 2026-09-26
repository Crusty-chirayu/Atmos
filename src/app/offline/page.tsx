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
      className="bg-atmospheric flex-1 flex flex-col items-center justify-center px-4 py-20 text-center"
      role="main"
      aria-labelledby="offline-heading"
    >
      <div
        className="w-20 h-20 rounded-2xl glass flex items-center justify-center mb-6 shadow-glow-sm"
        aria-hidden="true"
      >
        <svg
          className="w-10 h-10 text-cyan-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-1.414-1.414M3 3l18 18"
          />
        </svg>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-4 glass border border-amber-500/30 text-amber-300">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        OFFLINE TELEMETRY MODE
      </div>

      <h1
        id="offline-heading"
        className="font-display font-bold mb-3 text-text-primary text-3xl sm:text-4xl"
      >
        Radar Signal Disconnected
      </h1>

      <p className="mb-6 max-w-md text-text-secondary text-sm sm:text-base leading-relaxed">
        {isOnline ? (
          <span className="text-emerald-400 font-medium">
            Internet connection re-established! Click retry to resume live
            feeds.
          </span>
        ) : (
          "ATMOS cannot reach live weather satellites. You are in offline mode. Cached forecasts and shell pages remain accessible, but live radar and AI updates are paused."
        )}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleRetry}
          className="btn-primary px-6 py-2.5 rounded-full text-sm font-medium shadow-glow flex items-center gap-2 cursor-pointer"
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
          className="glass px-5 py-2.5 rounded-full text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Return Home
        </Link>
      </div>

      <div className="mt-12 glass border border-surface-border rounded-xl p-4 max-w-sm text-left text-xs text-text-secondary">
        <div className="flex items-center gap-2 text-text-primary font-semibold mb-1">
          <svg
            className="w-3.5 h-3.5 text-cyan-400"
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
          Offline Architecture Tip
        </div>
        Atmospheric forecast packets retrieved within the last 30 minutes are
        preserved in your local Service Worker cache.
      </div>
    </div>
  );
}
