import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/supabase-server";
import { getAIConversationService } from "@/lib/ai/service/conversation-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const convService = getAIConversationService();
  const conversation = await convService.getConversation(user.id, id);

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({ conversation }, { status: 200 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const convService = getAIConversationService();
  const success = await convService.deleteConversation(user.id, id);

  if (!success) {
    return NextResponse.json(
      {
        error: "Failed to delete conversation or not authorized",
        code: "DELETE_FAILED",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
