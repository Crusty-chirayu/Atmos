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
        className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs ${
          isSaved
            ? "border border-[#FFC928] text-[#222222] bg-[#FFF9E6]"
            : "bg-white border border-[#E5E7EB] hover:bg-[#F7F7F7] text-[#222222]"
        }`}
      >
        {isProcessing ? (
          <svg
            className="w-3.5 h-3.5 animate-spin text-[#6B7280]"
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
            className="w-3.5 h-3.5 fill-[#FFC928] text-[#FFC928]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5 text-[#6B7280]"
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
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 rounded-lg bg-white p-4 shadow-lg border border-[#E5E7EB] z-50"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4
              id="save-prompt-heading"
              className="text-xs font-bold text-[#222222]"
            >
              Save Location
            </h4>
            <button
              type="button"
              onClick={() => setShowSignInPrompt(false)}
              className="text-[#9CA3AF] hover:text-[#222222] p-0.5 text-xs"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
          <p className="text-xs mb-3 leading-relaxed text-[#6B7280]">
            Sign in or create an account to bookmark{" "}
            <strong>{location.name}</strong> and access your weather across
            devices.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="flex-1 py-1.5 px-3 rounded-md bg-[#FFC928] text-[#222222] font-semibold text-xs text-center hover:bg-[#F2B900] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex-1 py-1.5 px-3 rounded-md bg-[#F7F7F7] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-xs text-center text-[#222222] transition-colors"
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
          className="absolute left-0 mt-1.5 whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] shadow-sm z-40"
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
}
