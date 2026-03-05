import type { Metadata } from "next";

import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Car Health Genius",
  description:
    "AI-powered car diagnostics and health monitoring. Decode check engine lights, track vehicle health, and save on repairs.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <Providers>
          <div className="relative min-h-svh overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="mesh-orb absolute -top-56 -left-40 h-[28rem] w-[28rem] rounded-full bg-primary/12 blur-[120px]" />
              <div className="mesh-orb-delay absolute top-[32%] -right-40 h-[24rem] w-[24rem] rounded-full bg-primary/8 blur-[120px]" />
            </div>
            <Header />
            <main className="relative z-10">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
