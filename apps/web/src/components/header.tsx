"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
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
    <header className="sticky top-0 z-50 w-full bg-background/60 backdrop-blur-xl border-b border-white/10 dark:border-white/10">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Left: Brand + Mobile hamburger */}
        <div className="flex items-center gap-3">
          <MobileNav />
          <Link href={"/" as never} className="flex items-center gap-1 text-lg font-bold tracking-tight">
            <span className="text-foreground">Car</span>
            <span className="text-primary">Health</span>
            <span className="text-foreground">Genius</span>
          </Link>
        </div>

        {/* Center: Nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href as never}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5",
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
