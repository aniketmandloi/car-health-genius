import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import ResultsDetail from "./results-detail";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ diagnosticEventId: string }>;
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

  const { diagnosticEventId } = await params;
  const eventId = Number.parseInt(diagnosticEventId, 10);

  if (!Number.isFinite(eventId) || eventId <= 0) {
    redirect("/dashboard");
  }

  return <ResultsDetail diagnosticEventId={eventId} />;
}
