import { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "../../auth/supabase-server";
import {
  AiConversation,
  AiMessage,
  WeatherGroundingSnapshot,
} from "../domain/schemas";

export class AIConversationService {
  private clientPromise?: Promise<SupabaseClient | null>;

  constructor(clientPromise?: Promise<SupabaseClient | null>) {
    this.clientPromise = clientPromise;
  }

  private async getClient(): Promise<SupabaseClient | null> {
    if (this.clientPromise) {
      return this.clientPromise;
    }
    return createServerSupabase();
  }

  async createConversation(
    userId: string,
    params: {
      title?: string;
      locationName?: string;
      latitude?: number;
      longitude?: number;
    } = {}
  ): Promise<AiConversation | null> {
    const supabase = await this.getClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: userId,
        title: params.title ?? "Weather Discussion",
        location_name: params.locationName ?? null,
        latitude: params.latitude ?? null,
        longitude: params.longitude ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      locationName: data.location_name,
      latitude: data.latitude ? Number(data.latitude) : null,
      longitude: data.longitude ? Number(data.longitude) : null,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async listConversations(
    userId: string,
    limit = 20
  ): Promise<AiConversation[]> {
    const supabase = await this.getClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("ai_conversations")
      .select(
        "id, user_id, title, location_name, latitude, longitude, created_at, updated_at"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      locationName: row.location_name,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getConversation(
    userId: string,
    conversationId: string
  ): Promise<AiConversation | null> {
    const supabase = await this.getClient();
    if (!supabase) return null;

    const { data: conv, error: convErr } = await supabase
      .from("ai_conversations")
      .select()
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (convErr || !conv) {
      return null;
    }

    const { data: messages, error: msgErr } = await supabase
      .from("ai_messages")
      .select()
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    const parsedMessages: AiMessage[] =
      msgErr || !messages
        ? []
        : messages.map((m) => ({
            id: m.id,
            conversationId: m.conversation_id,
            role: m.role,
            content: m.content,
            contextSnapshot:
              m.weather_context_snapshot as WeatherGroundingSnapshot,
            tokensUsed: m.tokens_used,
            createdAt: m.created_at,
          }));

    return {
      id: conv.id,
      userId: conv.user_id,
      title: conv.title,
      locationName: conv.location_name,
      latitude: conv.latitude ? Number(conv.latitude) : null,
      longitude: conv.longitude ? Number(conv.longitude) : null,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      messages: parsedMessages,
    };
  }

  async addMessage(
    userId: string,
    conversationId: string,
    message: {
      role: "user" | "assistant" | "system";
      content: string;
      contextSnapshot?: WeatherGroundingSnapshot | null;
      tokensUsed?: number;
    }
  ): Promise<AiMessage | null> {
    const supabase = await this.getClient();
    if (!supabase) return null;

    // Verify conversation ownership first
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (!conv) {
      return null;
    }

    const { data, error } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        weather_context_snapshot: message.contextSnapshot ?? null,
        tokens_used: message.tokensUsed ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      return null;
    }

    // Touch conversation updated_at
    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return {
      id: data.id,
      conversationId: data.conversation_id,
      role: data.role,
      content: data.content,
      contextSnapshot: data.weather_context_snapshot,
      tokensUsed: data.tokens_used,
      createdAt: data.created_at,
    };
  }

  async deleteConversation(
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    const supabase = await this.getClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", userId);

    return !error;
  }
}

// Global singleton
let serviceInstance: AIConversationService | null = null;

export function getAIConversationService(): AIConversationService {
  if (!serviceInstance) {
    serviceInstance = new AIConversationService();
  }
  return serviceInstance;
}
