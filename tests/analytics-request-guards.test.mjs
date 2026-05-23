import assert from "node:assert/strict";
import test from "node:test";

import {
  checkAnalyticsRateLimit,
  getAnalyticsRateLimitKey,
  isAllowedAnalyticsRequestSource
} from "../lib/analytics/requestGuards.ts";

test("analytics accepts same-origin browser posts and rejects explicit cross-origin posts", () => {
  assert.equal(
    isAllowedAnalyticsRequestSource({
      requestUrl: "https://www.vistaire.ca/api/analytics/events",
      origin: "https://www.vistaire.ca",
      referer: ""
    }),
    true
  );

  assert.equal(
    isAllowedAnalyticsRequestSource({
      requestUrl: "https://www.vistaire.ca/api/analytics/events",
      origin: "https://attacker.example",
      referer: "https://attacker.example/demo"
    }),
    false
  );
});

test("analytics treats localhost loopback aliases as same-origin in local dev", () => {
  assert.equal(
    isAllowedAnalyticsRequestSource({
      requestUrl: "http://localhost:3100/api/analytics/events",
      origin: "http://127.0.0.1:3100",
      referer: "http://127.0.0.1:3100/demo"
    }),
    true
  );

  assert.equal(
    isAllowedAnalyticsRequestSource({
      requestUrl: "http://localhost:3100/api/analytics/events",
      origin: "http://127.0.0.1:3200",
      referer: "http://127.0.0.1:3200/demo"
    }),
    false
  );
});

test("analytics soft-origin guard accepts missing origin only when referrer is absent or same-origin", () => {
  assert.equal(
    isAllowedAnalyticsRequestSource({
      requestUrl: "https://www.vistaire.ca/api/analytics/events",
      origin: "",
      referer: ""
    }),
    true
  );

  assert.equal(
    isAllowedAnalyticsRequestSource({
      requestUrl: "https://www.vistaire.ca/api/analytics/events",
      origin: "",
      referer: "https://www.vistaire.ca/demo"
    }),
    true
  );

  assert.equal(
    isAllowedAnalyticsRequestSource({
      requestUrl: "https://www.vistaire.ca/api/analytics/events",
      origin: "",
      referer: "https://attacker.example/demo"
    }),
    false
  );
});

test("analytics rate limit is scoped by client and session", () => {
  const store = new Map();
  const payload = {
    restaurantId: "11111111-1111-1111-1111-111111111111",
    sessionId: "session-a"
  };
  const key = getAnalyticsRateLimitKey(
    {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "user-agent": "Playwright"
    },
    payload
  );

  assert.equal(key, "203.0.113.10:session-a");
  assert.deepEqual(
    checkAnalyticsRateLimit(key, {
      limit: 2,
      now: 1_000,
      store,
      windowMs: 60_000
    }),
    { ok: true }
  );
  assert.deepEqual(
    checkAnalyticsRateLimit(key, {
      limit: 2,
      now: 1_001,
      store,
      windowMs: 60_000
    }),
    { ok: true }
  );
  assert.deepEqual(
    checkAnalyticsRateLimit(key, {
      limit: 2,
      now: 1_002,
      store,
      windowMs: 60_000
    }),
    { ok: false, retryAfterSeconds: 60 }
  );
});
