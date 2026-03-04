import { auth } from "@car-health-genius/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DiyGuideClient } from "./diy-guide-client";

export default async function DiyGuidePage({
  params,
}: {
  params: Promise<{ diagnosticEventId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in" as never);

  const { diagnosticEventId } = await params;
  const id = parseInt(diagnosticEventId, 10);

  if (isNaN(id) || id <= 0) redirect("/dashboard");

  return (
    <div className="pb-8">
      <DiyGuideClient diagnosticEventId={id} />
    </div>
  );
}
