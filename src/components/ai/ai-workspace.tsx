"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { VoiceInputButton, VoicePlayerButton } from "./voice-controls";
import { LocationSearch } from "../weather/location-search";
import { GeocodingLocation } from "@/lib/geocoding/domain/types";
import { useAuth } from "@/lib/auth/auth-context";

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
  const [mode, setMode] = useState<"general" | "planning" | "comparison">(
    "general"
  );

  // Selected location
  const [selectedLocation, setSelectedLocation] = useState<GeocodingLocation>({
    id: "default-london",
    providerId: "open-meteo:2643743",
    formattedAddress: "London, England, United Kingdom",
    name: "London",
    latitude: 51.5074,
    longitude: -0.1278,
    country: "United Kingdom",
    countryCode: "GB",
    adminArea: "England",
    timezone: "Europe/London",
  });

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

        const data = await res.json();
        msgCounterRef.current += 1;
        const assistantMessage: Message = {
          id: `ast-${msgCounterRef.current}`,
          role: "assistant",
          content: data.reply ?? data.error ?? "No response received.",
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
        msgCounterRef.current += 1;
        setMessages((prev) => [
          ...prev,
          {
            id: `ast-err-${msgCounterRef.current}`,
            role: "assistant",
            content:
              "Network error communicating with ATMOS AI. Please check your connection.",
            grounded: false,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs font-mono mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
            ATMOS AI Workspace · Gemini Intelligence
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Weather Intelligence & Planning
          </h1>
          <p className="mt-1 text-sm text-foreground-muted max-w-2xl">
            Conversational analysis grounded in live Open-Meteo telemetry and
            ECMWF reanalysis physics models.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-border/60 bg-surface-elevated/40 hover:bg-surface-elevated text-xs font-medium text-foreground transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
            Dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-border/60 bg-surface-elevated/40 hover:bg-surface-elevated text-xs font-medium text-foreground transition-all"
          >
            Homepage
          </Link>
        </div>
      </div>

      {/* Main Grid: Sidebar + Chat Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 items-start">
        {/* Left Column: Mode Selector, Location, and Saved Threads */}
        <div className="lg:col-span-1 space-y-5">
          {/* Mode Selector */}
          <div className="p-4 rounded-2xl bg-surface/70 backdrop-blur-xl border border-surface-border/60 space-y-3">
            <h3 className="text-xs font-semibold text-foreground tracking-wide uppercase">
              Intelligence Mode
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                {
                  id: "general",
                  label: "Grounded Q&A",
                  desc: "Real-time conditions & forecasts",
                },
                {
                  id: "planning",
                  label: "Trip Planner",
                  desc: "Itinerary, gear & timing",
                },
                {
                  id: "comparison",
                  label: "City Compare",
                  desc: "Side-by-side weather telemetry",
                },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setMode(m.id as "general" | "planning" | "comparison")
                  }
                  className={`flex flex-col text-left px-3.5 py-2.5 rounded-xl border text-xs transition-all ${
                    mode === m.id
                      ? "bg-accent-primary/15 border-accent-primary/40 text-accent-primary font-medium"
                      : "bg-surface-elevated/30 border-surface-border/40 text-foreground-muted hover:text-foreground hover:bg-surface-elevated/60"
                  }`}
                >
                  <span className="font-semibold">{m.label}</span>
                  <span className="text-[11px] opacity-75">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location Grounding Setup */}
          <div className="p-4 rounded-2xl bg-surface/70 backdrop-blur-xl border border-surface-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground tracking-wide uppercase">
                Active Grounding Target
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>

            <LocationSearch
              onSelectLocation={(loc: GeocodingLocation) =>
                setSelectedLocation(loc)
              }
              placeholder={`Change ${selectedLocation.name}...`}
            />

            {mode === "comparison" && (
              <div className="pt-2 border-t border-surface-border/40 space-y-2">
                <h4 className="text-[11px] font-semibold text-foreground-muted">
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
              <div className="pt-2 border-t border-surface-border/40 space-y-2.5 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-foreground-muted block mb-1">
                    Activity Focus
                  </label>
                  <select
                    value={tripActivity}
                    onChange={(e) => setTripActivity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated/60 border border-surface-border/50 text-foreground text-xs focus:outline-none focus:border-accent-primary"
                  >
                    <option value="Sightseeing & Walking">
                      Sightseeing & Urban Walking
                    </option>
                    <option value="Hiking & Outdoor Trail">
                      Hiking & Mountain Trails
                    </option>
                    <option value="Beach & Watersports">
                      Beach & Water Activities
                    </option>
                    <option value="Skiing & Winter Sports">
                      Skiing & Winter Sports
                    </option>
                    <option value="Flight & Long Road Travel">
                      Flight & Commute Travel
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-foreground-muted block mb-1">
                    Duration Horizon
                  </label>
                  <select
                    value={tripDays}
                    onChange={(e) => setTripDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-elevated/60 border border-surface-border/50 text-foreground text-xs focus:outline-none focus:border-accent-primary"
                  >
                    <option value="1 Day">1 Day (Hourly breakdown)</option>
                    <option value="3 Days">3 Days (Weekend trip)</option>
                    <option value="7 Days">7 Days (Full week)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Saved Conversations Sidebar */}
          <div className="p-4 rounded-2xl bg-surface/70 backdrop-blur-xl border border-surface-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground tracking-wide uppercase">
                Saved Sessions
              </h3>
              <button
                type="button"
                onClick={handleStartNewChat}
                className="text-[11px] text-accent-primary hover:underline font-mono"
              >
                + New Chat
              </button>
            </div>

            {user ? (
              conversations.length === 0 ? (
                <p className="text-xs text-foreground-muted/60 italic py-2">
                  No saved conversations yet. Questions are saved automatically.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => loadConversationHistory(c.id)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        activeConversationId === c.id
                          ? "bg-accent-primary/10 border-accent-primary/40 text-foreground"
                          : "bg-surface-elevated/30 border-surface-border/40 text-foreground-muted hover:text-foreground hover:bg-surface-elevated/60"
                      }`}
                    >
                      <div className="truncate flex-1 pr-2">
                        <p className="truncate font-medium">{c.title}</p>
                        <p className="text-[10px] text-foreground-muted/60 font-mono">
                          {c.locationName ?? "Global"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(c.id, e)}
                        title="Delete thread"
                        className="opacity-0 group-hover:opacity-100 p-1 text-foreground-muted hover:text-rose-400 transition-opacity"
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
              <div className="p-3 rounded-xl bg-surface-elevated/40 border border-surface-border/40 text-xs text-foreground-muted">
                <Link
                  href="/login"
                  className="text-accent-primary font-medium hover:underline"
                >
                  Sign in
                </Link>{" "}
                to save your AI weather conversations and trip itineraries.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat History and Interaction Area */}
        <div className="lg:col-span-3 flex flex-col h-[700px] rounded-3xl bg-surface/80 backdrop-blur-2xl border border-surface-border/70 overflow-hidden shadow-2xl">
          {/* Canvas Header */}
          <div className="px-6 py-4 border-b border-surface-border/40 bg-surface-elevated/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-2xl bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
                <svg
                  className="w-5 h-5"
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
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  {mode === "planning"
                    ? `Trip Planning: ${selectedLocation.name}`
                    : mode === "comparison"
                      ? `Comparing ${selectedLocation.name} vs. ${comparisonLocation.name}`
                      : `Atmospheric Intelligence: ${selectedLocation.name}`}
                </h2>
                <p className="text-[11px] text-foreground-muted">
                  Ground-truth data from Open-Meteo · Model: Gemini 2.0 Flash
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartNewChat}
              className="text-xs px-3 py-1.5 rounded-xl border border-surface-border/50 bg-surface-elevated/50 hover:bg-surface-elevated text-foreground-muted hover:text-foreground transition-all"
            >
              Reset Session
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 text-sm scrollbar-thin scrollbar-thumb-surface-border">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center justify-center">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
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
                  <h3 className="text-base font-semibold text-foreground">
                    {mode === "planning"
                      ? "Plan your trip with verified meteorological foresight"
                      : mode === "comparison"
                        ? "Compare climate, wind, and rain risk side-by-side"
                        : `Ask about current weather or trends in ${selectedLocation.name}`}
                  </h3>
                  <p className="mt-1 text-xs text-foreground-muted">
                    ATMOS AI synthesizes hourly resolution data, barometric
                    trends, and forecast uncertainty into actionable guidance.
                  </p>
                </div>

                {/* Preset Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
                  {(mode === "planning"
                    ? [
                        "What is the best day for outdoor activities?",
                        "What rain protection and layers are needed?",
                        "Will evening temperatures drop significantly?",
                        "Is high wind or adverse weather expected?",
                      ]
                    : mode === "comparison"
                      ? [
                          "Which city has milder weekend weather?",
                          "Compare precipitation probabilities this week",
                          "Which destination is better for outdoor walking?",
                          "How do evening temperatures compare?",
                        ]
                      : [
                          "Will it rain in the next 12 hours?",
                          "Explain the barometric pressure trend",
                          "How does humidity affect comfort today?",
                          "Summary of the 7-day outlook",
                        ]
                  ).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="p-3 text-left rounded-2xl bg-surface-elevated/40 hover:bg-surface-elevated/90 border border-surface-border/50 text-xs text-foreground-muted hover:text-foreground transition-all hover:scale-101"
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
                    className={`max-w-[80%] rounded-2xl px-5 py-4 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent-primary text-slate-950 font-medium rounded-tr-sm"
                        : "bg-surface-elevated/90 text-foreground border border-surface-border/60 rounded-tl-sm shadow-md"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {msg.role === "assistant" && (
                      <div className="mt-3 pt-2.5 border-t border-surface-border/40 flex items-center justify-between text-[11px] text-foreground-muted">
                        <div className="flex items-center gap-2 font-mono">
                          {msg.grounded && (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Grounded in Open-Meteo
                            </span>
                          )}
                        </div>
                        <VoicePlayerButton text={msg.content} />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-foreground-muted/60 mt-1 px-1 font-mono">
                    {msg.time}
                  </span>
                </div>
              ))
            )}

            {isPending && (
              <div className="flex items-start gap-2">
                <div className="bg-surface-elevated/90 border border-surface-border/60 rounded-2xl rounded-tl-sm px-5 py-4 text-xs text-foreground-muted flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse" />
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse delay-100" />
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-primary animate-pulse delay-200" />
                  <span>Synthesizing grounded meteorological insights...</span>
                </div>
              </div>
            )}
          </div>

          {/* Query Bar */}
          <div className="p-4 border-t border-surface-border/40 bg-surface-elevated/40">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-3"
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
                    ? `Ask about travel conditions or timing in ${selectedLocation.name}...`
                    : mode === "comparison"
                      ? `Ask about differences between ${selectedLocation.name} & ${comparisonLocation.name}...`
                      : `Ask about current weather, wind, rain in ${selectedLocation.name}...`
                }
                disabled={isPending}
                className="flex-1 px-4 py-3 rounded-2xl bg-surface/80 border border-surface-border/60 text-foreground text-xs placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent-primary transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isPending}
                className="px-5 py-3 rounded-2xl bg-accent-primary text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <span>Ask AI</span>
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
