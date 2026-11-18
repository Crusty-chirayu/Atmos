import React from "react";

export const DEVELOPER_INFO = {
  name: "Chirayu",
  email: "chirayujayaswal7@gmail.com",
  portfolio: "https://portfolio-lac-kappa-49.vercel.app/",
  github: "https://github.com/Crusty-chirayu",
  linkedin: "https://www.linkedin.com/in/chirayu-babu-jaysawal/",
} as const;

/**
 * Clean, restrained developer attribution for application footers.
 * Styled plainly within the white & yellow system.
 */
export function DeveloperFooter({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#626B78] ${className}`}
    >
      <span className="font-medium text-[#222222]">
        Built by {DEVELOPER_INFO.name}
      </span>
      <span className="text-[#E5E7EB] hidden sm:inline">|</span>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`mailto:${DEVELOPER_INFO.email}`}
          className="hover:text-[#222222] transition-colors underline-offset-2 hover:underline"
          title={`Email ${DEVELOPER_INFO.name}`}
        >
          Email
        </a>
        <span className="text-[#E5E7EB]">·</span>
        <a
          href={DEVELOPER_INFO.portfolio}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#222222] transition-colors underline-offset-2 hover:underline"
          title="Developer Portfolio"
        >
          Portfolio
        </a>
        <span className="text-[#E5E7EB]">·</span>
        <a
          href={DEVELOPER_INFO.github}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#222222] transition-colors underline-offset-2 hover:underline"
          title="GitHub Profile"
        >
          GitHub
        </a>
        <span className="text-[#E5E7EB]">·</span>
        <a
          href={DEVELOPER_INFO.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#222222] transition-colors underline-offset-2 hover:underline"
          title="LinkedIn Profile"
        >
          LinkedIn
        </a>
      </div>
    </div>
  );
}

/**
 * About & Contact card for settings / account / about pages.
 */
export function DeveloperContactSection() {
  return (
    <section
      aria-labelledby="developer-attribution-heading"
      className="p-5 sm:p-6 rounded-lg bg-white border border-[#E5E7EB] shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2
            id="developer-attribution-heading"
            className="text-xs font-bold uppercase tracking-wider text-[#626B78]"
          >
            About &amp; Developer Credit
          </h2>
          <p className="text-xs text-[#626B78] mt-0.5">
            Architected and engineered by {DEVELOPER_INFO.name}
          </p>
        </div>
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#FFF8E1] text-[#222222] border border-[#FFC928]">
          Creator
        </span>
      </div>

      <p className="text-xs text-[#222222] leading-relaxed">
        ATMOS is a high-precision meteorological intelligence platform featuring
        interactive 3D planetary rendering, real-time Open-Meteo synthesis,
        ECMWF ERA5 reanalysis, and AI-assisted climate foresight.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
        <a
          href={`mailto:${DEVELOPER_INFO.email}`}
          className="p-3 rounded-md bg-[#F7F8FA] hover:bg-[#FFF8E1] border border-[#E5E7EB] hover:border-[#FFC928] transition-all group"
        >
          <span className="text-xs font-semibold text-[#222222] block group-hover:text-[#222222]">
            Email
          </span>
          <span className="text-xs text-[#626B78] truncate block mt-0.5">
            {DEVELOPER_INFO.email}
          </span>
        </a>

        <a
          href={DEVELOPER_INFO.portfolio}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-md bg-[#F7F8FA] hover:bg-[#FFF8E1] border border-[#E5E7EB] hover:border-[#FFC928] transition-all group"
        >
          <span className="text-xs font-semibold text-[#222222] block group-hover:text-[#222222]">
            Portfolio
          </span>
          <span className="text-xs text-[#626B78] truncate block mt-0.5">
            portfolio-lac-kappa-49
          </span>
        </a>

        <a
          href={DEVELOPER_INFO.github}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-md bg-[#F7F8FA] hover:bg-[#FFF8E1] border border-[#E5E7EB] hover:border-[#FFC928] transition-all group"
        >
          <span className="text-xs font-semibold text-[#222222] block group-hover:text-[#222222]">
            GitHub
          </span>
          <span className="text-xs text-[#626B78] truncate block mt-0.5">
            Crusty-chirayu
          </span>
        </a>

        <a
          href={DEVELOPER_INFO.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-md bg-[#F7F8FA] hover:bg-[#FFF8E1] border border-[#E5E7EB] hover:border-[#FFC928] transition-all group"
        >
          <span className="text-xs font-semibold text-[#222222] block group-hover:text-[#222222]">
            LinkedIn
          </span>
          <span className="text-xs text-[#626B78] truncate block mt-0.5">
            chirayu-babu-jaysawal
          </span>
        </a>
      </div>
    </section>
  );
}
