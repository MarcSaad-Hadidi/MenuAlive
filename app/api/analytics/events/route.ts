import { NextResponse, type NextRequest } from "next/server";
import { insertAnalyticsEvent } from "@/lib/analytics/eventStore";
import {
  checkAnalyticsRateLimit,
  getAnalyticsRateLimitKey,
  isAllowedAnalyticsRequestSource
} from "@/lib/analytics/requestGuards";
import { validateAnalyticsEvent } from "@/lib/analytics/validation";
import type { AnalyticsApiResponse } from "@/lib/analytics/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 120;
const analyticsRateLimitStore = new Map<
  string,
  { count: number; resetAt: number }
>();

function payloadTooLargeResponse() {
  return NextResponse.json<AnalyticsApiResponse>(
    { ok: false, error: "Analytics payload is too large." },
    { status: 413 }
  );
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return payloadTooLargeResponse();
  }

  if (
    !isAllowedAnalyticsRequestSource({
      requestUrl: request.nextUrl.href,
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer")
    })
  ) {
    return NextResponse.json<AnalyticsApiResponse>(
      { ok: false, error: "Analytics request origin is not allowed." },
      { status: 403 }
    );
  }

  let bodyText = "";
  try {
    bodyText = await request.text();
  } catch {
    return NextResponse.json<AnalyticsApiResponse>(
      { ok: false, error: "Invalid analytics payload." },
      { status: 400 }
    );
  }

  if (Buffer.byteLength(bodyText, "utf8") > MAX_BODY_BYTES) {
    return payloadTooLargeResponse();
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return NextResponse.json<AnalyticsApiResponse>(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const validation = validateAnalyticsEvent(body);
  if (!validation.ok) {
    return NextResponse.json<AnalyticsApiResponse>(
      { ok: false, error: validation.error },
      { status: 400 }
    );
  }

  const rateLimit = checkAnalyticsRateLimit(
    getAnalyticsRateLimitKey(request.headers, validation.payload),
    {
      limit: RATE_LIMIT_MAX_EVENTS,
      now: Date.now(),
      store: analyticsRateLimitStore,
      windowMs: RATE_LIMIT_WINDOW_MS
    }
  );

  if (!rateLimit.ok) {
    return NextResponse.json<AnalyticsApiResponse>(
      { ok: true, persisted: false },
      {
        status: 202,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  const inserted = await insertAnalyticsEvent(validation.payload, userAgent);

  if (!inserted.ok) {
    if (validation.payload.source === "demo") {
      return NextResponse.json<AnalyticsApiResponse>(
        { ok: true, persisted: false },
        { status: 202 }
      );
    }

    return NextResponse.json<AnalyticsApiResponse>(
      { ok: true, persisted: false },
      { status: 202 }
    );
  }

  return NextResponse.json<AnalyticsApiResponse>({
    ok: true,
    persisted: true
  });
}

export function GET() {
  return NextResponse.json(
    { ok: false, error: "Method not allowed." },
    { status: 405 }
  );
}
