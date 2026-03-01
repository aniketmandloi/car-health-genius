import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import BillingClient from "./billing-client";

export default async function BillingPage() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Subscription Management</h1>
        <p className="text-sm text-muted-foreground">
          View your current plan, entitlements, and manage billing.
        </p>
      </div>
      <BillingClient />
    </div>
  );
}
