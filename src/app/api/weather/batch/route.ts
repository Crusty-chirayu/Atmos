import { NextRequest, NextResponse } from "next/server";
import { getWeatherService } from "@/lib/weather/service";
import { BatchWeatherQuerySchema } from "@/lib/weather/domain/schemas";
import { CanonicalUnits, ImperialUnits } from "@/lib/weather/domain/units";
import {
  weatherRouteLimiter,
  extractClientIp,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/weather/batch
 * Batch weather API route for fetching current and short-term forecast bundles
 * across up to 12 locations simultaneously with server-side bounded concurrency.
 *
 * Request Body:
 * {
 *   locations: Array<{
 *     id?: string;
 *     name: string;
 *     latitude: number;
 *     longitude: number;
 *     country?: string;
 *     countryCode?: string;
 *     adminArea?: string;
 *     timezone?: string;
 *   }>;
 *   units?: "metric" | "imperial" | "canonical";
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientIp = extractClientIp(request);
  const rateLimit = weatherRouteLimiter.check(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many batch weather requests. Please slow down.",
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Invalid JSON payload in request body",
        },
      },
      { status: 400 }
    );
  }

  const parsed = BatchWeatherQuerySchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: {
          code: "INVALID_PARAMETERS",
          message: firstIssue?.message || "Invalid batch query payload",
          path: firstIssue?.path,
        },
      },
      { status: 400 }
    );
  }

  const { locations, units } = parsed.data;

  try {
    const service = getWeatherService();
    const unitPreferences =
      units === "imperial" ? ImperialUnits : CanonicalUnits;

    const results = await service.getBatchWeather(locations, {
      units: unitPreferences,
      signal: request.signal,
    });

    return NextResponse.json(
      {
        items: results,
        total: results.length,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to execute batch weather query",
        },
      },
      { status: 500 }
    );
  }
}
