"use client";
import Link from "next/link";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links: Array<{ to: string; label: string }> = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/pricing", label: "Pricing" },
    { to: "/vehicles", label: "Vehicles" },
    { to: "/scan", label: "Scan" },
    { to: "/todos", label: "Todos" },
  ];

  return (
    <header className="border-b">
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto text-sm whitespace-nowrap sm:gap-3 sm:text-base">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} href={to as never} className="shrink-0">
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
