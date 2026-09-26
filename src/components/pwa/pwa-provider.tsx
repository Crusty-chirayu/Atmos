"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PwaContextType {
  isInstalled: boolean;
  canInstall: boolean;
  isOnline: boolean;
  promptInstall: () => Promise<boolean>;
}

const PwaContext = createContext<PwaContextType>({
  isInstalled: false,
  canInstall: false,
  isOnline: true,
  promptInstall: async () => false,
});

export function usePwa() {
  return useContext(PwaContext);
}

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

function subscribeStandalone(callback: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  return () => {
    mql.removeEventListener("change", callback);
  };
}

function getStandaloneSnapshot() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true
  );
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [manualInstalled, setManualInstalled] = useState(false);

  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );

  const isMediaStandalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    () => false
  );

  const isInstalled = isMediaStandalone || manualInstalled;

  useEffect(() => {
    // 1. Service Worker registration
    if ("serviceWorker" in navigator && typeof window !== "undefined") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.addEventListener("updatefound", () => {
            const installing = reg.installing;
            if (installing) {
              installing.addEventListener("statechange", () => {
                if (
                  installing.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // Service worker updated
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn("[PWA] ServiceWorker registration skipped/failed:", err);
        });
    }

    // 2. Capture beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setManualInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.error("[PWA] Install prompt failed:", err);
    }
    return false;
  }, [deferredPrompt]);

  return (
    <PwaContext.Provider
      value={{
        isInstalled,
        canInstall: Boolean(deferredPrompt),
        isOnline,
        promptInstall,
      }}
    >
      {children}

      {/* Connectivity Status Banner / Toast */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-medium backdrop-blur-md shadow-lg transition-all duration-300 flex items-center gap-2 border ${
            isOnline
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/40"
              : "bg-amber-950/90 text-amber-200 border-amber-500/40"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
            }`}
          />
          {isOnline
            ? "Connection restored. Live weather telemetry re-enabled."
            : "Offline mode active. Using cached atmospheric data."}
          <button
            onClick={() => setShowToast(false)}
            className="ml-2 text-text-secondary hover:text-text-primary text-xs"
            aria-label="Dismiss connectivity notification"
          >
            ✕
          </button>
        </div>
      )}
    </PwaContext.Provider>
  );
}
