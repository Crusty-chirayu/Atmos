"use client";

import { useSyncExternalStore } from "react";

function subscribeToReducedMotion(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

/**
 * Idiomatic React 19 hook subscribing to prefers-reduced-motion with zero cascading renders.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
}

/**
 * Idiomatic React 19 hook detecting WebGL availability without setState inside effects.
 */
export function useWebGLSupport(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => {
      if (typeof window === "undefined") return false;
      try {
        const canvas = document.createElement("canvas");
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext("webgl2") ||
            canvas.getContext("webgl") ||
            canvas.getContext("experimental-webgl"))
        );
      } catch {
        return false;
      }
    },
    () => true
  );
}
