"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { MobileNav } from "./mobile-nav";
import UserMenu from "./user-menu";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/scan", label: "Scan" },
  { href: "/diagnostics", label: "Diagnostics" },
  { href: "/pricing", label: "Pricing" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-2xl dark:border-white/10">
      <div className="mx-auto flex h-[3.75rem] max-w-6xl items-center justify-between px-4 md:px-6">
        {/* Left: Brand + Mobile hamburger */}
        <div className="flex items-center gap-3">
          <MobileNav />
          <Link
            href={"/" as never}
            className="group flex items-center gap-2 text-lg font-extrabold tracking-tight"
          >
            <Image
              src="/logo.png"
              alt="Car Health Genius logo"
              width={38}
              height={38}
              className="h-9 w-9 rounded-xl object-cover shadow-[0_10px_28px_-18px_rgba(6,182,212,0.75)]"
              priority
            />
            <span className="text-foreground">Car</span>
            <span className="bg-gradient-to-r from-primary to-cyan-300 bg-clip-text text-transparent transition-all duration-200 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.28)]">
              Health
            </span>
            <span className="text-foreground">Genius</span>
          </Link>
        </div>

        {/* Center: Nav links (desktop) */}
        <nav className="hidden items-center gap-1 rounded-full border border-border/60 bg-card/50 p-1 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03] md:flex">
          {navLinks.map(({ href, label }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href as never}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/12 text-primary shadow-[0_0_0_1px_rgba(6,182,212,0.18)]"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/[0.06]",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: ModeToggle + UserMenu */}
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
