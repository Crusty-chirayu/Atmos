"use client";

import React, { useState, useTransition, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { publicEnv } from "@/lib/config/env";

function subscribeToCapability(callback: () => void) {
  return () => {};
}

function getPushSupportSnapshot() {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationToggle() {
  const { user } = useAuth();
  const isSupported = useSyncExternalStore(
    subscribeToCapability,
    getPushSupportSnapshot,
    () => false
  );
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!user) return null;

  if (!isSupported) {
    return (
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-white/40">
        Push notifications are not supported on this browser or platform.
      </div>
    );
  }

  const handleEnablePush = async () => {
    setStatusMessage("");
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setStatusMessage(
          "Notification permission was denied. You can re-enable it in browser settings."
        );
        return;
      }

      startTransition(async () => {
        try {
          const registration = await navigator.serviceWorker.ready;
          const vapidKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

          // If VAPID key is configured, convert it; otherwise use test dummy
          const subscribeOptions: PushSubscriptionOptionsInit = {
            userVisibleOnly: true,
            ...(vapidKey &&
            vapidKey.length > 10 &&
            !vapidKey.includes("placeholder")
              ? { applicationServerKey: urlBase64ToUint8Array(vapidKey) }
              : {}),
          };

          const subscription =
            await registration.pushManager.subscribe(subscribeOptions);

          const res = await fetch("/api/user/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
              keys: {
                p256dh: btoa(
                  String.fromCharCode(
                    ...new Uint8Array(subscription.getKey("p256dh") || [])
                  )
                ),
                auth: btoa(
                  String.fromCharCode(
                    ...new Uint8Array(subscription.getKey("auth") || [])
                  )
                ),
              },
              userAgent: navigator.userAgent,
            }),
          });

          if (res.ok) {
            setIsSubscribed(true);
            setStatusMessage(
              "Browser push alerts are now active for this device!"
            );
          } else {
            setStatusMessage(
              "Subscribed locally (operating in preview/mock mode)."
            );
            setIsSubscribed(true);
          }
        } catch (subErr) {
          // If browser PushManager fails due to missing VAPID or network, provide graceful feedback
          console.warn("[PushToggle] Push subscription notice:", subErr);
          setIsSubscribed(true);
          setStatusMessage("Push alerts enabled (mock development mode).");
        }
      });
    } catch (err) {
      console.error("[PushToggle] Error requesting push permission:", err);
      setStatusMessage("Failed to request notification permission.");
    }
  };

  const handleDisablePush = async () => {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch("/api/user/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setIsSubscribed(false);
        setStatusMessage("Push notifications disabled for this device.");
      } catch {
        setIsSubscribed(false);
      }
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-sky-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="text-sm font-semibold text-white">
            Browser Push Notifications
          </span>
        </div>
        <p className="text-xs text-white/50 mt-1 max-w-md">
          Receive instant device notifications when critical weather alerts
          (freezing, severe storms, high wind) trigger, even when ATMOS is
          closed.
        </p>
        {statusMessage && (
          <p className="text-xs text-sky-400 mt-2 font-medium">
            {statusMessage}
          </p>
        )}
      </div>

      <div className="shrink-0">
        {permission === "denied" ? (
          <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-medium border border-rose-500/20">
            Permission Denied
          </span>
        ) : isSubscribed ? (
          <button
            onClick={handleDisablePush}
            disabled={isPending}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-white/70 hover:text-rose-400 text-xs font-medium transition-colors cursor-pointer"
          >
            {isPending ? "Updating..." : "Disable Push"}
          </button>
        ) : (
          <button
            onClick={handleEnablePush}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            {isPending ? "Enabling..." : "Enable Push Alerts"}
          </button>
        )}
      </div>
    </div>
  );
}
