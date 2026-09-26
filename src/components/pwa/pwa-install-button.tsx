"use client";

import { usePwa } from "./pwa-provider";
import { useState } from "react";

export function PwaInstallButton({ className = "" }: { className?: string }) {
  const { canInstall, isInstalled, promptInstall } = usePwa();
  const [installing, setInstalling] = useState(false);
  const [installedMessage, setInstalledMessage] = useState(false);

  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/30">
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
            d="M5 13l4 4L19 7"
          />
        </svg>
        ATMOS App Installed
      </div>
    );
  }

  const handleInstall = async () => {
    setInstalling(true);
    const success = await promptInstall();
    setInstalling(false);
    if (success) {
      setInstalledMessage(true);
      setTimeout(() => setInstalledMessage(false), 5000);
    }
  };

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <button
        onClick={handleInstall}
        disabled={installing || !canInstall}
        className="glass border border-cyan-500/40 hover:border-cyan-400 px-4 py-2 rounded-xl text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-sm"
        title={
          canInstall
            ? "Install ATMOS as native desktop/mobile app"
            : "Install available in Chrome, Edge, or via browser menu"
        }
      >
        <svg
          className="w-4 h-4 text-cyan-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        {installing ? "Installing..." : "Install ATMOS App"}
      </button>
      {installedMessage && (
        <span className="text-[10px] text-emerald-400 font-medium">
          Installed successfully!
        </span>
      )}
    </div>
  );
}
