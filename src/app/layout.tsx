import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth/auth-context";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { LocationProvider } from "@/lib/location/location-context";
import { FloatingAiAssistant } from "@/components/ai/floating-ai-assistant";
import { resolveAppUrl } from "@/lib/config/env";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "ATMOS — Clean Consumer Weather Intelligence",
    template: "%s | ATMOS",
  },
  description:
    "ATMOS is a clean, modern consumer weather intelligence platform. Real-time forecasts, interactive globe, radar maps, and AI-powered weather insights.",
  keywords: [
    "weather",
    "forecast",
    "global weather",
    "AI weather",
    "weather intelligence",
    "3D globe",
    "live weather",
  ],
  authors: [{ name: "ATMOS" }],
  creator: "ATMOS",
  metadataBase: resolveAppUrl(process.env.NEXT_PUBLIC_APP_URL, "https://atmos.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ATMOS",
    title: "ATMOS — Clean Consumer Weather Intelligence",
    description:
      "Clean, modern consumer weather platform — live forecasts, 3D globe, and accurate weather updates.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATMOS — Clean Consumer Weather Intelligence",
    description:
      "Clean, modern consumer weather platform — live forecasts, 3D globe, and accurate weather updates.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ATMOS",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="light"
    >
      <head>
        {/* Enforce light theme across document */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    document.documentElement.setAttribute('data-theme', 'light');
  } catch (_) {}
})();
            `.trim(),
          }}
        />
      </head>
      <body className="bg-white text-[#222222] antialiased min-h-dvh flex flex-col font-sans">
        {/* Accessibility: skip to main content */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>

        <AuthProvider>
          <LocationProvider>
            <PwaProvider>
              <main id="main-content" className="flex-1 flex flex-col">
                {children}
              </main>
              <FloatingAiAssistant />
            </PwaProvider>
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
