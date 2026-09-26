import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { DeveloperContactSection, DeveloperFooter } from "@/components/common/developer-credit";

export const metadata: Metadata = {
  title: "About ATMOS & Developer Credit",
  description:
    "ATMOS is an authoritative meteorological intelligence platform engineered by Chirayu.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-[#222222] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-[#E5E7EB] px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 group focus:outline-none"
            aria-label="ATMOS Homepage"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFC928]" />
            <span className="font-bold text-xl tracking-tight text-[#222222]">
              ATMOS
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#F7F8FA] text-[#626B78] border border-[#E5E7EB]">
              About
            </span>
          </Link>

          <div className="flex items-center gap-3 text-xs font-medium">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-md bg-[#FFF8E1] border border-[#FFC928] text-[#222222] font-semibold hover:bg-[#FFC928] transition-colors"
            >
              Live Dashboard
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md bg-white border border-[#E5E7EB] hover:bg-[#F7F8FA] text-[#222222] transition-colors"
            >
              Globe
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Title Header */}
        <div className="space-y-2 pb-6 border-b border-[#E5E7EB]">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-[#FFF8E1] border border-[#FFC928] text-[#222222] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC928]" />
            Weather Intelligence Platform
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#222222]">
            About ATMOS
          </h1>
          <p className="text-sm text-[#626B78] max-w-2xl leading-relaxed">
            Engineered as a clean, highly reliable meteorological cockpit combining
            interactive 3D planetary rendering, real-time Open-Meteo telemetry,
            ECMWF ERA5 historical reanalysis, and AI-assisted climate foresight.
          </p>
        </div>

        {/* Platform Overview */}
        <section
          aria-labelledby="platform-heading"
          className="p-6 rounded-lg bg-white border border-[#E5E7EB] shadow-xs space-y-4"
        >
          <h2
            id="platform-heading"
            className="text-xs font-bold uppercase tracking-wider text-[#626B78]"
          >
            Engineering Architecture
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs leading-relaxed text-[#626B78]">
            <div className="p-4 rounded-md bg-[#F7F8FA] border border-[#E5E7EB] space-y-1.5">
              <h3 className="font-bold text-[#222222]">3D Photorealistic Planetary Visualization</h3>
              <p>
                Three.js WebGL globe utilizing genuine NASA Blue Marble equirectangular
                satellite imagery, specular ocean reflection maps, dynamic atmospheric shells,
                and astronomical solar terminator lighting.
              </p>
            </div>
            <div className="p-4 rounded-md bg-[#F7F8FA] border border-[#E5E7EB] space-y-1.5">
              <h3 className="font-bold text-[#222222]">Authoritative Meteorological Synthesis</h3>
              <p>
                Grounded in high-resolution Open-Meteo forecast models (ECMWF IFS, GFS, ICON)
                with WMO-standard weather code interpretation, precipitation probabilities,
                and historical ERA5 reanalysis spanning decades.
              </p>
            </div>
            <div className="p-4 rounded-md bg-[#F7F8FA] border border-[#E5E7EB] space-y-1.5">
              <h3 className="font-bold text-[#222222]">OpenRouter AI Intelligence</h3>
              <p>
                Context-grounded natural language weather intelligence powered by OpenRouter,
                ensuring live forecast data is accurately synthesized without hallucinations
                or stale model deprecations.
              </p>
            </div>
            <div className="p-4 rounded-md bg-[#F7F8FA] border border-[#E5E7EB] space-y-1.5">
              <h3 className="font-bold text-[#222222]">Design System</h3>
              <p>
                Light-first, high-contrast palette (#FFFFFF, #F7F8FA, #FFF8E1, #FFC928)
                engineered for consumer clarity, WCAG AA compliance, and zero visual clutter.
              </p>
            </div>
          </div>
        </section>

        {/* Developer Attribution & Contact */}
        <DeveloperContactSection />

        {/* Data Provenance & Legal */}
        <section
          aria-labelledby="provenance-heading"
          className="p-5 sm:p-6 rounded-lg bg-white border border-[#E5E7EB] shadow-xs space-y-3 text-xs text-[#626B78]"
        >
          <h2
            id="provenance-heading"
            className="text-xs font-bold uppercase tracking-wider text-[#626B78]"
          >
            Data Provenance &amp; Licensing
          </h2>
          <p>
            Meteorological forecasts provided by{" "}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#222222] font-semibold underline hover:text-[#3984D6]"
            >
              Open-Meteo
            </a>{" "}
            under Creative Commons Attribution 4.0 International (CC BY 4.0).
            Historical atmospheric data derived from European Centre for Medium-Range Weather Forecasts (ECMWF) ERA5.
            Planetary imagery courtesy of NASA Visible Earth.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#E5E7EB] py-6 px-4 text-center text-xs text-[#626B78] mt-12">
        <DeveloperFooter />
      </footer>
    </div>
  );
}
