import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import LeadsClient from "./leads-client";

export default async function PartnerLeadsPage() {
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
    <div className="container mx-auto max-w-5xl space-y-6 p-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Partner Lead Queue</h1>
        <p className="text-sm text-muted-foreground">
          Review incoming requests, respond quickly, and propose alternate windows when needed.
        </p>
      </div>
      <LeadsClient />
    </div>
  );
}
