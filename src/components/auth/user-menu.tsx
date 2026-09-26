"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";

export function UserMenu() {
  const { user, profile, savedLocations, signOut, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (isLoading) {
    return (
      <div
        className="w-8 h-8 rounded-md bg-[#F7F7F7] border border-[#E5E7EB] animate-pulse"
        aria-hidden="true"
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-3 py-1.5 rounded-md bg-white hover:bg-[#F7F7F7] border border-[#E5E7EB] text-xs font-semibold text-[#222222] transition-colors flex items-center gap-1.5 shadow-xs"
      >
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
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span>Sign In</span>
      </Link>
    );
  }

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`User menu for ${displayName}`}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white hover:bg-[#F7F7F7] border border-[#E5E7EB] transition-colors focus:outline-none focus:ring-1 focus:ring-[#FFC928] shadow-xs"
      >
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-[#FFF9E6] border border-[#FFC928] text-[#222222]">
          {initials}
        </div>
        <span className="hidden sm:inline-block text-xs font-medium text-[#222222] max-w-[100px] truncate">
          {displayName}
        </span>
        <svg
          className={`w-3 h-3 text-[#6B7280] transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1.5 w-56 rounded-md bg-white p-1.5 shadow-md z-50 border border-[#E5E7EB]"
        >
          {/* User Info Header */}
          <div className="px-3 py-2 border-b border-[#E5E7EB]">
            <p className="text-xs font-bold text-[#222222] truncate">
              {displayName}
            </p>
            <p className="text-xs text-[#6B7280] truncate">
              {user.email}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-[#222222] hover:bg-[#F7F7F7] transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#6B7280]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Account &amp; Settings
              </span>
            </Link>

            <Link
              href="/account#saved-locations"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-[#222222] hover:bg-[#F7F7F7] transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[#6B7280]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                Saved Locations
              </span>
              {savedLocations.length > 0 && (
                <span className="px-1.5 py-0.2 rounded text-xs font-semibold bg-[#F7F7F7] text-[#222222] border border-[#E5E7EB]">
                  {savedLocations.length}
                </span>
              )}
            </Link>
          </div>

          <div className="border-t border-[#E5E7EB] pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setIsOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-[#D94841] hover:bg-[#FFF5F5] transition-colors text-left"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
