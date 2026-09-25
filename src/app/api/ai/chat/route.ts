import { NextRequest, NextResponse } from "next/server";
import { AiChatRequestSchema } from "@/lib/ai/domain/schemas";
import { getAIProviderRegistry } from "@/lib/ai/providers/registry";
import { buildWeatherGroundingSnapshot } from "@/lib/ai/context/grounding";
import { getAIConversationService } from "@/lib/ai/service/conversation-service";
import { getAuthenticatedUser } from "@/lib/auth/supabase-server";
import {
  SlidingWindowRateLimiter,
  extractClientIp,
} from "@/lib/security/rate-limit";

// Rate limit: 20 requests per minute per IP
const aiChatLimiter = new SlidingWindowRateLimiter({
  maxRequests: 20,
  windowMs: 60 * 1000,
});

export async function POST(request: NextRequest) {
  const clientIp = extractClientIp(request);
  const rateLimit = aiChatLimiter.check(clientIp);

  const headers = new Headers({
    "Content-Type": "application/json",
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(rateLimit.resetTimeMs / 1000).toString(),
  });

  if (!rateLimit.allowed) {
    headers.set("Retry-After", rateLimit.retryAfterSec.toString());
    return NextResponse.json(
      {
        error:
          "Rate limit exceeded. Please wait a moment before sending another AI query.",
        code: "RATE_LIMITED",
      },
      { status: 429, headers }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body", code: "INVALID_BODY" },
      { status: 400, headers }
    );
  }

  const parseResult = AiChatRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid AI chat request",
        code: "INVALID_PARAMETERS",
        details: parseResult.error.format(),
      },
      { status: 400, headers }
    );
  }

  const { message, conversationId, location, mode } = parseResult.data;

  // Retrieve authenticated user if present
  const user = await getAuthenticatedUser();
  const convService = getAIConversationService();

  // Build grounding context if location is supplied
  let groundingContext = null;
  if (location) {
    groundingContext = await buildWeatherGroundingSnapshot({
      name: location.name,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    });
  }

  // Retrieve conversation history if conversationId is provided
  let history: Array<{ role: "user" | "model"; content: string }> = [];
  if (user && conversationId) {
    const existing = await convService.getConversation(user.id, conversationId);
    if (existing?.messages) {
      history = existing.messages.slice(-8).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content,
      }));
    }
  }

  // Construct custom instructions based on mode
  let customInstruction = "";
  if (mode === "planning") {
    customInstruction =
      "The user is planning travel or an outdoor activity. Highlight precipitation probability, temperature shifts, and recommended gear or optimal timing.";
  } else if (mode === "comparison") {
    customInstruction =
      "The user is comparing meteorological conditions. Emphasize differences in temperature, wind, comfort, and weather conditions clearly.";
  }

  try {
    const provider = getAIProviderRegistry().getDefault();
    const result = await provider.generateCompletion(message, {
      systemInstruction: customInstruction,
      context: groundingContext ?? undefined,
      history,
    });

    let activeConvId = conversationId;

    // If user is authenticated, persist conversation & message
    if (user) {
      if (!activeConvId) {
        const newConv = await convService.createConversation(user.id, {
          title: message.slice(0, 40),
          locationName: location?.name,
          latitude: location?.latitude,
          longitude: location?.longitude,
        });
        if (newConv) {
          activeConvId = newConv.id;
        }
      }

      if (activeConvId) {
        // Record user message
        await convService.addMessage(user.id, activeConvId, {
          role: "user",
          content: message,
          contextSnapshot: groundingContext,
        });

        // Record assistant response
        await convService.addMessage(user.id, activeConvId, {
          role: "assistant",
          content: result.content,
          tokensUsed: result.tokensUsed?.totalTokens,
        });
      }
    }

    return NextResponse.json(
      {
        reply: result.content,
        conversationId: activeConvId,
        grounded: result.grounded,
        model: result.model,
        location: location
          ? {
              name: location.name,
              latitude: location.latitude,
              longitude: location.longitude,
            }
          : undefined,
        fetchedAt: groundingContext?.fetchedAt,
      },
      { status: 200, headers }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to generate AI response";
    return NextResponse.json(
      {
        error: errorMessage,
        code: "AI_GENERATION_FAILED",
      },
      { status: 502, headers }
    );
  }
}
