"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";

export interface SaveLocationButtonProps {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    country?: string | null;
    countryCode?: string | null;
    adminArea?: string | null;
    timezone?: string | null;
    id?: string | number | null;
  };
  className?: string;
}

export function SaveLocationButton({
  location,
  className = "",
}: SaveLocationButtonProps) {
  const { user, savedLocations, saveLocation, removeLocation } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Check if current location is in saved locations list
  const existingSaved = savedLocations.find(
    (l) =>
      Math.abs(Number(l.latitude) - location.latitude) < 0.001 &&
      Math.abs(Number(l.longitude) - location.longitude) < 0.001
  );

  const isSaved = Boolean(existingSaved);

  const handleToggle = async () => {
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    if (isSaved && existingSaved) {
      const res = await removeLocation(existingSaved.id);
      setIsProcessing(false);
      if (res.success) {
        setStatusMessage("Removed from saved locations");
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage(res.error || "Failed to remove");
      }
    } else {
      const res = await saveLocation(location);
      setIsProcessing(false);
      if (res.success) {
        setStatusMessage("Saved to your account");
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage(res.error || "Failed to save");
      }
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isProcessing}
        aria-label={
          isSaved
            ? `Remove ${location.name} from saved locations`
            : `Save ${location.name} to account`
        }
        className={`px-3 py-1.5 rounded-xl glass text-xs font-medium flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-accent-500 ${
          isSaved
            ? "border border-accent-500/40 text-accent-300 bg-accent-500/10"
            : "hover:bg-atmos-700/40 text-text-secondary hover:text-text-primary"
        }`}
      >
        {isProcessing ? (
          <svg
            className="w-3.5 h-3.5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : isSaved ? (
          <svg
            className="w-3.5 h-3.5 fill-current text-accent-400"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        )}
        <span>{isSaved ? "Saved" : "Save City"}</span>
      </button>

      {/* Anonymous Sign-in Prompt Dropdown */}
      {showSignInPrompt && (
        <div
          role="dialog"
          aria-labelledby="save-prompt-heading"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 rounded-2xl glass-panel p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{
            background: "var(--color-surface-overlay)",
            border: "1px solid var(--border-primary)",
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4
              id="save-prompt-heading"
              className="text-xs font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Save Location
            </h4>
            <button
              type="button"
              onClick={() => setShowSignInPrompt(false)}
              className="text-text-muted hover:text-text-primary p-0.5"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
          <p
            className="text-[11px] mb-3 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Sign in or create a free ATMOS account to save{" "}
            <strong>{location.name}</strong> and sync your weather across
            devices.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="flex-1 py-1.5 px-3 rounded-xl bg-accent-500 text-atmos-950 font-bold text-xs text-center hover:bg-accent-400 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex-1 py-1.5 px-3 rounded-xl glass text-xs text-center hover:bg-atmos-700/40 transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}

      {/* Status Toast / Message */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-0 mt-1.5 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-medium glass border border-accent-500/30 text-accent-300 z-40 animate-in fade-in duration-150"
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
}
