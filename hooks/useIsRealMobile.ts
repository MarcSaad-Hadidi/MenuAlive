"use client";

import { useLayoutEffect, useState } from "react";

const QUERY = "(max-width: 767px)";

/**
 * Mobile réel (largeur typique téléphone). Après hydratation, reflète `matchMedia`
 * dans le même cycle de layout pour limiter le décalage avec le SSR (`false`).
 */
export function useIsRealMobile() {
  const [matches, setMatches] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(QUERY);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return matches;
}
