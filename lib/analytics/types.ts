export const ANALYTICS_EVENT_NAMES = [
  "session_started",
  "session_duration",
  "menu_opened",
  "category_viewed",
  "dish_opened",
  "dish_3d_clicked",
  "dish_ar_clicked",
  "search_used",
  "filter_used",
  "cta_clicked",
  "dashboard_demo_opened"
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type AnalyticsSource = "demo" | "production";

export type AnalyticsViewport = {
  width: number;
  height: number;
  dpr?: number;
};

export type AnalyticsMetadata = Record<string, unknown>;

export type AnalyticsEventPayload = {
  eventName: AnalyticsEventName;
  restaurantId: string;
  menuId?: string;
  sessionId: string;
  source: AnalyticsSource;
  dishSlug?: string;
  categorySlug?: string;
  searchQuery?: string;
  filterName?: string;
  ctaName?: string;
  viewport?: AnalyticsViewport;
  metadata?: AnalyticsMetadata;
};

export type AnalyticsApiResponse =
  | { ok: true; persisted: boolean }
  | { ok: false; error: string };
