"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { LocationSearch } from "../weather/location-search";
import type {
  AlertRule,
  AlertType,
  ComparisonOperator,
} from "@/lib/notifications/domain/schemas";
import type { GeocodingLocation } from "@/lib/geocoding/domain/types";

const ALERT_TYPE_LABELS: Record<
  AlertType,
  { label: string; defaultUnit: string; desc: string }
> = {
  temp_above: {
    label: "High Temperature",
    defaultUnit: "°C",
    desc: "Triggers when temperature exceeds threshold",
  },
  temp_below: {
    label: "Low Temperature",
    defaultUnit: "°C",
    desc: "Triggers when temperature drops below threshold",
  },
  high_wind: {
    label: "High Wind Speed",
    defaultUnit: "km/h",
    desc: "Triggers when wind gusts or speeds pass limit",
  },
  precipitation: {
    label: "Precipitation Onset",
    defaultUnit: "%",
    desc: "Triggers when rain probability or volume spikes",
  },
  freeze: {
    label: "Freeze Warning",
    defaultUnit: "°C",
    desc: "Triggers when temperatures approach or reach freezing (0°C / 32°F)",
  },
  severe_weather: {
    label: "Severe Weather",
    defaultUnit: "code",
    desc: "Triggers on violent thunderstorms, hail, or squalls",
  },
};

