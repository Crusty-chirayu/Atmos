import { NextResponse } from "next/server";
import {
  createServerSupabase,
  getAuthenticatedUser,
} from "@/lib/auth/supabase-server";
import { getSavedLocations, saveLocation } from "@/lib/auth/locations-service";
import { SavedLocationInputSchema } from "@/lib/auth/validation";

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
    const locations = await getSavedLocations(supabase, user.id);
    return NextResponse.json({ locations });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to retrieve saved locations",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    const parseResult = SavedLocationInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid location data",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const location = await saveLocation(supabase, user.id, parseResult.data);
    return NextResponse.json({ location }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to save location",
      },
      { status: 500 }
    );
  }
}
