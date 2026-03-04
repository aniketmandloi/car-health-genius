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
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <MobileNav />
          <Link
            href={"/" as never}
            className="group flex items-center gap-2.5 text-lg font-semibold tracking-tight"
          >
            <Image
              src="/icon.png"
              alt="Car Health Genius logo"
              width={44}
              height={44}
              className="h-10 w-10 rounded-lg object-cover shadow-[0_10px_26px_-18px_rgba(7,41,88,0.4)]"
              priority
            />
            <span className="hidden sm:inline">Car Health</span>
            <span className="hidden text-primary sm:inline">Genius</span>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 rounded-full border border-border/80 bg-card/90 p-1 shadow-[0_8px_18px_-16px_rgba(7,41,88,0.3)] md:flex">
          {navLinks.map(({ href, label }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href as never}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_10px_22px_-16px_rgba(0,82,255,0.8)]"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: ModeToggle + UserMenu */}
        <div className="flex items-center gap-2.5">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
