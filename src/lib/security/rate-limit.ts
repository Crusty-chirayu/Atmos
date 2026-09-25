/**
 * In-memory sliding window rate limiter for public API routes.
 *
 * Provides protection against request flooding and scraping.
 * Designed with a clean interface allowing future replacement by
 * Redis (Upstash) or Supabase edge functions in distributed deployments.
 */

export interface RateLimiterOptions {
  /** Maximum number of allowed requests within windowMs */
  maxRequests: number;
  /** Duration of the sliding window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTimeMs: number;
  retryAfterSec: number;
}

interface ClientRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly clients: Map<string, ClientRecord> = new Map();
  private lastCleanup: number = Date.now();
  private readonly cleanupIntervalMs: number = 60000; // 1 minute

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  /**
   * Check whether a client identifier (IP address) is allowed to perform a request.
   */
  check(identifier: string, now: number = Date.now()): RateLimitResult {
    this.periodicCleanup(now);

    const windowStart = now - this.windowMs;
    let record = this.clients.get(identifier);

    if (!record) {
      record = { timestamps: [] };
      this.clients.set(identifier, record);
    }

    // Filter out timestamps outside the active window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    const currentCount = record.timestamps.length;
    const allowed = currentCount < this.maxRequests;

    if (allowed) {
      record.timestamps.push(now);
    }

    const remaining = Math.max(0, this.maxRequests - record.timestamps.length);
    const oldestTimestamp = record.timestamps[0] ?? now;
    const resetTimeMs = oldestTimestamp + this.windowMs;
    const retryAfterSec = allowed
      ? 0
      : Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

    return {
      allowed,
      limit: this.maxRequests,
      remaining,
      resetTimeMs,
      retryAfterSec,
    };
  }

  /**
   * Remove stale clients who haven't made requests in the current window.
   */
  private periodicCleanup(now: number): void {
    if (now - this.lastCleanup < this.cleanupIntervalMs) {
      return;
    }
    this.lastCleanup = now;
    const windowStart = now - this.windowMs;

    for (const [key, record] of this.clients.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.clients.delete(key);
      }
    }
  }

  /**
   * Reset rate limit records for testing purposes.
   */
  reset(): void {
    this.clients.clear();
    this.lastCleanup = Date.now();
  }
}

/**
 * Extract client IP address safely from Request headers with fallbacks.
 */
export function extractClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Return first non-empty IP in comma-separated list
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  return "127.0.0.1";
}

// Global process-local rate limiters for public routes
export const weatherRouteLimiter = new SlidingWindowRateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000, // 60 requests per minute
});

export const geocodingRouteLimiter = new SlidingWindowRateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 100 requests per minute
});
