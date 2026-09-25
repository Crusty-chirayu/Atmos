import { NextRequest, NextResponse } from "next/server";
import { getWeatherService } from "@/lib/weather/service";
import { WeatherApiQuerySchema } from "@/lib/weather/domain/schemas";
import { CanonicalUnits, ImperialUnits } from "@/lib/weather/domain/units";
import { WeatherError } from "@/lib/weather/errors/weather-error";
import {
  weatherRouteLimiter,
  extractClientIp,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/weather
 * Public API Route Handler for complete weather forecast bundles.
 *
 * Query Parameters:
 * - lat / latitude: number (-90..90, required)
 * - lon / longitude: number (-180..180, required)
 * - name: string (optional location display name)
 * - country: string (optional country name)
 * - countryCode: string (optional 2-letter ISO country code)
 * - adminArea: string (optional state/region)
 * - timezone: string (optional IANA timezone, default: "auto")
 * - forecastDays: number (1..16, default: 7)
 * - units: "metric" | "imperial" | "canonical" (default: "metric")
 * - bypassCache: "true" | "false" (default: false)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Public route rate limiting
  const clientIp = extractClientIp(request);
  const rateLimit = weatherRouteLimiter.check(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many weather requests. Please slow down.",
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

  const latRaw = searchParams.get("lat") ?? searchParams.get("latitude");
  const lonRaw = searchParams.get("lon") ?? searchParams.get("longitude");

  if (latRaw === null || lonRaw === null) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_PARAMETERS",
          message:
            "Both latitude ('lat') and longitude ('lon') query parameters are required",
        },
      },
      { status: 400 }
    );
  }

  const rawQuery = {
    lat: latRaw,
    lon: lonRaw,
    name: searchParams.get("name") || undefined,
    country: searchParams.get("country") || undefined,
    countryCode: searchParams.get("countryCode") || undefined,
    adminArea: searchParams.get("adminArea") || undefined,
    timezone: searchParams.get("timezone") || undefined,
    forecastDays: searchParams.get("forecastDays") || undefined,
    units: searchParams.get("units") || undefined,
    bypassCache: searchParams.get("bypassCache") || undefined,
  };

  const parsed = WeatherApiQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: {
          code: "INVALID_PARAMETERS",
          message: firstIssue?.message || "Invalid weather query parameters",
          path: firstIssue?.path,
        },
      },
      { status: 400 }
    );
  }

  const {
    lat,
    lon,
    name,
    country,
    countryCode,
    adminArea,
    timezone,
    forecastDays,
    units,
    bypassCache,
  } = parsed.data;

  try {
    const service = getWeatherService();
    const unitPreferences =
      units === "imperial" ? ImperialUnits : CanonicalUnits;

    const bundle = await service.getWeatherBundle(
      {
        name,
        country,
        countryCode,
        adminArea,
      },
      { latitude: lat, longitude: lon },
      {
        timezone,
        forecastDays,
        units: unitPreferences,
        bypassCache,
        signal: request.signal,
      }
    );

    return NextResponse.json(bundle, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Forecast data changes periodically: cache at CDN for 10 min, SWR for 30 min
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
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

    // Sanitize any unexpected internal errors
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred while retrieving weather data",
        },
      },
      { status: 500 }
    );
  }
}
