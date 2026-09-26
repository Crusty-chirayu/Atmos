/**
 * ATMOS M7: Alert Rules API Route (List & Create)
 * GET /api/user/alerts
 * POST /api/user/alerts
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/supabase-server";
import {
  listAlertRules,
  createAlertRule,
} from "@/lib/notifications/service/alert-service";
import { CreateAlertRuleSchema } from "@/lib/notifications/domain/schemas";
import {
  SlidingWindowRateLimiter,
  extractClientIp,
} from "@/lib/security/rate-limit";

const alertRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
});

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await listAlertRules(user.id);
  return NextResponse.json({ rules });
}

export async function POST(request: NextRequest) {
  const clientIp = extractClientIp(request);
  const rateLimitResult = alertRateLimiter.check(clientIp);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many alert creation requests. Please wait." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitResult.retryAfterSec) },
      }
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parseResult = CreateAlertRuleSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid alert rule parameters",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const created = await createAlertRule(user.id, parseResult.data);
    return NextResponse.json({ rule: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/user/alerts] Error:", err);
    return NextResponse.json(
      { error: "Failed to create alert rule" },
      { status: 500 }
    );
  }
}
