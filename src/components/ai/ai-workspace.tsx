"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { VoiceInputButton, VoicePlayerButton } from "./voice-controls";
import { MarkdownMessage } from "./markdown-message";
import { LocationSearch } from "../weather/location-search";
import { GeocodingLocation } from "@/lib/geocoding/domain/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useCurrentLocation } from "@/lib/location/location-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  grounded?: boolean;
  model?: string;
  time: string;
}

interface ConversationItem {
  id: string;
  title: string;
  locationName?: string | null;
  updatedAt: string;
}

export function AiWorkspace() {
  const { user } = useAuth();
  const { activeLocation, setActiveLocation } = useCurrentLocation();
  const [mode, setMode] = useState<"general" | "planning" | "comparison">(
    "general"
  );

  // Selected location bound directly to global active location
  const selectedLocation = activeLocation;

  const handleSelectLocation = (loc: GeocodingLocation) => {
    setActiveLocation(loc);
  };

  // Secondary location for comparison
  const [comparisonLocation, setComparisonLocation] =
    useState<GeocodingLocation>({
      id: "default-tokyo",
      providerId: "open-meteo:1850147",
      formattedAddress: "Tokyo, Japan",
      name: "Tokyo",
      latitude: 35.6762,
      longitude: 139.6503,
      country: "Japan",
      countryCode: "JP",
      adminArea: "Tokyo",
      timezone: "Asia/Tokyo",
    });

  // Trip planning parameters
  const [tripActivity, setTripActivity] = useState("Sightseeing & Walking");
  const [tripDays, setTripDays] = useState("3 Days");

  // Chat state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [errorState, setErrorState] = useState<{
    message: string;
    query: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load user conversations if authenticated
  useEffect(() => {
    if (!user) return;
    async function loadConversations() {
      try {
        const res = await fetch("/api/ai/conversations");
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations ?? []);
        }
      } catch {
        // Silently handle error
      }
    }
    loadConversations();
  }, [user]);

  const msgCounterRef = useRef(0);

  const loadConversationHistory = async (convId: string) => {
    setActiveConversationId(convId);
    setErrorState(null);
    try {
      const res = await fetch(`/api/ai/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.conversation?.messages) {
          setMessages(
            data.conversation.messages.map(
              (m: {
                id: string;
                role: "user" | "assistant";
                content: string;
                contextSnapshot?: unknown;
                createdAt: string;
              }) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                grounded: Boolean(m.contextSnapshot),
                time: new Date(m.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })
            )
          );
        }
      }
    } catch {
      // Keep existing messages
    }
  };

  const handleStartNewChat = () => {
    setActiveConversationId(undefined);
    setMessages([]);
    setInput("");
    setErrorState(null);
  };

  const handleDeleteConversation = async (
    convId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/ai/conversations/${convId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConversationId === convId) {
          handleStartNewChat();
        }
      }
    } catch {
      // Handle error
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isPending) return;

    setErrorState(null);
    msgCounterRef.current += 1;
    const userMessage: Message = {
      id: `usr-${msgCounterRef.current}`,
      role: "user",
      content: query,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");

    startTransition(async () => {
      try {
        let payloadMessage = query;
        if (mode === "planning") {
          payloadMessage = `[Trip Planning Request for ${selectedLocation.name} for ${tripDays} doing ${tripActivity}]: ${query}`;
        } else if (mode === "comparison") {
          payloadMessage = `[Comparison between ${selectedLocation.name} and ${comparisonLocation.name}]: ${query}`;
        }

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: payloadMessage,
            conversationId: activeConversationId,
            location: {
              name: selectedLocation.name,
              country: selectedLocation.country,
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
              timezone: selectedLocation.timezone,
            },
            comparisonLocation:
              mode === "comparison"
                ? {
                    name: comparisonLocation.name,
                    latitude: comparisonLocation.latitude,
                    longitude: comparisonLocation.longitude,
                    timezone: comparisonLocation.timezone,
                  }
                : undefined,
            mode,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.error || !data.reply) {
          const errorMsg =
            data.error ||
            `Weather Intelligence service temporarily unavailable (Status ${res.status}).`;
          setErrorState({ message: errorMsg, query });
          return;
        }

        msgCounterRef.current += 1;
        const assistantMessage: Message = {
          id: `ast-${msgCounterRef.current}`,
          role: "assistant",
          content: data.reply,
          grounded: data.grounded,
          model: data.model,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        if (data.conversationId) {
          setActiveConversationId(data.conversationId);
        }
      } catch {
        setErrorState({
          message:
            "Network error communicating with ATMOS AI. Please check your connection.",
          query,
        });
      }
    });
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col bg-white text-[#222222]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E5E7EB]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-[#FFF9E6] border border-[#FFC928] text-[#222222] text-xs font-medium mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC928]" />
            Weather AI Assistant
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#222222]">
            Weather Intelligence & Planning
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#6B7280] max-w-2xl">
            Conversational weather insights grounded in real-time Open-Meteo forecasts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#E5E7EB] bg-white hover:bg-[#F7F7F7] text-xs font-semibold text-[#222222] transition-colors shadow-xs"
          >
            Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#E5E7EB] bg-white hover:bg-[#F7F7F7] text-xs font-semibold text-[#222222] transition-colors shadow-xs"
          >
            Home
          </Link>
        </div>
      </div>

      {/* Main Grid: Sidebar + Chat Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 items-start">
        {/* Left Column: Mode Selector, Location, and Saved Threads */}
        <div className="lg:col-span-1 space-y-4">
          {/* Mode Selector */}
          <div className="p-4 rounded-lg bg-white border border-[#E5E7EB] shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#6B7280] tracking-wide uppercase">
              Mode
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                {
                  id: "general",
                  label: "Weather Q&A",
                  desc: "Current conditions & outlook",
                },
                {
                  id: "planning",
                  label: "Trip Planner",
                  desc: "Itinerary, timing & clothing",
                },
                {
                  id: "comparison",
                  label: "City Compare",
                  desc: "Side-by-side weather comparisons",
                },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setMode(m.id as "general" | "planning" | "comparison")
                  }
                  className={`flex flex-col text-left px-3 py-2 rounded-md border text-xs transition-all ${
                    mode === m.id
                      ? "bg-[#FFF9E6] border-[#FFC928] text-[#222222] font-semibold"
                      : "bg-[#F7F7F7] border-[#E5E7EB] text-[#6B7280] hover:text-[#222222] hover:bg-[#E5E7EB]"
                  }`}
                >
                  <span className="font-semibold text-[#222222]">{m.label}</span>
                  <span className="text-xs text-[#6B7280]">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location Grounding Setup */}
          <div className="p-4 rounded-lg bg-white border border-[#E5E7EB] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#6B7280] tracking-wide uppercase">
                Location
              </h3>
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>

            <LocationSearch
              onSelectLocation={handleSelectLocation}
              placeholder={`Change ${selectedLocation.name}...`}
            />

            {mode === "comparison" && (
              <div className="pt-2 border-t border-[#E5E7EB] space-y-2">
                <h4 className="text-xs font-medium text-[#6B7280]">
                  Comparison City
                </h4>
                <LocationSearch
                  onSelectLocation={(loc: GeocodingLocation) =>
                    setComparisonLocation(loc)
                  }
                  placeholder={`Change ${comparisonLocation.name}...`}
                />
              </div>
            )}

            {mode === "planning" && (
              <div className="pt-2 border-t border-[#E5E7EB] space-y-2.5 text-xs">
                <div>
                  <label className="text-xs font-medium text-[#6B7280] block mb-1">
                    Activity Focus
                  </label>
                  <select
                    value={tripActivity}
                    onChange={(e) => setTripActivity(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-white border border-[#E5E7EB] text-[#222222] text-xs focus:outline-none focus:border-[#FFC928]"
                  >
                    <option value="Sightseeing & Walking">
                      Sightseeing & Walking
                    </option>
                    <option value="Hiking & Outdoor Trail">
                      Hiking & Outdoor Trails
                    </option>
                    <option value="Beach & Watersports">
                      Beach & Watersports
                    </option>
                    <option value="Skiing & Winter Sports">
                      Skiing & Winter Sports
                    </option>
                    <option value="Flight & Long Road Travel">
                      Road & Flight Travel
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B7280] block mb-1">
                    Duration
                  </label>
                  <select
                    value={tripDays}
                    onChange={(e) => setTripDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-white border border-[#E5E7EB] text-[#222222] text-xs focus:outline-none focus:border-[#FFC928]"
                  >
                    <option value="1 Day">1 Day</option>
                    <option value="3 Days">3 Days (Weekend)</option>
                    <option value="7 Days">7 Days (Full week)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Saved Conversations Sidebar */}
          <div className="p-4 rounded-lg bg-white border border-[#E5E7EB] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#6B7280] tracking-wide uppercase">
                Saved Sessions
              </h3>
              <button
                type="button"
                onClick={handleStartNewChat}
                className="text-xs text-[#222222] font-semibold hover:underline"
              >
                + New Chat
              </button>
            </div>

            {user ? (
              conversations.length === 0 ? (
                <p className="text-xs text-[#6B7280] italic py-2">
                  No saved conversations yet.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => loadConversationHistory(c.id)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-md border text-xs cursor-pointer transition-all ${
                        activeConversationId === c.id
                          ? "bg-[#FFF9E6] border-[#FFC928] text-[#222222] font-semibold"
                          : "bg-[#F7F7F7] border-[#E5E7EB] text-[#6B7280] hover:text-[#222222] hover:bg-[#E5E7EB]"
                      }`}
                    >
                      <div className="truncate flex-1 pr-2">
                        <p className="truncate font-medium">{c.title}</p>
                        <p className="text-xs text-[#6B7280]">
                          {c.locationName ?? "Global"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(c.id, e)}
                        title="Delete thread"
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#6B7280] hover:text-[#D94841] transition-opacity"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="p-3 rounded-md bg-[#F7F7F7] border border-[#E5E7EB] text-xs text-[#6B7280]">
                <Link
                  href="/login"
                  className="text-[#222222] font-semibold hover:underline"
                >
                  Sign in
                </Link>{" "}
                to save conversations and itineraries.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat History and Interaction Area */}
        <div className="lg:col-span-3 flex flex-col h-[700px] rounded-lg bg-white border border-[#E5E7EB] overflow-hidden shadow-xs">
          {/* Canvas Header */}
          <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F7F7F7] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded bg-[#FFF9E6] text-[#222222] border border-[#FFC928]">
                <svg
                  className="w-4 h-4 text-[#FFC928]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#222222] flex items-center gap-2">
                  {mode === "planning"
                    ? `Trip Planning: ${selectedLocation.name}`
                    : mode === "comparison"
                      ? `Comparing ${selectedLocation.name} vs. ${comparisonLocation.name}`
                      : `Weather Assistant: ${selectedLocation.name}`}
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Grounded in live Open-Meteo forecasts
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartNewChat}
              className="text-xs px-2.5 py-1 rounded-md border border-[#E5E7EB] bg-white hover:bg-[#F7F7F7] text-[#6B7280] hover:text-[#222222] transition-colors"
            >
              Reset Chat
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#FFF9E6] border border-[#FFC928] flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-[#FFC928]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#222222]">
                    {mode === "planning"
                      ? "Plan your trip with weather foresight"
                      : mode === "comparison"
                        ? "Compare climate and rain risk side-by-side"
                        : `Ask about weather in ${selectedLocation.name}`}
                  </h3>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Get quick answers on rain timing, wind conditions, and packing recommendations.
                  </p>
                </div>

                {/* Preset Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-1">
                  {(mode === "planning"
                    ? [
                        "Best day for outdoor sightseeing?",
                        "What clothing & layers to pack?",
                        "Will temperatures drop at night?",
                        "Is rain expected during my trip?",
                      ]
                    : mode === "comparison"
                      ? [
                          "Which city has milder weekend weather?",
                          "Compare rain probabilities this week",
                          "Which city is better for walking outdoors?",
                          "How do temperatures compare?",
                        ]
                    : [
                        "Will it rain in the next 12 hours?",
                        "What is the temperature trend today?",
                        "How humid will it be this afternoon?",
                        "Summary of the 7-day outlook",
                      ]
                  ).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="p-2.5 text-left rounded-md bg-white hover:bg-[#F7F7F7] border border-[#E5E7EB] text-xs text-[#222222] hover:border-[#FFC928] shadow-xs transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-md px-4 py-2.5 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#FFC928] text-[#222222] font-semibold shadow-xs"
                        : "bg-[#F7F7F7] text-[#222222] border border-[#E5E7EB] shadow-xs"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <MarkdownMessage content={msg.content} />
                    )}

                    {msg.role === "assistant" && (
                      <div className="mt-2.5 pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
                        <div className="flex items-center gap-2">
                          {msg.grounded && (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Open-Meteo verified
                            </span>
                          )}
                        </div>
                        <VoicePlayerButton text={msg.content} />
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-[#9CA3AF] mt-0.5 px-1 tabular-nums">
                    {msg.time}
                  </span>
                </div>
              ))
            )}

            {isPending && (
              <div className="flex items-start gap-2">
                <div className="bg-[#F7F7F7] border border-[#E5E7EB] rounded-md px-4 py-2.5 text-xs text-[#6B7280] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFC928] animate-pulse" />
                  <span>Checking weather forecast...</span>
                </div>
              </div>
            )}
          </div>

          {/* Query Bar */}
          <div className="p-3 border-t border-[#E5E7EB] bg-[#F7F7F7]">
            {errorState && (
              <div className="mb-2.5 p-2.5 rounded-md bg-[#FFF5F5] border border-[#FED7D7] flex items-center justify-between gap-3 text-xs text-[#D94841]">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 shrink-0 text-[#D94841]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>{errorState.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const q = errorState.query;
                    setErrorState(null);
                    setMessages((prev) => prev.slice(0, -1));
                    handleSendMessage(q);
                  }}
                  className="px-2.5 py-1 rounded bg-[#D94841] text-white font-semibold text-xs hover:bg-[#C62828] transition-colors shrink-0 shadow-xs"
                >
                  Retry
                </button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <VoiceInputButton
                onTranscript={(text) => handleSendMessage(text)}
                disabled={isPending}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  mode === "planning"
                    ? `Ask about travel timing or clothing for ${selectedLocation.name}...`
                    : mode === "comparison"
                      ? `Ask about differences between ${selectedLocation.name} & ${comparisonLocation.name}...`
                      : `Ask about temperature, rain, or wind in ${selectedLocation.name}...`
                }
                disabled={isPending}
                className="flex-1 px-3.5 py-2.5 rounded-md bg-white border border-[#E5E7EB] text-[#222222] text-xs placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FFC928] focus:ring-1 focus:ring-[#FFC928] transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isPending}
                className="px-4 py-2.5 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] font-bold text-xs shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <span>Ask</span>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
