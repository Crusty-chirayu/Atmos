import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/auth/supabase-server";

/**
 * Validates a redirect target to prevent open redirect vulnerabilities.
 * Allows only relative paths starting with / and not starting with //.
 */
export function validateRedirectTarget(rawTarget: string | null): string {
  if (!rawTarget) return "/";
  const trimmed = rawTarget.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes(":")
  ) {
    return trimmed;
  }
  return "/";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = validateRedirectTarget(searchParams.get("next"));

  if (code) {
    const supabase = await createServerSupabase();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // If code exchange failed or supabase is unconfigured, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
