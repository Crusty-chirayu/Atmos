/**
 * ATMOS M7: Notification Detail API Route (Mark Read & Delete)
 * PATCH /api/user/notifications/[id]
 * DELETE /api/user/notifications/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/supabase-server";
import {
  markAsRead,
  deleteNotification,
} from "@/lib/notifications/service/notification-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const success = await markAsRead(id, user.id);

  if (!success) {
    return NextResponse.json(
      { error: "Notification not found or update failed" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const success = await deleteNotification(id, user.id);

  if (!success) {
    return NextResponse.json(
      { error: "Notification not found or delete failed" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
