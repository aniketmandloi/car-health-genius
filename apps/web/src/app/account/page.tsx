import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DataManagementSection } from "./data-management-section";

export default async function AccountPage() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and subscription.
        </p>
      </div>

      <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{user.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100">
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            View your current plan, manage billing, and cancel your
            subscription.
          </p>
          <Link
            href={"/account/billing" as never}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Manage Subscription
          </Link>
        </CardContent>
      </Card>

      <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200">
        <CardHeader>
          <CardTitle className="text-base">Navigation</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Dashboard
          </Link>
          <Link
            href={"/support" as never}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Support
          </Link>
        </CardContent>
      </Card>

      {/* Data Management — SEC-005 */}
      <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-300">
        <DataManagementSection />
      </div>
    </div>
  );
}
