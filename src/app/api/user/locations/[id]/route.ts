import { NextResponse } from "next/server";
import {
  createServerSupabase,
  getAuthenticatedUser,
} from "@/lib/auth/supabase-server";
import { deleteSavedLocation } from "@/lib/auth/locations-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", code: "NOT_AUTHENTICATED" },
      { status: 401 }
    );
  }

  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Service unavailable", code: "NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing location ID" }, { status: 400 });
  }

  try {
    await deleteSavedLocation(supabase, user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to delete location",
      },
      { status: 500 }
    );
  }
}
