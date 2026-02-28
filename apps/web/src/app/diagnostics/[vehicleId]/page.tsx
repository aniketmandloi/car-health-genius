import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import DiagnosticsList from "./diagnostics-list";

export default async function DiagnosticsPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
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

  const { vehicleId } = await params;
  const vehicleIdNum = Number.parseInt(vehicleId, 10);

  if (!Number.isFinite(vehicleIdNum) || vehicleIdNum <= 0) {
    redirect("/dashboard");
  }

  return <DiagnosticsList vehicleId={vehicleIdNum} />;
}
