"use client";

import { useEffect, useState } from "react";

export type ScrollVideoMode =
  | "video-desktop"
  | "video-mobile"
  | "video-low"
  | "loading";

export function getDeviceMode(): ScrollVideoMode {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "loading";
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    return "video-low";
  }

  const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
  const isTouchDevice =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;
  
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isFirefox = /Firefox\//i.test(ua);
  const isBrave = (navigator as unknown as { brave?: unknown }).brave !== undefined;
  
  const navExt = navigator as unknown as {
    deviceMemory?: number;
    hardwareConcurrency?: number;
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  const memory = navExt.deviceMemory || 8;
  const concurrency = navExt.hardwareConcurrency || navigator.hardwareConcurrency || 4;
  const connection = navExt.connection || {};
  const saveData = connection.saveData === true;
  const effectiveType = connection.effectiveType || "4g";

  // For very weak devices or data saver mode
  if (saveData || memory < 2 || effectiveType === "2g" || effectiveType === "3g") {
    return "video-low";
  }

  // Mobile / Touch devices should use video decoding instead of frame canvas.
  // Safari/Firefox/Brave on desktop can also stutter heavily with huge canvas.
  if (isMobileViewport || isTouchDevice || isSafari || isFirefox || isBrave) {
    return "video-mobile";
  }

  return memory >= 4 && concurrency >= 4 ? "video-desktop" : "video-low";
}

export function useScrollVideoMode(): ScrollVideoMode {
  const [mode, setMode] = useState<ScrollVideoMode>("loading");

  useEffect(() => {
    // Determine the initial mode
    const determineMode = () => {
      setMode(getDeviceMode());
    };

    determineMode();

    // Listeners for window changes
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const mobileQuery = window.matchMedia("(max-width: 767px)");

    const handleChange = () => determineMode();

    reducedMotionQuery.addEventListener("change", handleChange);
    mobileQuery.addEventListener("change", handleChange);

    return () => {
      reducedMotionQuery.removeEventListener("change", handleChange);
      mobileQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return mode;
}
