"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
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
  const fetchNotifications = async () => {
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
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 60s for new alerts when user is active
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
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

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      {/* Bell Trigger */}
      <button
        ref={triggerRef}
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications();
        }}
        aria-label={`Weather Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/50"
      >
        <svg
          className="w-5 h-5"
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
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-4.5 h-4.5 px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full shadow-lg shadow-rose-500/30 animate-pulse">
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
          className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[80vh] flex flex-col rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isPending}
                  className="text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              {notifications.some((n) => n.read) && (
                <button
                  onClick={handleClearRead}
                  disabled={isPending}
                  className="text-white/40 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 max-h-96">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-white/50 text-xs">
                Checking weather alerts...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center text-white/30">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-white/80">All clear</p>
                <p className="text-xs text-white/40 mt-1">
                  No active weather alerts for your tracked locations.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.read && handleMarkAsRead(item.id)}
                  className={`p-3.5 flex gap-3 transition-colors cursor-pointer hover:bg-white/5 ${
                    !item.read ? "bg-white/[0.03]" : "opacity-75"
                  }`}
                >
                  {/* Severity Indicator */}
                  <div className="shrink-0 mt-0.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        item.severity === "critical"
                          ? "bg-rose-500 shadow-sm shadow-rose-500"
                          : item.severity === "warning"
                            ? "bg-amber-400 shadow-sm shadow-amber-400"
                            : "bg-sky-400 shadow-sm shadow-sky-400"
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={`text-xs font-semibold truncate ${!item.read ? "text-white" : "text-white/80"}`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-white/40 shrink-0">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-white/60 mt-1 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {item.locationName && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-white/40">
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
                    className="shrink-0 self-start p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/10 transition-colors"
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
          <div className="px-4 py-2.5 border-t border-white/10 bg-white/5 flex items-center justify-between text-[11px] text-white/50">
            <span>Powered by Open-Meteo Alerts</span>
            <a
              href="/account#alerts"
              onClick={() => setIsOpen(false)}
              className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
            >
              Manage Alert Rules →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
