import type { Metadata } from "next";

import { Manrope, JetBrains_Mono } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Car Health Genius",
  description:
    "AI-powered car diagnostics and health monitoring. Decode check engine lights, track vehicle health, and save on repairs.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
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
        className={`${manrope.variable} ${jetbrainsMono.variable} antialiased selection:bg-primary/20`}
      >
        <Providers>
          <div className="relative min-h-svh overflow-hidden bg-background dark:bg-gradient-to-br dark:from-[#081323] dark:via-[#0D1B2F] dark:to-[#162032]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="mesh-orb absolute -top-56 -left-36 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-[120px]" />
              <div className="mesh-orb-delay absolute top-[32%] -right-40 h-[24rem] w-[24rem] rounded-full bg-secondary/10 blur-[120px]" />
            </div>
            <Header />
            <main className="relative z-10">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
