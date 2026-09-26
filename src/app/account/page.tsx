"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import type {
  TemperatureUnit,
  WindSpeedUnit,
  PrecipitationUnit,
  ThemePreference,
} from "@/lib/auth/types";
import { AlertRulesManager } from "@/components/notifications/alert-rules-manager";
import { PushNotificationToggle } from "@/components/notifications/push-toggle";
import { PwaInstallButton } from "@/components/pwa/pwa-install-button";
import { DeveloperContactSection } from "@/components/common/developer-credit";

export default function AccountPage() {
  const router = useRouter();
  const {
    user,
    profile,
    preferences,
    savedLocations,
    isLoading,
    signOut,
    removeLocation,
    updatePreferences,
    deleteAccount,
  } = useAuth();

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [prefSaveStatus, setPrefSaveStatus] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-3xl p-8 rounded-lg bg-[#F7F7F7] border border-[#E5E7EB] animate-pulse h-96" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-lg bg-white border border-[#E5E7EB] shadow-xs text-center">
          <h2 className="text-xl font-bold mb-2 text-[#222222]">
            Sign In Required
          </h2>
          <p className="text-xs text-[#6B7280] mb-6">
            You must be signed in to manage your account and saved locations.
          </p>
          <Link
            href="/login"
            className="inline-block py-2.5 px-6 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] font-bold text-xs transition-colors shadow-xs"
          >
            Sign In to ATMOS
          </Link>
        </div>
      </div>
    );
  }

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User";

  const handlePrefChange = async (
    updates: Parameters<typeof updatePreferences>[0]
  ) => {
    setPrefSaveStatus("Saving...");
    const res = await updatePreferences(updates);
    if (res.success) {
      setPrefSaveStatus("Saved");
      setTimeout(() => setPrefSaveStatus(null), 2000);
    } else {
      setPrefSaveStatus("Error saving");
      setTimeout(() => setPrefSaveStatus(null), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    const res = await deleteAccount();
    setIsDeleting(false);

    if (res.success) {
      setShowDeleteModal(false);
      router.push("/");
    } else {
      setDeleteError(res.error || "Failed to delete account.");
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#222222] py-8 px-4 sm:px-6 max-w-4xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-xs text-[#6B7280] hover:text-[#222222] transition-colors"
            >
              ← Back to weather home
            </Link>
          </div>
          <h1 className="font-bold text-2xl sm:text-3xl tracking-tight text-[#222222]">
            Account &amp; Settings
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Manage your saved locations, units, and notifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PwaInstallButton />
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="px-3.5 py-2 rounded-md bg-[#F7F7F7] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-xs font-semibold text-[#222222] transition-colors flex items-center gap-1.5"
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
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <section
          aria-labelledby="profile-heading"
          className="p-5 sm:p-6 rounded-lg bg-white border border-[#E5E7EB] shadow-xs"
        >
          <h2
            id="profile-heading"
            className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-4"
          >
            Profile Information
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#FFF9E6] border border-[#FFC928] flex items-center justify-center text-base font-bold text-[#222222]">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-bold text-[#222222]">
                {displayName}
              </p>
              <p className="text-xs text-[#6B7280] mt-0.5">
                {user.email}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Account ID: {user.id.slice(0, 8)}...
              </p>
            </div>
          </div>
        </section>

        {/* Saved Locations Section */}
        <section
          id="saved-locations"
          aria-labelledby="locations-heading"
          className="p-5 sm:p-6 rounded-lg bg-white border border-[#E5E7EB] shadow-xs"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                id="locations-heading"
                className="text-xs font-bold uppercase tracking-wider text-[#6B7280]"
              >
                Saved Locations
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Saved cities for fast weather lookup
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#F7F7F7] text-[#222222] border border-[#E5E7EB]">
              {savedLocations.length} saved
            </span>
          </div>

          {savedLocations.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-[#E5E7EB] rounded-md p-6 bg-[#F7F7F7]">
              <svg
                className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-xs font-semibold text-[#222222]">
                No saved locations yet
              </p>
              <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
                Search for any city on the dashboard and click &ldquo;Save City&rdquo; to add it to your collection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-3.5 rounded-md bg-[#F7F7F7] border border-[#E5E7EB] flex items-center justify-between gap-3 hover:border-[#FFC928] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-[#222222] truncate">
                        {loc.name}
                      </h3>
                      {loc.country_code && (
                        <span className="px-1.5 py-0.2 rounded text-xs bg-white border border-[#E5E7EB] text-[#6B7280]">
                          {loc.country_code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5 tabular-nums">
                      {Number(loc.latitude).toFixed(2)}°,{" "}
                      {Number(loc.longitude).toFixed(2)}°
                    </p>
                    {loc.admin_area && (
                      <p className="text-xs text-[#6B7280] truncate">
                        {loc.admin_area}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link
                      href={`/?lat=${loc.latitude}&lon=${loc.longitude}&name=${encodeURIComponent(loc.name)}`}
                      className="px-2.5 py-1 rounded-md bg-[#FFF9E6] border border-[#FFC928] text-[#222222] text-xs font-semibold hover:bg-[#FFC928] transition-colors"
                      title="View live weather"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await removeLocation(loc.id);
                      }}
                      className="p-1 rounded-md text-[#6B7280] hover:text-[#D94841] hover:bg-[#FFF5F5] transition-colors"
                      title="Remove saved location"
                      aria-label={`Remove ${loc.name}`}
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Display Preferences Section */}
        <section
          aria-labelledby="preferences-heading"
          className="p-5 sm:p-6 rounded-lg bg-white border border-[#E5E7EB] shadow-xs"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                id="preferences-heading"
                className="text-xs font-bold uppercase tracking-wider text-[#6B7280]"
              >
                Measurement Units
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Default measurement systems for weather readings
              </p>
            </div>
            {prefSaveStatus && (
              <span className="text-xs font-semibold text-[#FFC928] animate-pulse">
                {prefSaveStatus}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Temperature Unit */}
            <div className="p-3.5 rounded-md bg-[#F7F7F7] border border-[#E5E7EB]">
              <label
                htmlFor="pref-temp-unit"
                className="block text-xs font-semibold text-[#222222] mb-1.5"
              >
                Temperature Units
              </label>
              <select
                id="pref-temp-unit"
                value={preferences.temperature_unit}
                onChange={(e) =>
                  handlePrefChange({
                    temperature_unit: e.target.value as TemperatureUnit,
                  })
                }
                className="w-full px-3 py-2 rounded-md bg-white border border-[#E5E7EB] text-xs text-[#222222] focus:outline-none focus:border-[#FFC928]"
              >
                <option value="celsius">Metric (°C — Celsius)</option>
                <option value="fahrenheit">Imperial (°F — Fahrenheit)</option>
              </select>
            </div>

            {/* Wind Speed Unit */}
            <div className="p-3.5 rounded-md bg-[#F7F7F7] border border-[#E5E7EB]">
              <label
                htmlFor="pref-wind-unit"
                className="block text-xs font-semibold text-[#222222] mb-1.5"
              >
                Wind Velocity Units
              </label>
              <select
                id="pref-wind-unit"
                value={preferences.wind_speed_unit}
                onChange={(e) =>
                  handlePrefChange({
                    wind_speed_unit: e.target.value as WindSpeedUnit,
                  })
                }
                className="w-full px-3 py-2 rounded-md bg-white border border-[#E5E7EB] text-xs text-[#222222] focus:outline-none focus:border-[#FFC928]"
              >
                <option value="kmh">Kilometres per hour (km/h)</option>
                <option value="mph">Miles per hour (mph)</option>
                <option value="ms">Metres per second (m/s)</option>
                <option value="knots">Knots (kn)</option>
              </select>
            </div>

            {/* Precipitation Unit */}
            <div className="p-3.5 rounded-md bg-[#F7F7F7] border border-[#E5E7EB]">
              <label
                htmlFor="pref-precip-unit"
                className="block text-xs font-semibold text-[#222222] mb-1.5"
              >
                Precipitation Units
              </label>
              <select
                id="pref-precip-unit"
                value={preferences.precipitation_unit}
                onChange={(e) =>
                  handlePrefChange({
                    precipitation_unit: e.target.value as PrecipitationUnit,
                  })
                }
                className="w-full px-3 py-2 rounded-md bg-white border border-[#E5E7EB] text-xs text-[#222222] focus:outline-none focus:border-[#FFC928]"
              >
                <option value="mm">Millimetres (mm)</option>
                <option value="inch">Inches (in)</option>
              </select>
            </div>

            {/* Theme Preference */}
            <div className="p-3.5 rounded-md bg-[#F7F7F7] border border-[#E5E7EB]">
              <label
                htmlFor="pref-theme"
                className="block text-xs font-semibold text-[#222222] mb-1.5"
              >
                Theme
              </label>
              <select
                id="pref-theme"
                value={preferences.theme}
                onChange={(e) =>
                  handlePrefChange({
                    theme: e.target.value as ThemePreference,
                  })
                }
                className="w-full px-3 py-2 rounded-md bg-white border border-[#E5E7EB] text-xs text-[#222222] focus:outline-none focus:border-[#FFC928]"
              >
                <option value="light">Light Theme (Default)</option>
                <option value="system">System Default</option>
              </select>
            </div>
          </div>
        </section>

        {/* Notifications & Weather Alerts */}
        <section
          id="alerts"
          aria-labelledby="alerts-heading"
          className="p-5 sm:p-6 rounded-lg bg-white border border-[#E5E7EB] shadow-xs space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2
              id="alerts-heading"
              className="text-xs font-bold uppercase tracking-wider text-[#6B7280]"
            >
              Weather Alerts & Notifications
            </h2>
          </div>

          <PushNotificationToggle />
          <AlertRulesManager />
        </section>

        {/* Developer Attribution & Contact */}
        <DeveloperContactSection />

        {/* Danger Zone: Account Deletion */}
        <section
          aria-labelledby="danger-zone-heading"
          className="p-5 sm:p-6 rounded-lg bg-white border border-[#FED7D7] shadow-xs"
        >
          <h2
            id="danger-zone-heading"
            className="text-xs font-bold uppercase tracking-wider text-[#D94841] mb-2"
          >
            Danger Zone
          </h2>
          <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
            Deleting your account will irreversibly remove your user profile, all saved locations, and customized preferences.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-md bg-[#FFF5F5] border border-[#FED7D7] text-[#D94841] hover:bg-[#FED7D7] text-xs font-bold transition-colors"
          >
            Delete Account and Data
          </button>
        </section>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in"
        >
          <div className="w-full max-w-md p-6 rounded-lg bg-white border border-[#E5E7EB] shadow-md relative">
            <h3
              id="delete-modal-title"
              className="text-lg font-bold text-[#222222] mb-2"
            >
              Delete Account
            </h3>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
              All your saved locations and preferences will be permanently removed. To proceed, please type{" "}
              <strong className="text-[#D94841] font-mono">DELETE</strong> below:
            </p>

            {deleteError && (
              <div
                role="alert"
                className="mb-3 p-2.5 rounded-md bg-[#FFF5F5] border border-[#FED7D7] text-[#D94841] text-xs"
              >
                {deleteError}
              </div>
            )}

            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3.5 py-2.5 rounded-md bg-white border border-[#E5E7EB] text-sm text-[#222222] font-mono placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#D94841] mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-md bg-[#F7F7F7] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-xs font-medium text-[#222222]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmation !== "DELETE"}
                className="px-4 py-2 rounded-md bg-[#D94841] hover:bg-[#C62828] text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
