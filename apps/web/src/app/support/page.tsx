import { auth } from "@car-health-genius/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SupportClient } from "./support-client";

export default async function SupportPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in" as never);

  return <SupportClient />;
}
