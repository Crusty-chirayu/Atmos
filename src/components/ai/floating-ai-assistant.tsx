"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { VoiceInputButton, VoicePlayerButton } from "./voice-controls";

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
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeLocation = currentLocation ?? {
    name: "London",
    country: "United Kingdom",
    latitude: 51.5074,
    longitude: -0.1278,
  };

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

        const data = await res.json();
        msgIdRef.current += 1;
        const assistantMessage: Message = {
          id: `ast-${msgIdRef.current}`,
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
      } catch {
        msgIdRef.current += 1;
        setMessages((prev) => [
          ...prev,
          {
            id: `ast-err-${msgIdRef.current}`,
            role: "assistant",
            content:
              "Network error contacting ATMOS AI service. Please verify your connection.",
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
          title="Open ATMOS AI Weather Assistant"
          aria-label="Open ATMOS AI Weather Assistant"
          className="relative group flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-surface-elevated/90 backdrop-blur-xl border border-accent-primary/40 text-foreground shadow-2xl hover:border-accent-primary transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-accent-primary/20 text-accent-primary border border-accent-primary/30 group-hover:bg-accent-primary/30 transition-colors">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
              />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-primary" />
            </span>
          </div>

          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold tracking-wide flex items-center gap-1.5 text-foreground">
              ATMOS AI
              <span className="px-1.5 py-0.2 text-[10px] uppercase font-bold tracking-wider rounded-full bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
                Gemini
              </span>
            </span>
            <span className="text-[11px] text-foreground-muted font-mono truncate max-w-[130px]">
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
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[640px] flex flex-col rounded-3xl bg-surface/95 backdrop-blur-2xl border border-surface-border/80 shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border/40 bg-surface-elevated/40">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
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
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  ATMOS Intelligence
                </h3>
                <p className="text-[11px] text-foreground-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Grounded in {activeLocation.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                href="/ai"
                title="Open full AI Workspace"
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-elevated/80 transition-colors text-xs flex items-center gap-1"
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
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-elevated/80 transition-colors"
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
          <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[420px] text-sm scrollbar-thin scrollbar-thumb-surface-border">
            {messages.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <div className="inline-flex p-3 rounded-2xl bg-surface-elevated/50 text-accent-primary border border-surface-border/60">
                  <svg
                    className="w-6 h-6"
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
                <h4 className="text-sm font-medium text-foreground">
                  Ask ATMOS about {activeLocation.name}
                </h4>
                <p className="text-xs text-foreground-muted max-w-[280px] mx-auto">
                  Answers are grounded strictly in verified Open-Meteo telemetry
                  and forecast models.
                </p>

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-2 justify-center pt-2">
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
                      className="px-3 py-1.5 text-xs rounded-xl bg-surface-elevated/40 hover:bg-surface-elevated border border-surface-border/50 text-foreground-muted hover:text-foreground transition-all hover:scale-102"
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
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent-primary text-slate-950 font-medium rounded-tr-sm"
                        : "bg-surface-elevated/80 text-foreground border border-surface-border/50 rounded-tl-sm"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {msg.role === "assistant" && (
                      <div className="mt-2.5 pt-2 border-t border-surface-border/40 flex items-center justify-between text-[10px] text-foreground-muted">
                        <span className="flex items-center gap-1 font-mono">
                          {msg.grounded && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          )}
                          {msg.grounded ? "Verified Telemetry" : "Ungrounded"}
                        </span>
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
                <div className="bg-surface-elevated/80 border border-surface-border/50 rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-foreground-muted flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse delay-100" />
                  <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse delay-200" />
                  <span>Synthesizing weather intelligence...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-surface-border/40 bg-surface-elevated/40">
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
                placeholder={`Ask about ${activeLocation.name} weather...`}
                disabled={isPending}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-surface/70 border border-surface-border/50 text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:border-accent-primary transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isPending}
                title="Send query"
                aria-label="Send query"
                className="p-2 rounded-xl bg-accent-primary text-slate-950 font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-4 h-4"
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
      )}
    </>
  );
}
