import { NextRequest, NextResponse } from "next/server";
import { AiChatRequestSchema } from "@/lib/ai/domain/schemas";
import { getAIProviderRegistry } from "@/lib/ai/providers/registry";
import { resolveQueryGrounding } from "@/lib/ai/context/intent";
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

  // Dynamically resolve weather grounding based on query intent & active location
  const resolved = await resolveQueryGrounding(message, location);
  const groundingContext = resolved.primaryGrounding;
  const secondaryGrounding = resolved.secondaryGrounding;

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

  // Construct custom instructions based on mode & travel intent
  let customInstruction = "";
  if (resolved.isTravelQuery && secondaryGrounding) {
    customInstruction = `The user is planning travel from ${secondaryGrounding.location.name} to ${groundingContext?.location.name ?? "destination"}. Compare weather, rain risks, and give clear packing & travel advice.`;
  } else if (mode === "planning") {
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
        location: groundingContext?.location
          ? {
              name: groundingContext.location.name,
              latitude: groundingContext.location.latitude,
              longitude: groundingContext.location.longitude,
            }
          : location
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
    const rawErrorMessage =
      err instanceof Error ? err.message : "Failed to generate AI response";
    // Security: sanitize any potential upstream API keys or query params from error message
    const sanitizedError = rawErrorMessage
      .replace(/key=[A-Za-z0-9_-]+/gi, "key=[REDACTED]")
      .replace(/AIza[A-Za-z0-9_-]+/g, "[REDACTED]");

    return NextResponse.json(
      {
        error: sanitizedError,
        code: "AI_GENERATION_FAILED",
      },
      { status: 502, headers }
    );
  }
}
