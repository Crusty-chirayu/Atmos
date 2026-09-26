"use client";

import React from "react";

export interface AtmosphericSceneProps {
  weatherCode?: number;
  isDay?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * AtmosphericScene
 * Clean, bright container that maintains authoritative #FFFFFF base background.
 * Unnecessary particle loops, lightning flashes, and dark background gradients
 * have been eliminated in accordance with the Human-Directed Redesign Directive.
 */
export function AtmosphericScene({
  children,
  className = "",
}: AtmosphericSceneProps) {
  return (
    <div
      className={`relative w-full min-h-screen bg-white text-[#222222] ${className}`}
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
