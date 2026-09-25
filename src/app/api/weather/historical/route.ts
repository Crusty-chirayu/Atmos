import { NextRequest, NextResponse } from "next/server";
import { getWeatherService } from "@/lib/weather/service";
import { HistoricalApiQuerySchema } from "@/lib/weather/domain/schemas";
import { CanonicalUnits, ImperialUnits } from "@/lib/weather/domain/units";
import { WeatherError } from "@/lib/weather/errors/weather-error";
import {
  weatherRouteLimiter,
  extractClientIp,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/weather/historical
 * Public API Route Handler for historical weather reanalysis data (ECMWF ERA5 via Open-Meteo).
 *
 * Query Parameters:
 * - lat / latitude: number (-90..90, required)
 * - lon / longitude: number (-180..180, required)
 * - startDate: string (YYYY-MM-DD, required, >= 1940-01-01)
 * - endDate: string (YYYY-MM-DD, required, startDate <= endDate, <= 90 days span)
 * - timezone: string (optional IANA timezone, default: "auto")
 * - units: "metric" | "imperial" | "canonical" (default: "metric")
 * - includeHourly: "true" | "false" (default: false)
 * - bypassCache: "true" | "false" (default: false)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const clientIp = extractClientIp(request);
  const rateLimit = weatherRouteLimiter.check(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many historical weather requests. Please slow down.",
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
    startDate: searchParams.get("startDate") ?? searchParams.get("start_date"),
    endDate: searchParams.get("endDate") ?? searchParams.get("end_date"),
    timezone: searchParams.get("timezone") || undefined,
    units: searchParams.get("units") || undefined,
    includeHourly: searchParams.get("includeHourly") || undefined,
    bypassCache: searchParams.get("bypassCache") || undefined,
  };

  const parsed = HistoricalApiQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: {
          code: "INVALID_PARAMETERS",
          message:
            firstIssue?.message ||
            "Invalid historical weather query parameters",
          path: firstIssue?.path,
        },
      },
      { status: 400 }
    );
  }

  const {
    lat,
    lon,
    startDate,
    endDate,
    timezone,
    units,
    includeHourly,
    bypassCache,
  } = parsed.data;

  try {
    const service = getWeatherService();
    const unitPreferences =
      units === "imperial" ? ImperialUnits : CanonicalUnits;

    const historicalData = await service.getHistoricalWeather(
      {
        latitude: lat,
        longitude: lon,
        startDate,
        endDate,
        timezone,
        includeHourly,
      },
      {
        units: unitPreferences,
        bypassCache,
        signal: request.signal,
      }
    );

    return NextResponse.json(historicalData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Historical reanalysis data is immutable: cache at edge/CDN for 24h, SWR for 12h
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
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

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message:
            "An unexpected error occurred while retrieving historical weather data",
        },
      },
      { status: 500 }
    );
  }
}
