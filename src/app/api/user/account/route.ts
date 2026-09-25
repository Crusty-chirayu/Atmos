import { NextResponse } from "next/server";
import {
  createServerSupabase,
  getAuthenticatedUser,
} from "@/lib/auth/supabase-server";
import { createAdminSupabase } from "@/lib/auth/supabase-admin";

export async function DELETE() {
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

  try {
    // 1. Delete user-owned records (tables have CASCADE on auth.users(id), but explicit cleanup ensures zero orphans)
    await supabase.from("user_preferences").delete().eq("user_id", user.id);
    await supabase.from("saved_locations").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);

    // 2. If admin client is configured with service role key, delete user from auth.users
    const adminSupabase = createAdminSupabase();
    if (adminSupabase) {
      const { error: adminDeleteError } =
        await adminSupabase.auth.admin.deleteUser(user.id);
      if (adminDeleteError) {
        // Log safely without leaking credentials
        console.error(
          `[ATMOS Auth] Admin user deletion warning: ${adminDeleteError.message}`
        );
      }
    }

    // 3. Invalidate current session
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "Account and associated data deleted successfully.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to delete account",
      },
      { status: 500 }
    );
  }
}
