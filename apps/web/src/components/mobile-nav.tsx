"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "./ui/sheet";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vehicles", label: "Vehicles" },
  { href: "/scan", label: "Scan" },
  { href: "/diagnostics", label: "Diagnostics" },
  { href: "/pricing", label: "Pricing" },
  { href: "/support", label: "Support" },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 dark:bg-[#0B1120]/95 dark:backdrop-blur-xl dark:border-white/10">
          <SheetHeader className="border-b border-border/50 pb-4">
            <SheetTitle className="text-lg font-bold">
              <span className="text-foreground">Car </span>
              <span className="text-primary">Health </span>
              <span className="text-foreground">Genius</span>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-2 py-4">
            {navLinks.map(({ href, label }) => {
              const isActive =
                pathname === href ||
                (href !== "/" && pathname.startsWith(href));
              return (
                <SheetClose key={href} render={<span />}>
                  <Link
                    href={href as never}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    {label}
                  </Link>
                </SheetClose>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
