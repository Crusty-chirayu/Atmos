import { Metadata } from "next";
import { AiWorkspace } from "@/components/ai/ai-workspace";
import { HomeNav } from "@/components/home/home-nav";

export const metadata: Metadata = {
  title: "AI Weather Intelligence & Planning | ATMOS",
  description:
    "Grounded conversational weather Q&A, travel planning, and climate comparisons powered by Google Gemini and live Open-Meteo telemetry.",
};

export default function AiPage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-white text-[#222222]">
      {/* Global Navigation */}
      <HomeNav />

      {/* Interactive AI Workspace */}
      <AiWorkspace />
    </main>
  );
}
