import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth/auth-context";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#04060d" },
    { media: "(prefers-color-scheme: light)", color: "#f0f6ff" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "ATMOS — Global Weather Intelligence",
    template: "%s | ATMOS",
  },
  description:
    "ATMOS is a cinematic, AI-powered global weather platform. Live forecasts, 3D globe, AI insights, and personalized alerts for every location on Earth.",
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://atmos.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ATMOS",
    title: "ATMOS — Global Weather Intelligence",
    description:
      "Cinematic, AI-powered global weather — live forecasts, 3D globe, and personalized alerts.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATMOS — Global Weather Intelligence",
    description:
      "Cinematic, AI-powered global weather — live forecasts, 3D globe, and personalized alerts.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
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
      // data-theme is set client-side by ThemeProvider (M1-T2);
      // default to dark (dark-first design, D-002)
    >
      <head>
        {/*
          Inline script to apply theme before first paint,
          preventing flash of wrong theme (FOUT).
          Reads localStorage "atmos-theme"; falls back to system preference.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var stored = localStorage.getItem('atmos-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (_) {}
})();
            `.trim(),
          }}
        />
      </head>
      <body className="bg-surface-base text-text-primary antialiased min-h-dvh flex flex-col">
        {/* Accessibility: skip to main content */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>

        <AuthProvider>
          <main id="main-content" className="flex-1 flex flex-col">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
