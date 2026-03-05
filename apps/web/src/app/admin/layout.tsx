import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/knowledge", label: "DTC Knowledge" },
  { href: "/admin/review-queue", label: "Review Queue" },
  { href: "/admin/safety", label: "Safety Switches" },
  { href: "/admin/adapters", label: "Adapters" },
  { href: "/admin/webhooks", label: "Webhooks" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/80 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto rounded-full border border-border/80 bg-card p-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href as never}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
