/**
 * ATMOS M7: Alert Rule Detail API Route (Get, Update, Delete)
 * GET /api/user/alerts/[id]
 * PATCH /api/user/alerts/[id]
 * DELETE /api/user/alerts/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/supabase-server";
import {
  getAlertRule,
  updateAlertRule,
  deleteAlertRule,
} from "@/lib/notifications/service/alert-service";
import { UpdateAlertRuleSchema } from "@/lib/notifications/domain/schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const rule = await getAlertRule(id, user.id);

  if (!rule) {
    return NextResponse.json(
      { error: "Alert rule not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ rule });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parseResult = UpdateAlertRuleSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid update parameters",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updated = await updateAlertRule(id, user.id, parseResult.data);
    if (!updated) {
      return NextResponse.json(
        { error: "Alert rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ rule: updated });
  } catch (err) {
    console.error("[PATCH /api/user/alerts/[id]] Error:", err);
    return NextResponse.json(
      { error: "Failed to update alert rule" },
      { status: 500 }
    );
  }
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
  const deleted = await deleteAlertRule(id, user.id);

  if (!deleted) {
    return NextResponse.json(
      { error: "Alert rule not found or already deleted" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
