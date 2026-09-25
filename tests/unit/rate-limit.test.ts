import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SlidingWindowRateLimiter,
  extractClientIp,
} from "../../src/lib/security/rate-limit";

describe("SlidingWindowRateLimiter", () => {
  it("allows requests up to the maxRequests limit within window", () => {
    const limiter = new SlidingWindowRateLimiter({
      maxRequests: 3,
      windowMs: 1000,
    });
    const now = 10000;

    const res1 = limiter.check("ip-1", now);
    assert.strictEqual(res1.allowed, true);
    assert.strictEqual(res1.remaining, 2);

    const res2 = limiter.check("ip-1", now + 10);
    assert.strictEqual(res2.allowed, true);
    assert.strictEqual(res2.remaining, 1);

    const res3 = limiter.check("ip-1", now + 20);
    assert.strictEqual(res3.allowed, true);
    assert.strictEqual(res3.remaining, 0);

    // 4th request exceeds limit
    const res4 = limiter.check("ip-1", now + 30);
    assert.strictEqual(res4.allowed, false);
    assert.strictEqual(res4.remaining, 0);
    assert.ok(res4.retryAfterSec >= 1);
  });

  it("differentiates between distinct client identifiers", () => {
    const limiter = new SlidingWindowRateLimiter({
      maxRequests: 2,
      windowMs: 1000,
    });
    const now = 10000;

    limiter.check("ip-1", now);
    limiter.check("ip-1", now + 10);
    assert.strictEqual(limiter.check("ip-1", now + 20).allowed, false);

    // ip-2 has separate quota
    assert.strictEqual(limiter.check("ip-2", now + 20).allowed, true);
  });

  it("resets quota after the sliding window expires", () => {
    const limiter = new SlidingWindowRateLimiter({
      maxRequests: 2,
      windowMs: 1000,
    });
    const now = 10000;

    limiter.check("ip-1", now);
    limiter.check("ip-1", now + 500);
    assert.strictEqual(limiter.check("ip-1", now + 600).allowed, false);

    // After windowMs has passed for the first request
    const futureTime = now + 1001;
    const res = limiter.check("ip-1", futureTime);
    assert.strictEqual(res.allowed, true);
  });
});

describe("extractClientIp", () => {
  it("extracts the first IP from comma-separated x-forwarded-for header", () => {
    const req = new Request("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
      },
    });
    assert.strictEqual(extractClientIp(req), "203.0.113.195");
  });

  it("extracts x-real-ip when x-forwarded-for is missing", () => {
    const req = new Request("http://localhost/api/test", {
      headers: {
        "x-real-ip": "198.51.100.1",
      },
    });
    assert.strictEqual(extractClientIp(req), "198.51.100.1");
  });

  it("extracts cf-connecting-ip when other headers are missing", () => {
    const req = new Request("http://localhost/api/test", {
      headers: {
        "cf-connecting-ip": "192.0.2.1",
      },
    });
    assert.strictEqual(extractClientIp(req), "192.0.2.1");
  });

  it("falls back to 127.0.0.1 when no headers present", () => {
    const req = new Request("http://localhost/api/test");
    assert.strictEqual(extractClientIp(req), "127.0.0.1");
  });
});
