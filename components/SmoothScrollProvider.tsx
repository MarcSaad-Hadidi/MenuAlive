"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject
} from "react";
import { usePathname } from "next/navigation";

type LenisInstance = import("lenis").default;

const LenisRefContext =
  createContext<RefObject<LenisInstance | null> | null>(null);
const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";
const MOBILE_SCROLL_MEDIA_QUERY = "(max-width: 767px)";

function prefersNativeScrollDesktop(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent;
  return /Brave/i.test(ua) || /Firefox\//i.test(ua);
}

export function useLenisRef(): RefObject<LenisInstance | null> | null {
  return useContext(LenisRefContext);
}

type SmoothScrollProviderProps = {
  children: ReactNode;
};

type ScrollStack = {
  gsap: typeof import("gsap").default;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
};

type LenisStack = ScrollStack & {
  Lenis: typeof import("lenis").default;
};

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const lenisRef = useRef<LenisInstance | null>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    let cancelled = false;
    let removeDesktopScroll: (() => void) | null = null;
    let applyRunId = 0;
    let scrollStackPromise: Promise<ScrollStack> | null = null;
    let lenisStackPromise: Promise<LenisStack> | null = null;

    const previousScrollRestoration = window.history.scrollRestoration;
    const isLanding = pathname === "/";
    const prefersReducedMotion = window.matchMedia(
      REDUCED_MOTION_MEDIA_QUERY
    ).matches;
    const mobileScrollQuery = window.matchMedia(MOBILE_SCROLL_MEDIA_QUERY);

    const loadScrollStack = () => {
      scrollStackPromise ??= Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger")
      ]).then(([{ default: gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger);
        return { gsap, ScrollTrigger };
      });
      return scrollStackPromise;
    };

    const loadLenisStack = () => {
      lenisStackPromise ??= Promise.all([
        import("lenis"),
        loadScrollStack()
      ]).then(([{ default: Lenis }, stack]) => ({
        ...stack,
        Lenis
      }));
      return lenisStackPromise;
    };

    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const resetScrollBeforeReload = () => {
      lenisRef.current?.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
    };

    const startDesktopLenis = ({ Lenis, ScrollTrigger, gsap }: LenisStack) => {
      const lenis = new Lenis({
        duration: prefersReducedMotion ? 0.01 : 0.58,
        easing: (time) => Math.min(1, 1.001 - 2 ** (-10 * time)),
        smoothWheel: !prefersReducedMotion,
        wheelMultiplier: 0.88,
        touchMultiplier: 1
      });

      lenisRef.current = lenis;
      lenis.scrollTo(0, { immediate: true, force: true });
      lenis.on("scroll", ScrollTrigger.update);

      const update = (time: number) => {
        lenis.raf(time * 1000);
      };

      gsap.ticker.add(update);
      gsap.ticker.lagSmoothing(0);

      return () => {
        gsap.ticker.remove(update);
        gsap.ticker.lagSmoothing(500, 33);
        lenis.destroy();
        lenisRef.current = null;
      };
    };

    const applyScrollMode = async () => {
      const runId = ++applyRunId;
      removeDesktopScroll?.();
      removeDesktopScroll = null;
      lenisRef.current = null;

      if (isLanding) return;

      const isMobileViewport = mobileScrollQuery.matches;
      const useLenis = !isMobileViewport && !prefersNativeScrollDesktop();

      if (!useLenis) return;

      const stack = await loadLenisStack();
      if (cancelled || runId !== applyRunId) return;

      removeDesktopScroll = startDesktopLenis(stack);
      requestAnimationFrame(() => {
        stack.ScrollTrigger.refresh();
      });
    };

    const onViewportChange = () => {
      void applyScrollMode();
    };

    void applyScrollMode();

    if (typeof mobileScrollQuery.addEventListener === "function") {
      mobileScrollQuery.addEventListener("change", onViewportChange);
    } else {
      mobileScrollQuery.addListener(onViewportChange);
    }

    window.addEventListener("beforeunload", resetScrollBeforeReload);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", resetScrollBeforeReload);
      window.history.scrollRestoration = previousScrollRestoration;

      if (typeof mobileScrollQuery.removeEventListener === "function") {
        mobileScrollQuery.removeEventListener("change", onViewportChange);
      } else {
        mobileScrollQuery.removeListener(onViewportChange);
      }

      removeDesktopScroll?.();
    };
  }, [pathname]);

  return (
    <LenisRefContext.Provider value={lenisRef}>{children}</LenisRefContext.Provider>
  );
}
