/**
 * ATMOS M7: Notifications API Route (Inbox Listing & Bulk Actions)
 * GET /api/user/notifications
 * PATCH /api/user/notifications (mark all read)
 * DELETE /api/user/notifications (clear read)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/supabase-server";
import {
  listNotifications,
  getUnreadCount,
  markAllAsRead,
  clearReadNotifications,
} from "@/lib/notifications/service/notification-service";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam
    ? Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 100)
    : 50;

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(user.id, limit),
    getUnreadCount(user.id),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}

export async function PATCH() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const success = await markAllAsRead(user.id);
  return NextResponse.json({ success });
}

export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const success = await clearReadNotifications(user.id);
  return NextResponse.json({ success });
}
