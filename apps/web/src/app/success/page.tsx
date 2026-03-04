"use client";

import { motion } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="text-center p-8 shadow-[0_18px_40px_-26px_rgba(7,41,88,0.35)]">
          <CardContent className="space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              {cancelled ? (
                <XCircle className="mx-auto size-16 text-muted-foreground" />
              ) : (
                <CheckCircle className="mx-auto size-16 text-emerald-500" />
              )}
            </motion.div>

            <h1 className="text-2xl font-bold">
              {cancelled ? "Checkout Cancelled" : "Subscription Updated!"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {cancelled
                ? "Checkout was cancelled. Your subscription was not changed."
                : "Your checkout completed. Entitlements usually update within seconds after webhook reconciliation."}
            </p>
            {checkoutId && (
              <p className="text-xs text-muted-foreground font-mono">
                Checkout ID: {checkoutId}
              </p>
            )}
            <p className="text-sm font-medium text-primary">
              {plan === "annual" ? "Annual Pro" : "Monthly Pro"}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Link href={"/dashboard" as never}>
                <Button>Go to Dashboard</Button>
              </Link>
              <Link href={"/pricing" as never}>
                <Button variant="outline">View Plans</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100svh-4rem)] items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
