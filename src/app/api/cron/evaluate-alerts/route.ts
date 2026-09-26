/**
 * ATMOS M7: Protected Alert Evaluation Scheduled Endpoint
 * POST /api/cron/evaluate-alerts
 * GET /api/cron/evaluate-alerts
 *
 * Invoked by Vercel Cron, GitHub Actions, or local automation.
 * Requires Authorization: Bearer <CRON_SECRET> or x-cron-secret header.
 */

import { NextRequest, NextResponse } from "next/server";
import { serverEnv, publicEnv } from "@/lib/config/env";
import { runAlertEvaluation } from "@/lib/notifications/evaluator/evaluation-orchestrator";

function isAuthorized(request: NextRequest): boolean {
  const secret = serverEnv.CRON_SECRET;

  // In production, CRON_SECRET is strictly required
  if (publicEnv.NEXT_PUBLIC_APP_ENV === "production") {
    if (!secret || secret.length < 8) return false;
  }

  // Check headers if CRON_SECRET is configured
  if (secret && secret.length > 0) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader === `Bearer ${secret}`) {
      return true;
    }
    const cronHeader = request.headers.get("x-cron-secret");
    if (cronHeader && cronHeader === secret) {
      return true;
    }
    return false;
  }

  // In local development/preview, allow manual inspection if secret not configured
  return publicEnv.NEXT_PUBLIC_APP_ENV !== "production";
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runAlertEvaluation();
    return NextResponse.json({
      status: "success",
      summary,
    });
  } catch (err) {
    console.error("[CRON evaluate-alerts] Execution failed:", err);
    return NextResponse.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
