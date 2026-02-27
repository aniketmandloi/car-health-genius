"use client";

import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

function readPlan(value: string | null): "monthly" | "annual" {
  return value === "annual" ? "annual" : "monthly";
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();
  const checkoutId = searchParams.get("checkout_id");
  const plan = readPlan(searchParams.get("plan"));
  const status = searchParams.get("status");
  const cancelled = status === "cancelled";

  const trackUpgradeSuccess = useMutation(
    trpc.billing.trackUpgradeSuccess.mutationOptions({
      onError: () => {
        // Non-blocking analytics path.
      },
    }),
  );

  useEffect(() => {
    if (!session?.user || trackUpgradeSuccess.isSuccess || trackUpgradeSuccess.isPending) {
      return;
    }

    trackUpgradeSuccess.mutate({
      channel: "web",
      source: "checkout_success_page",
      plan,
      eventKey: checkoutId ? `upgrade-success:${checkoutId}` : undefined,
    });
  }, [session?.user, trackUpgradeSuccess, plan, checkoutId]);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Subscription updated</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {cancelled
          ? "Checkout was cancelled. Your subscription was not changed."
          : "Your checkout completed. Entitlements usually update within seconds after webhook reconciliation."}
      </p>
      {checkoutId ? <p className="mt-3 text-xs text-muted-foreground">Checkout ID: {checkoutId}</p> : null}
      <p className="mt-4 text-sm">Selected plan: {plan === "annual" ? "Annual Pro" : "Monthly Pro"}</p>
      <div className="mt-6 flex gap-3">
        <a href="/dashboard" className="underline">
          Go to dashboard
        </a>
        <a href="/pricing" className="underline">
          View plans
        </a>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-10 text-sm text-muted-foreground">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
