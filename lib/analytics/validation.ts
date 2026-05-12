import {
  ANALYTICS_EVENT_NAMES,
  type AnalyticsEventName,
  type AnalyticsEventPayload,
  type AnalyticsSource
} from "@/lib/analytics/types";

const EVENT_NAME_SET = new Set<string>(ANALYTICS_EVENT_NAMES);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const MAX_METADATA_BYTES = 4_000;

type ValidationResult =
  | { ok: true; payload: AnalyticsEventPayload }
  | { ok: false; error: string };

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function cleanShortText(value: unknown, maxLength: number): string | undefined {
  const raw = asString(value);
  if (!raw) return undefined;
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  return normalized.slice(0, maxLength);
}

function cleanSearchQuery(value: unknown): string | undefined {
  const normalized = cleanShortText(value, 80);
  if (!normalized) return undefined;

  const withoutEmails = normalized.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    "[email]"
  );
  return withoutEmails.replace(
    /(?:\+?\d[\s().-]*){7,}\d/g,
    "[telephone]"
  );
}

function cleanSlug(value: unknown): string | undefined {
  const slug = cleanShortText(value, 80);
  if (!slug || !SLUG_PATTERN.test(slug)) return undefined;
  return slug.toLowerCase();
}

function cleanViewport(value: unknown): AnalyticsEventPayload["viewport"] {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const width = Number(candidate.width);
  const height = Number(candidate.height);
  const dpr = Number(candidate.dpr);

  if (!Number.isFinite(width) || !Number.isFinite(height)) return undefined;

  return {
    width: Math.max(0, Math.min(10_000, Math.round(width))),
    height: Math.max(0, Math.min(10_000, Math.round(height))),
    ...(Number.isFinite(dpr) ? { dpr: Math.max(0, Math.min(8, dpr)) } : {})
  };
}

function cleanMetadata(value: unknown): AnalyticsEventPayload["metadata"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const json = JSON.stringify(value);
  if (json.length > MAX_METADATA_BYTES) return undefined;
  return JSON.parse(json) as Record<string, unknown>;
}

export function validateAnalyticsEvent(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Invalid analytics payload." };
  }

  const candidate = input as Record<string, unknown>;
  const eventName = asString(candidate.eventName);
  const restaurantId = asString(candidate.restaurantId);
  const sessionId = cleanShortText(candidate.sessionId, 128);
  const source = asString(candidate.source) ?? "demo";

  if (!eventName || !EVENT_NAME_SET.has(eventName)) {
    return { ok: false, error: "Unknown analytics event." };
  }

  if (!restaurantId || !UUID_PATTERN.test(restaurantId)) {
    return { ok: false, error: "Invalid restaurant id." };
  }

  if (!sessionId) {
    return { ok: false, error: "Invalid session id." };
  }

  if (source !== "demo" && source !== "production") {
    return { ok: false, error: "Invalid analytics source." };
  }

  return {
    ok: true,
    payload: {
      eventName: eventName as AnalyticsEventName,
      restaurantId,
      menuId: cleanShortText(candidate.menuId, 80),
      sessionId,
      source: source as AnalyticsSource,
      dishSlug: cleanSlug(candidate.dishSlug),
      categorySlug: cleanSlug(candidate.categorySlug),
      searchQuery: cleanSearchQuery(candidate.searchQuery),
      filterName: cleanShortText(candidate.filterName, 80),
      ctaName: cleanShortText(candidate.ctaName, 80),
      viewport: cleanViewport(candidate.viewport),
      metadata: cleanMetadata(candidate.metadata)
    }
  };
}
