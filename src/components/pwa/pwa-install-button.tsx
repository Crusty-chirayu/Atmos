"use client";

import { usePwa } from "./pwa-provider";
import { useState } from "react";

export function PwaInstallButton({ className = "" }: { className?: string }) {
  const { canInstall, isInstalled, promptInstall } = usePwa();
  const [installing, setInstalling] = useState(false);
  const [installedMessage, setInstalledMessage] = useState(false);

  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0]">
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
        className="bg-white hover:bg-[#F7F7F7] border border-[#E5E7EB] px-3.5 py-1.5 rounded-md text-xs font-medium text-[#222222] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        title={
          canInstall
            ? "Install ATMOS as native desktop/mobile app"
            : "Install available in Chrome, Edge, or via browser menu"
        }
      >
        <svg
          className="w-4 h-4 text-[#222222]"
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
        <span className="text-xs text-[#059669] font-medium">
          Installed successfully!
        </span>
      )}
    </div>
  );
}
