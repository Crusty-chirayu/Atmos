import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/supabase-server";
import { getAIConversationService } from "@/lib/ai/service/conversation-service";
import {
  SlidingWindowRateLimiter,
  extractClientIp,
} from "@/lib/security/rate-limit";

const limiter = new SlidingWindowRateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
});

export async function GET(request: NextRequest) {
  const clientIp = extractClientIp(request);
  const rateLimit = limiter.check(clientIp);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": rateLimit.retryAfterSec.toString() },
      }
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      {
        error: "Authentication required to access saved conversations",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  const convService = getAIConversationService();
  const conversations = await convService.listConversations(user.id);

  return NextResponse.json({ conversations }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const clientIp = extractClientIp(request);
  const rateLimit = limiter.check(clientIp);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": rateLimit.retryAfterSec.toString() },
      }
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      {
        error: "Authentication required to create conversations",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Optional body
  }

  const convService = getAIConversationService();
  const conv = await convService.createConversation(user.id, {
    title: typeof body.title === "string" ? body.title : undefined,
    locationName:
      typeof body.locationName === "string" ? body.locationName : undefined,
    latitude: typeof body.latitude === "number" ? body.latitude : undefined,
    longitude: typeof body.longitude === "number" ? body.longitude : undefined,
  });

  if (!conv) {
    return NextResponse.json(
      { error: "Failed to create conversation", code: "DATABASE_ERROR" },
      { status: 500 }
    );
  }

  return NextResponse.json({ conversation: conv }, { status: 201 });
}
