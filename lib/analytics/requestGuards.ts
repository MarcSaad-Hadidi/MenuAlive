import type { AnalyticsEventPayload } from "@/lib/analytics/types";

type HeaderLike =
  | Headers
  | Record<string, string | null | undefined>
  | Map<string, string>;

type RequestSource = {
  requestUrl: string;
  origin?: string | null;
  referer?: string | null;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  limit: number;
  now: number;
  store: Map<string, RateLimitRecord>;
  windowMs: number;
};

type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

function readHeader(headers: HeaderLike, name: string): string {
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? "";
  }

  const lowerName = name.toLowerCase();
  if (headers instanceof Map) {
    return headers.get(name) ?? headers.get(lowerName) ?? "";
  }

  const record = headers as Record<string, string | null | undefined>;
  return record[name] ?? record[lowerName] ?? "";
}

function parseUrl(value: string): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getPort(url: URL): string {
  if (url.port) return url.port;
  if (url.protocol === "https:") return "443";
  if (url.protocol === "http:") return "80";
  return "";
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  );
}

function isSameOrigin(value: string, requestUrl: string): boolean {
  const request = parseUrl(requestUrl);
  const candidate = parseUrl(value);
  if (!request || !candidate) return false;
  if (request.origin === candidate.origin) return true;

  return (
    request.protocol === candidate.protocol &&
    getPort(request) === getPort(candidate) &&
    isLoopbackHost(request.hostname) &&
    isLoopbackHost(candidate.hostname)
  );
}

export function isAllowedAnalyticsRequestSource({
  requestUrl,
  origin,
  referer
}: RequestSource): boolean {
  const explicitOrigin = origin?.trim() ?? "";
  const explicitReferer = referer?.trim() ?? "";

  if (explicitOrigin) {
    return isSameOrigin(explicitOrigin, requestUrl);
  }

  if (explicitReferer) {
    return isSameOrigin(explicitReferer, requestUrl);
  }

  return true;
}

export function getAnalyticsRateLimitKey(
  headers: HeaderLike,
  payload: Pick<AnalyticsEventPayload, "restaurantId" | "sessionId">
): string {
  const forwardedFor = readHeader(headers, "x-forwarded-for")
    .split(",")[0]
    .trim();
  const clientIp =
    forwardedFor ||
    readHeader(headers, "cf-connecting-ip").trim() ||
    readHeader(headers, "x-real-ip").trim() ||
    "unknown";
  const sessionKey = payload.sessionId || payload.restaurantId || "anonymous";

  return `${clientIp}:${sessionKey}`;
}

export function checkAnalyticsRateLimit(
  key: string,
  { limit, now, store, windowMs }: RateLimitOptions
): RateLimitResult {
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    };
  }

  existing.count += 1;
  return { ok: true };
}