export function AlertRulesManager() {
  const { user } = useAuth();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [name, setName] = useState("");
  const [alertType, setAlertType] = useState<AlertType>("temp_above");
  const [thresholdValue, setThresholdValue] = useState<number>(35);
  const [thresholdUnit, setThresholdUnit] = useState<string>("°C");
  const [operator, setOperator] = useState<ComparisonOperator>(">");
  const [locationName, setLocationName] = useState("Tokyo, Japan");
  const [latitude, setLatitude] = useState(35.6895);
  const [longitude, setLongitude] = useState(139.6917);
  const [cooldownMinutes, setCooldownMinutes] = useState(360);
  const [formError, setFormError] = useState("");

  const loadRules = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch("/api/user/alerts");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules ?? []);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [user]);

  const handleTypeChange = (type: AlertType) => {
    setAlertType(type);
    const meta = ALERT_TYPE_LABELS[type];
    setThresholdUnit(meta.defaultUnit);
    if (type === "temp_above") {
      setThresholdValue(35);
      setOperator(">");
    } else if (type === "temp_below") {
      setThresholdValue(5);
      setOperator("<");
    } else if (type === "high_wind") {
      setThresholdValue(50);
      setOperator(">");
    } else if (type === "precipitation") {
      setThresholdValue(70);
      setOperator(">=");
    } else if (type === "freeze") {
      setThresholdValue(0);
      setOperator("<=");
    } else if (type === "severe_weather") {
      setThresholdValue(1);
      setOperator(">=");
    }
  };

  const handleLocationSelect = (loc: GeocodingLocation) => {
    setLocationName(`${loc.name}${loc.country ? `, ${loc.country}` : ""}`);
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
  };

  const handleToggle = async (ruleId: string, currentEnabled: boolean) => {
    startTransition(async () => {
      setRules((prev) =>
        prev.map((r) =>
          r.id === ruleId ? { ...r, enabled: !currentEnabled } : r
        )
      );
      try {
        await fetch(`/api/user/alerts/${ruleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !currentEnabled }),
        });
      } catch {
        // Revert on error
        loadRules();
      }
    });
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this weather alert?")) return;

    startTransition(async () => {
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      try {
        await fetch(`/api/user/alerts/${ruleId}`, { method: "DELETE" });
      } catch {
        loadRules();
      }
    });
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Alert rule name is required");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/user/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            alertType,
            thresholdValue: Number(thresholdValue),
            thresholdUnit,
            comparisonOperator: operator,
            locationName,
            latitude,
            longitude,
            enabled: true,
            cooldownMinutes,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          setFormError(errData.error || "Failed to create alert rule");
          return;
        }

        const data = await res.json();
        if (data.rule) {
          setRules((prev) => [data.rule, ...prev]);
        }
        setIsModalOpen(false);
        setName("");
      } catch {
        setFormError("Network error. Please try again.");
      }
    });
  };

  if (!user) {
    return (
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
        <p className="text-sm text-white/60">
          Sign in to your ATMOS account to create persistent weather alerts and
          receive notifications.
        </p>
        <a
          href="/login"
          className="inline-block mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h3 className="text-base font-semibold text-white">
            Weather Alert Rules
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            Configure automated triggers evaluated every hour against
            authoritative Open-Meteo telemetry.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition-all shadow-md shadow-sky-500/20 flex items-center gap-2 cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Alert
        </button>
      </div>

      {/* Rules list */}
      {loading ? (
        <div className="p-8 text-center text-xs text-white/40">
          Loading alert rules...
        </div>
      ) : rules.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white/[0.02] border border-white/10 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center text-white/30">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-white/80">
            No alert rules configured
          </p>
          <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">
            Get notified when temperatures drop to freezing, precipitation
            spikes, or high winds threaten your area.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
          >
            Create Your First Alert
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => {
            const meta = ALERT_TYPE_LABELS[rule.alertType] ?? {
              label: rule.alertType,
              defaultUnit: "",
              desc: "",
            };

            return (
              <div
                key={rule.id}
                className={`p-4 rounded-2xl border transition-all ${
                  rule.enabled
                    ? "bg-white/[0.03] border-white/10 hover:border-white/20"
                    : "bg-white/[0.01] border-white/5 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-md bg-white/10 text-white/70">
                      {meta.label}
                    </span>
                    <h4 className="text-sm font-semibold text-white mt-1.5 truncate">
                      {rule.name}
                    </h4>
                    <p className="text-xs text-white/60 flex items-center gap-1 mt-1">
                      <svg
                        className="w-3.5 h-3.5 text-white/40"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                      </svg>
                      <span className="truncate">{rule.locationName}</span>
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(rule.id, rule.enabled)}
                    disabled={isPending}
                    role="switch"
                    aria-checked={rule.enabled}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                      rule.enabled ? "bg-sky-500" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        rule.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
                  <div>
                    Threshold:{" "}
                    <span className="font-semibold text-white">
                      {rule.comparisonOperator} {rule.thresholdValue}{" "}
                      {rule.thresholdUnit}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40">
                      Cooldown: {Math.round(rule.cooldownMinutes / 60)}h
                    </span>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={isPending}
                      aria-label="Delete alert"
                      className="p-1 rounded text-white/30 hover:text-rose-400 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Alert Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-white/10 p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-base font-semibold text-white">
                Create Weather Alert
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Alert Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Freezing Night Warning"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  required
                />
              </div>

              {/* Alert Type */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Alert Trigger Type
                </label>
                <select
                  value={alertType}
                  onChange={(e) =>
                    handleTypeChange(e.target.value as AlertType)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                >
                  {Object.entries(ALERT_TYPE_LABELS).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label} ({meta.desc})
                    </option>
                  ))}
                </select>
              </div>

              {/* Threshold & Operator */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">
                    Condition
                  </label>
                  <select
                    value={operator}
                    onChange={(e) =>
                      setOperator(e.target.value as ComparisonOperator)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  >
                    <option value=">">Greater than (&gt;)</option>
                    <option value=">=">Greater or equal (&gt;=)</option>
                    <option value="<">Less than (&lt;)</option>
                    <option value="<=">Less or equal (&lt;=)</option>
                    <option value="==">Exact match (==)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1">
                    Threshold Value
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={thresholdValue}
                      onChange={(e) =>
                        setThresholdValue(parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      required
                    />
                    <span className="inline-flex items-center px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 shrink-0">
                      {thresholdUnit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location Picker */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Target Location:{" "}
                  <span className="text-white font-semibold">
                    {locationName}
                  </span>
                </label>
                <div className="mt-1">
                  <LocationSearch
                    onSelectLocation={handleLocationSelect}
                    placeholder="Search city to track..."
                  />
                </div>
              </div>

              {/* Cooldown slider */}
              <div>
                <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                  <span>Suppression Cooldown</span>
                  <span className="font-semibold text-white">
                    {Math.round(cooldownMinutes / 60)} hours
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="1440"
                  step="60"
                  value={cooldownMinutes}
                  onChange={(e) =>
                    setCooldownMinutes(parseInt(e.target.value, 10))
                  }
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <p className="text-[10px] text-white/40 mt-1">
                  Prevents notification storms by waiting at least{" "}
                  {Math.round(cooldownMinutes / 60)} hours before re-triggering
                  this alert.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition-all shadow-md shadow-sky-500/20 disabled:opacity-50"
                >
                  {isPending ? "Creating..." : "Save Alert Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
