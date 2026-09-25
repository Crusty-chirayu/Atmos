import { z } from "zod";

/**
 * Valid roles for AI conversation messages.
 */
export type AiMessageRole = "user" | "assistant" | "system";

/**
 * Compact weather grounding context passed to the AI model.
 */
export interface WeatherGroundingSnapshot {
  location: {
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  };
  fetchedAt: string;
  units: {
    temperature: string;
    windSpeed: string;
    precipitation: string;
    pressure: string;
  };
  current?: {
    temperature: number;
    apparentTemperature: number;
    conditionCode: number;
    conditionLabel: string;
    relativeHumidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    pressureMsl: number;
    uvIndex?: number;
    visibility?: number;
  };
  forecastNext24h?: Array<{
    time: string;
    temperature: number;
    precipitationProbability?: number;
    precipitationAmount?: number;
    windSpeed?: number;
    conditionLabel?: string;
  }>;
  forecastNext7d?: Array<{
    date: string;
    temperatureMax: number;
    temperatureMin: number;
    precipitationProbability?: number;
    conditionLabel?: string;
    sunrise?: string;
    sunset?: string;
  }>;
  dataQualityNotes?: string[];
}

/**
 * Domain model for an AI message in a conversation.
 */
export interface AiMessage {
  id: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  contextSnapshot?: WeatherGroundingSnapshot | null;
  tokensUsed?: number;
  createdAt: string;
}

/**
 * Domain model for an AI conversation thread.
 */
export interface AiConversation {
  id: string;
  userId: string;
  title: string;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt: string;
  messages?: AiMessage[];
}

/**
 * Schema for incoming user chat requests.
 */
export const AiChatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(1000, "Message cannot exceed 1,000 characters"),
  conversationId: z.string().uuid().optional(),
  location: z
    .object({
      name: z.string().max(200).default("Selected Location"),
      country: z.string().optional(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      timezone: z.string().optional().default("auto"),
    })
    .optional(),
  mode: z.enum(["general", "planning", "comparison"]).default("general"),
  comparisonLocation: z
    .object({
      name: z.string().max(200),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      timezone: z.string().optional().default("auto"),
    })
    .optional(),
});

export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;

/**
 * Response returned from the chat route.
 */
export interface AiChatResponse {
  reply: string;
  conversationId?: string;
  grounded: boolean;
  model: string;
  location?: {
    name: string;
    latitude: number;
    longitude: number;
  };
  fetchedAt?: string;
  error?: string;
}
