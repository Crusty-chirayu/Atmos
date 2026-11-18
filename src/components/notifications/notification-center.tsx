"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
} from "react";
import { useAuth } from "@/lib/auth/auth-context";
import type { WeatherNotification } from "@/lib/notifications/domain/schemas";

export function NotificationCenter() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<WeatherNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch("/api/user/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // Silently handle offline/preview
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const poll = () => {
      fetch("/api/user/notifications")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && active) {
            setNotifications(data.notifications ?? []);
            setUnreadCount(data.unreadCount ?? 0);
          }
        })
        .catch(() => {});
    };
    poll();
    // Poll every 60s for new alerts when user is active
    const interval = setInterval(poll, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  // Handle outside click & escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
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

  const handleMarkAsRead = async (id: string) => {
    startTransition(async () => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      try {
        await fetch(`/api/user/notifications/${id}`, { method: "PATCH" });
      } catch {
        // Optimistic update
      }
    });
  };

  const handleMarkAllRead = async () => {
    startTransition(async () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);

      try {
        await fetch("/api/user/notifications", { method: "PATCH" });
      } catch {
        // Optimistic update
      }
    });
  };

  const handleClearRead = async () => {
    startTransition(async () => {
      setNotifications((prev) => prev.filter((n) => !n.read));

      try {
        await fetch("/api/user/notifications", { method: "DELETE" });
      } catch {
        // Optimistic update
      }
    });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const target = notifications.find((n) => n.id === id);
      if (target && !target.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));

      try {
        await fetch(`/api/user/notifications/${id}`, { method: "DELETE" });
      } catch {
        // Optimistic update
      }
    });
  };

  return (
    <div className="relative">
      {/* Bell Trigger */}
      <button
        ref={triggerRef}
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen && user) fetchNotifications();
        }}
        aria-label={`Weather Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative p-1.5 rounded-md border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#222222] hover:bg-[#F7F7F7] transition-colors focus:outline-none shadow-xs"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-bold text-white bg-[#D94841] rounded-full shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Drawer */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notification Center"
          className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[80vh] flex flex-col rounded-lg bg-white border border-[#E5E7EB] shadow-md z-50 overflow-hidden animate-in fade-in"
        >
          {!user ? (
            <div className="p-6 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#FFF9E6] border border-[#FFC928] flex items-center justify-center mb-3 text-[#FFC928]">
                <svg
                  className="w-5 h-5 text-[#222222]"
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
              <h3 className="text-sm font-bold text-[#222222] mb-1">
                Weather Alerts
              </h3>
              <p className="text-xs text-[#6B7280] mb-4 max-w-xs leading-relaxed">
                Sign in to configure threshold rules for frost conditions, rain
                onset, gale-force winds, and severe storm alerts.
              </p>
              <a
                href="/login"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] font-semibold text-xs transition-colors shadow-xs"
              >
                Sign In to Enable Alerts
              </a>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] bg-[#F7F7F7]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#222222]">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#FFF9E6] text-[#222222] border border-[#FFC928]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      disabled={isPending}
                      className="text-[#6B7280] hover:text-[#222222] transition-colors cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.some((n) => n.read) && (
                    <button
                      onClick={handleClearRead}
                      disabled={isPending}
                      className="text-[#9CA3AF] hover:text-[#D94841] transition-colors cursor-pointer"
                    >
                      Clear read
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7EB] max-h-96">
                {loading && notifications.length === 0 ? (
                  <div className="p-6 text-center text-[#6B7280] text-xs">
                    Checking weather alerts...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#F7F7F7] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280]">
                      <svg
                        className="w-5 h-5 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-[#222222]">
                      All clear
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      No active weather alerts for your tracked locations.
                    </p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => !item.read && handleMarkAsRead(item.id)}
                      className={`p-3.5 flex gap-3 transition-colors cursor-pointer hover:bg-[#F7F7F7] ${
                        !item.read ? "bg-[#FFFDF5]" : "opacity-75"
                      }`}
                    >
                      {/* Severity Indicator */}
                      <div className="shrink-0 mt-1">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            item.severity === "critical"
                              ? "bg-[#D94841]"
                              : item.severity === "warning"
                                ? "bg-[#FFC928]"
                                : "bg-[#4A90E2]"
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`text-xs font-semibold truncate ${!item.read ? "text-[#222222]" : "text-[#6B7280]"}`}
                          >
                            {item.title}
                          </p>
                          <span className="text-xs text-[#9CA3AF] shrink-0 tabular-nums">
                            {new Date(item.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>

                        {item.locationName && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-[#9CA3AF]">
                            <svg
                              className="w-3 h-3"
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
                            <span>{item.locationName}</span>
                          </div>
                        )}
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        aria-label="Delete notification"
                        className="shrink-0 self-start p-1 rounded text-[#9CA3AF] hover:text-[#D94841] hover:bg-[#FFF5F5] transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
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
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-[#E5E7EB] bg-[#F7F7F7] flex items-center justify-between text-xs text-[#6B7280]">
                <span>Weather Alerts</span>
                <a
                  href="/account#alerts"
                  onClick={() => setIsOpen(false)}
                  className="text-[#222222] font-semibold hover:underline"
                >
                  Manage Alert Rules →
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
