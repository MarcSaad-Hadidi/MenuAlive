"use client";

import { useEffect, useState } from "react";

export const DESKTOP_HERO_MEDIA_QUERY = "(min-width: 768px)";

export function useIsDesktopHero() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_HERO_MEDIA_QUERY);
    const sync = () => setIsDesktop(query.matches);

    sync();

    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", sync);
      return () => query.removeEventListener("change", sync);
    }

    query.addListener(sync);
    return () => query.removeListener(sync);
  }, []);

  return isDesktop;
}
