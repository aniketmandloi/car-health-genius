"use client";

import { motion } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Crown, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";
import { staggerContainer, fadeUp } from "@/lib/animation-variants";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

type Plan = "monthly" | "annual";

const FREE_FEATURES = [
  "DTC code read & clear",
  "Plain-English explanation",
  "Severity assessment",
  "Basic next steps",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Likely-causes ranking with confidence",
  "Advanced sensor context",
  "DIY step-by-step guides",
  "Repair cost estimates",
  "Negotiation scripts",
  "Health score & predictions",
  "Priority support routing",
];

export default function PricingPage() {
  const { data: session } = authClient.useSession();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const trackPaywallView = useMutation(
    trpc.billing.trackPaywallView.mutationOptions({
      onError: () => {},
    }),
  );

  const createCheckoutSession = useMutation(
    trpc.billing.createCheckoutSession.mutationOptions(),
  );

  useEffect(() => {
    if (
      !session?.user ||
      trackPaywallView.isSuccess ||
      trackPaywallView.isPending
    ) {
      return;
    }

    trackPaywallView.mutate({
      channel: "web",
      source: "pricing_page",
    });
  }, [session?.user, trackPaywallView]);

  async function startCheckout(plan: Plan) {
    if (!session?.user) {
      window.location.href = "/login";
      return;
    }

    setCheckoutError(null);

    try {
      const successUrl = `${window.location.origin}/success?plan=${plan}&checkout_id={CHECKOUT_ID}`;
      const checkoutIntent = await createCheckoutSession.mutateAsync({
        plan,
        successUrl,
      });

      if (!checkoutIntent.checkoutUrl) {
        throw new Error("No checkout URL returned. Please try again or contact support.");
      }
      window.location.href = checkoutIntent.checkoutUrl;
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Unable to start checkout",
      );
    }
  }

  return (
    <PageTransition>
      <div className="container mx-auto max-w-5xl px-4 py-16 md:py-24">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-12"
        >
          {/* Header */}
          <motion.div variants={fadeUp} className="text-center space-y-3">
            <Badge variant="pro" className="gap-1">
              <Sparkles className="size-3" />
              Pro Plans
            </Badge>
            <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">
              Stop Guessing.{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Start Diagnosing.
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Unlock ranked likely-causes, deeper sensor context, and
              maintenance intelligence with Pro. Safety guidance remains free
              for every driver.
            </p>
          </motion.div>

          {/* Plans Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Free Plan */}
            <motion.div variants={fadeUp}>
              <div className="h-full rounded-2xl border border-border/50 bg-card p-6 dark:bg-white/[0.04] dark:border-white/[0.08]">
                <h3 className="text-lg font-semibold">Free</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-muted-foreground"> / forever</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Essential diagnostics for every car owner.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {FREE_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="mt-8 w-full" disabled>
                  Current Plan
                </Button>
              </div>
            </motion.div>

            {/* Monthly Pro */}
            <motion.div variants={fadeUp}>
              <div className="h-full rounded-2xl border border-primary/30 bg-card p-6 dark:bg-white/[0.06] dark:border-primary/20 shadow-[0_0_24px_rgba(6,182,212,0.12)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Monthly Pro</h3>
                  <Badge variant="default">Monthly</Badge>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">$9.99</span>
                  <span className="text-muted-foreground"> / month</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Full diagnostic intelligence. Cancel anytime.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {PRO_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  onClick={() => startCheckout("monthly")}
                  disabled={createCheckoutSession.isPending}
                >
                  <Crown className="size-4" />
                  Choose Monthly
                </Button>
              </div>
            </motion.div>

            {/* Annual Pro */}
            <motion.div variants={fadeUp}>
              <div className="relative h-full rounded-2xl border border-secondary/30 bg-card p-6 dark:bg-white/[0.06] dark:border-secondary/20 shadow-[0_0_24px_rgba(139,92,246,0.12)]">
                <div className="absolute -top-3 right-4">
                  <Badge variant="secondary" className="shadow-sm">
                    Best Value
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Annual Pro</h3>
                  <Badge variant="secondary">Annual</Badge>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">$79</span>
                  <span className="text-muted-foreground"> / year</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Save 34% vs monthly. Priority access to new features.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {PRO_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-secondary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={() => startCheckout("annual")}
                  disabled={createCheckoutSession.isPending}
                >
                  <Crown className="size-4" />
                  Choose Annual
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Footer Note */}
          <motion.div variants={fadeUp}>
            <div className="rounded-2xl border border-border/50 bg-card p-5 text-sm text-muted-foreground dark:bg-white/[0.03]">
              <p>
                Free tier keeps DTC read/clear, plain-English explanation, severity,
                and basic next steps. Pro adds deeper decisioning and predictive
                value.
              </p>
              {!session?.user && (
                <p className="mt-2">
                  Sign in first to upgrade.{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Go to login
                  </Link>
                </p>
              )}
              {checkoutError && (
                <p className="mt-2 text-destructive">{checkoutError}</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
