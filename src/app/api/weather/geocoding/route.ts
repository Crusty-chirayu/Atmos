import { NextRequest, NextResponse } from "next/server";
import { getGeocodingService } from "@/lib/geocoding/service";
import { WeatherError } from "@/lib/weather/errors/weather-error";
import {
  geocodingRouteLimiter,
  extractClientIp,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/weather/geocoding
 * Public API Route Handler for geocoding and location search.
 *
 * Query Parameters:
 * - q: Search query (required, 2-100 characters)
 * - count: Max results (optional, 1-100, default: 10)
 * - lang: Language code (optional, default: "en")
 * - country: 2-letter ISO country code filter (optional)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Public route rate limiting
  const clientIp = extractClientIp(request);
  const rateLimit = geocodingRouteLimiter.check(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many search requests. Please slow down.",
          retryAfterSeconds: rateLimit.retryAfterSec,
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": rateLimit.retryAfterSec.toString(),
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(
            rateLimit.resetTimeMs / 1000
          ).toString(),
        },
      }
    );
  }

  const searchParams = request.nextUrl.searchParams;

  const q = searchParams.get("q") || searchParams.get("query");
  const countParam = searchParams.get("count");
  const langParam = searchParams.get("lang") || searchParams.get("language");
  const countryParam =
    searchParams.get("country") || searchParams.get("countryCode");

  if (!q || q.trim().length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_PARAMETERS",
          message: "Search query 'q' parameter is required and cannot be empty",
        },
      },
      { status: 400 }
    );
  }

  const count = countParam ? parseInt(countParam, 10) : undefined;
  if (countParam && (isNaN(Number(count)) || count! < 1 || count! > 100)) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_PARAMETERS",
          message: "Result count must be an integer between 1 and 100",
        },
      },
      { status: 400 }
    );
  }

  try {
    const service = getGeocodingService();
    const result = await service.search(
      {
        query: q,
        count: count ?? 10,
        language: langParam ?? "en",
        countryCode: countryParam ?? undefined,
      },
      {
        signal: request.signal,
      }
    );

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Geocoding results are stable: cache at CDN for 1 hour, stale-while-revalidate for 24 hours
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: unknown) {
    if (err instanceof WeatherError) {
      return NextResponse.json(
        {
          error: {
            code: err.code,
            message: err.message,
            provider: err.provider,
            retryAfterSeconds: err.retryAfterSeconds,
          },
        },
        {
          status: err.statusCode,
          headers: err.retryAfterSeconds
            ? { "Retry-After": err.retryAfterSeconds.toString() }
            : undefined,
        }
      );
    }

    // Sanitize any internal or unexpected errors - never leak stack traces
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while searching for locations",
        },
      },
      { status: 500 }
    );
  }
}
