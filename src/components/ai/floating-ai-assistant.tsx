"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { VoiceInputButton, VoicePlayerButton } from "./voice-controls";
import { MarkdownMessage } from "./markdown-message";
import { useCurrentLocation } from "@/lib/location/location-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  grounded?: boolean;
  model?: string;
  time: string;
}

interface FloatingAiAssistantProps {
  currentLocation?: {
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
  };
}

export function FloatingAiAssistant({
  currentLocation,
}: FloatingAiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [errorState, setErrorState] = useState<{
    message: string;
    query: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { activeLocation: globalLocation } = useCurrentLocation();
  const activeLocation = currentLocation ?? globalLocation;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const msgIdRef = useRef(0);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isPending) return;

    setErrorState(null);
    msgIdRef.current += 1;
    const userMessage: Message = {
      id: `usr-${msgIdRef.current}`,
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
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query,
            location: {
              name: activeLocation.name,
              country: activeLocation.country,
              latitude: activeLocation.latitude,
              longitude: activeLocation.longitude,
            },
            mode: "general",
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

        msgIdRef.current += 1;
        const assistantMessage: Message = {
          id: `ast-${msgIdRef.current}`,
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
      } catch {
        setErrorState({
          message:
            "Network error contacting ATMOS AI service. Please verify your connection.",
          query,
        });
      }
    });
  };

  const handleQuickQuestion = (q: string) => {
    handleSend(q);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title="Open Weather Assistant"
          aria-label="Open Weather Assistant"
          className="relative group flex items-center gap-2.5 px-3.5 py-2.5 rounded-md bg-white border border-[#E5E7EB] text-[#222222] shadow-sm hover:border-[#FFC928] transition-all focus:outline-none focus:ring-1 focus:ring-[#FFC928]"
        >
          <div className="flex items-center justify-center w-6 h-6 rounded bg-[#FFF9E6] text-[#222222] border border-[#FFC928]">
            <svg
              className="w-3.5 h-3.5 text-[#FFC928]"
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

          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-[#222222]">
              Weather AI
            </span>
            <span className="text-xs text-[#6B7280] truncate max-w-[130px]">
              {activeLocation.name}
            </span>
          </div>
        </button>
      </div>

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="ATMOS AI Weather Assistant"
          className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] max-h-[600px] flex flex-col rounded-lg bg-white border border-[#E5E7EB] shadow-md overflow-hidden animate-in fade-in"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] bg-[#F7F7F7]">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-[#FFF9E6] text-[#222222] border border-[#FFC928]">
                <svg
                  className="w-3.5 h-3.5 text-[#FFC928]"
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
                <h3 className="text-xs font-bold text-[#222222]">
                  Weather Assistant
                </h3>
                <p className="text-xs text-[#6B7280]">
                  {activeLocation.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/ai"
                title="Open full AI Workspace"
                className="p-1.5 rounded-md text-[#6B7280] hover:text-[#222222] hover:bg-[#E5E7EB] transition-colors text-xs"
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
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="p-1.5 rounded-md text-[#6B7280] hover:text-[#222222] hover:bg-[#E5E7EB] transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[380px] text-xs">
            {messages.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <div className="inline-flex p-2.5 rounded-full bg-[#FFF9E6] border border-[#FFC928]">
                  <svg
                    className="w-5 h-5 text-[#FFC928]"
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
                <h4 className="text-xs font-bold text-[#222222]">
                  Ask about {activeLocation.name}
                </h4>
                <p className="text-xs text-[#6B7280] max-w-[260px] mx-auto">
                  Get quick answers about today&apos;s weather, rain timing, and wind.
                </p>

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                  {[
                    "Will it rain today?",
                    "What should I wear?",
                    "When does the wind peak?",
                    "Weekend forecast",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleQuickQuestion(prompt)}
                      className="px-2.5 py-1 text-xs rounded-md bg-[#F7F7F7] hover:bg-[#E5E7EB] border border-[#E5E7EB] text-[#222222] transition-colors"
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
                    className={`max-w-[85%] rounded-md px-3.5 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#FFC928] text-[#222222] font-semibold"
                        : "bg-[#F7F7F7] text-[#222222] border border-[#E5E7EB]"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <MarkdownMessage content={msg.content} />
                    )}
                    {msg.role === "assistant" && (
                      <div className="mt-1.5 pt-1.5 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
                        <span className="text-emerald-600 font-medium">Verified</span>
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
                <div className="bg-[#F7F7F7] border border-[#E5E7EB] rounded-md px-3 py-2 text-xs text-[#6B7280] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFC928] animate-pulse" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Query Bar */}
          <div className="p-3 border-t border-[#E5E7EB] bg-[#F7F7F7]">
            {errorState && (
              <div className="mb-2 p-2 rounded-md bg-[#FFF5F5] border border-[#FED7D7] flex items-center justify-between gap-2 text-xs text-[#D94841]">
                <span className="truncate">{errorState.message}</span>
                <button
                  type="button"
                  onClick={() => {
                    const q = errorState.query;
                    setErrorState(null);
                    setMessages((prev) => prev.slice(0, -1));
                    handleSend(q);
                  }}
                  className="px-2 py-0.5 rounded bg-[#D94841] text-white font-semibold text-xs hover:bg-[#C62828] transition-colors shrink-0"
                >
                  Retry
                </button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <VoiceInputButton
                onTranscript={(text) => handleSend(text)}
                disabled={isPending}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask about ${activeLocation.name}...`}
                disabled={isPending}
                className="flex-1 px-3 py-2 rounded-md bg-white border border-[#E5E7EB] text-[#222222] text-xs placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#FFC928] focus:ring-1 focus:ring-[#FFC928] transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isPending}
                className="px-3.5 py-2 rounded-md bg-[#FFC928] hover:bg-[#F2B900] text-[#222222] font-bold text-xs shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
