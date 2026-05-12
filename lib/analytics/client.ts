"use client";

import type {
  AnalyticsEventName,
  AnalyticsEventPayload
} from "@/lib/analytics/types";

type TrackMenuEventInput = Partial<
  Omit<AnalyticsEventPayload, "eventName" | "sessionId" | "source">
> & {
  eventName: AnalyticsEventName;
  source?: AnalyticsEventPayload["source"];
};

const SESSION_KEY = "vistaire.analytics.sessionId.v1";
const DEMO_RESTAURANT_ID =
  process.env.NEXT_PUBLIC_DEMO_RESTAURANT_ID ??
  "11111111-1111-1111-1111-111111111111";
const DEMO_MENU_ID =
  process.env.NEXT_PUBLIC_DEMO_MENU_ID ??
  "22222222-2222-2222-2222-222222222222";
const recentEvents = new Map<string, number>();

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSessionId(): string {
  if (typeof window === "undefined") return createSessionId();

  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = createSessionId();
    window.sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return createSessionId();
  }
}

function getViewport(): AnalyticsEventPayload["viewport"] {
  if (typeof window === "undefined") return undefined;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio
  };
}

export function trackMenuEvent(input: TrackMenuEventInput): void {
  if (typeof window === "undefined") return;
  const dedupeKey = [
    input.eventName,
    input.dishSlug,
    input.categorySlug,
    input.searchQuery,
    input.filterName,
    input.ctaName
  ].join(":");
  const now = Date.now();
  const lastSeen = recentEvents.get(dedupeKey) ?? 0;
  if (now - lastSeen < 1_000) return;
  recentEvents.set(dedupeKey, now);

  const payload: AnalyticsEventPayload = {
    eventName: input.eventName,
    restaurantId: input.restaurantId ?? DEMO_RESTAURANT_ID,
    menuId: input.menuId ?? DEMO_MENU_ID,
    sessionId: getSessionId(),
    source: input.source ?? "demo",
    dishSlug: input.dishSlug,
    categorySlug: input.categorySlug,
    searchQuery: input.searchQuery,
    filterName: input.filterName,
    ctaName: input.ctaName,
    viewport: getViewport(),
    metadata: input.metadata
  };

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify(payload)
  }).catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[Vistaire analytics] event skipped", error);
    }
  });
}
