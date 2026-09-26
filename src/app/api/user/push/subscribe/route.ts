/**
 * ATMOS M7: Web Push Subscription API Route
 * POST /api/user/push/subscribe
 * DELETE /api/user/push/subscribe
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/supabase-server";
import {
  savePushSubscription,
  deletePushSubscription,
} from "@/lib/notifications/service/push-service";
import { CreatePushSubscriptionSchema } from "@/lib/notifications/domain/schemas";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parseResult = CreatePushSubscriptionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid push subscription payload",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const success = await savePushSubscription(user.id, parseResult.data);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to persist push subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/user/push/subscribe] Error:", err);
    return NextResponse.json(
      { error: "Invalid subscription request" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { endpoint } = await request.json();
    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json(
        { error: "Endpoint URL is required" },
        { status: 400 }
      );
    }

    const success = await deletePushSubscription(user.id, endpoint);
    return NextResponse.json({ success });
  } catch (err) {
    console.error("[DELETE /api/user/push/subscribe] Error:", err);
    return NextResponse.json(
      { error: "Invalid unsubscription request" },
      { status: 400 }
    );
  }
}
