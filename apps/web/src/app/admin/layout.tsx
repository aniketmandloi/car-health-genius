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
    <div className="min-h-screen">
      <header className="border-b bg-background">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Admin
            </span>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href as never}
                className="whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="container mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
