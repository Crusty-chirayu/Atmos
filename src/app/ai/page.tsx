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
    <main className="min-h-screen relative overflow-hidden bg-background text-foreground">
      {/* Background radial gradient */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.06),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.06),transparent_50%)]" />

      {/* Global Navigation */}
      <HomeNav />

      {/* Interactive AI Workspace */}
      <AiWorkspace />
    </main>
  );
}
