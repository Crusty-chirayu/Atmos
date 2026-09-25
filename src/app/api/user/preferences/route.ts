import { NextResponse } from "next/server";
import {
  createServerSupabase,
  getAuthenticatedUser,
} from "@/lib/auth/supabase-server";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/lib/auth/preferences-service";
import { UpdateUserPreferencesSchema } from "@/lib/auth/validation";

export async function GET() {
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
    const preferences = await getUserPreferences(supabase, user.id);
    return NextResponse.json({ preferences });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to retrieve user preferences",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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
    const body = await request.json();
    const parseResult = UpdateUserPreferencesSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid preference data",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const preferences = await updateUserPreferences(
      supabase,
      user.id,
      parseResult.data
    );
    return NextResponse.json({ preferences });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to update user preferences",
      },
      { status: 500 }
    );
  }
}
