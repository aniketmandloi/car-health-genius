"use client";

import { useMutation } from "@tanstack/react-query";
import { Bebas_Neue, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

const displayFont = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type Plan = "monthly" | "annual";

export default function PricingPage() {
  const { data: session } = authClient.useSession();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const trackPaywallView = useMutation(
    trpc.billing.trackPaywallView.mutationOptions({
      onError: () => {
        // Non-blocking analytics path.
      },
    }),
  );

  const createCheckoutSession = useMutation(trpc.billing.createCheckoutSession.mutationOptions());

  useEffect(() => {
    if (!session?.user || trackPaywallView.isSuccess || trackPaywallView.isPending) {
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
      const successUrl = `${window.location.origin}/success?plan=${plan}`;
      const checkoutIntent = await createCheckoutSession.mutateAsync({
        plan,
        successUrl,
      });

      await authClient.checkout({
        slug: checkoutIntent.checkoutSlug,
        successUrl: checkoutIntent.successUrl,
      });
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Unable to start checkout");
    }
  }

  return (
    <main className={`${bodyFont.className} min-h-screen overflow-hidden bg-[#0d1b1e] text-[#f6efe4]`}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(238,186,78,0.22),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(72,176,153,0.26),transparent_32%),radial-gradient(circle_at_50%_95%,rgba(246,114,72,0.16),transparent_40%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(125deg,rgba(4,12,14,0.15)_0%,rgba(4,12,14,0.65)_70%,rgba(4,12,14,0.95)_100%)]" />

      <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-20">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.5em] text-[#eece88]">Car Health Genius Pro</p>
            <h1 className={`${displayFont.className} text-6xl leading-[0.9] tracking-[0.04em] sm:text-7xl`}>
              Stop Guessing.
              <br />
              Start Diagnosing.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-[#d9d6cb] sm:text-base">
              Unlock ranked likely-causes, deeper sensor context, and maintenance intelligence with Pro. Safety guidance
              remains free for every driver.
            </p>
          </div>
          <div className="rounded-2xl border border-[#f6efe440] bg-[#0a1416]/60 px-4 py-3 text-xs uppercase tracking-[0.2em] text-[#f4d78f]">
            US Launch Pricing
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <article className="group relative overflow-hidden rounded-3xl border border-[#f0dfbf3d] bg-[#102528]/80 p-7 shadow-[0_24px_80px_-45px_rgba(236,190,84,0.75)] transition-transform duration-300 hover:-translate-y-1">
            <div className="absolute right-5 top-5 rounded-full border border-[#f6efe455] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#f5dfa8]">
              Monthly
            </div>
            <h2 className={`${displayFont.className} text-5xl leading-none tracking-[0.05em] text-[#ffe9bf]`}>$9.99</h2>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#d4c6a3]">Per Month</p>
            <ul className="mt-6 space-y-3 text-sm text-[#e5e0d4]">
              <li>Likely-causes ranking with confidence</li>
              <li>Advanced scan context and richer diagnostics</li>
              <li>Priority support routing</li>
            </ul>
            <Button
              className="mt-8 h-11 w-full bg-[#e8bb58] text-[#1e1502] hover:bg-[#f0c869]"
              onClick={() => startCheckout("monthly")}
              disabled={createCheckoutSession.isPending}
            >
              Choose Monthly
            </Button>
          </article>

          <article className="group relative overflow-hidden rounded-3xl border border-[#7ad2bb55] bg-[#11292d]/90 p-7 shadow-[0_24px_80px_-45px_rgba(81,196,168,0.75)] transition-transform duration-300 hover:-translate-y-1">
            <div className="absolute right-5 top-5 rounded-full border border-[#7ad2bb70] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#98f1d5]">
              Best Value
            </div>
            <h2 className={`${displayFont.className} text-5xl leading-none tracking-[0.05em] text-[#baf3e2]`}>$79</h2>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#9ad7c6]">Per Year</p>
            <ul className="mt-6 space-y-3 text-sm text-[#dcf3ea]">
              <li>Everything in monthly Pro</li>
              <li>Lower annual effective cost</li>
              <li>First access to premium diagnostics</li>
            </ul>
            <Button
              className="mt-8 h-11 w-full bg-[#4cb89c] text-[#071610] hover:bg-[#60cfb2]"
              onClick={() => startCheckout("annual")}
              disabled={createCheckoutSession.isPending}
            >
              Choose Annual
            </Button>
          </article>
        </div>

        <div className="mt-8 rounded-2xl border border-[#f6efe430] bg-[#0a1517]/80 p-4 text-sm text-[#ddd6c7]">
          <p>
            Free tier keeps DTC read/clear, plain-English explanation, severity, and basic next steps. Pro adds deeper
            decisioning and predictive value.
          </p>
          {!session?.user ? (
            <p className="mt-2">
              Sign in first to upgrade. <Link href="/login" className="underline">Go to login</Link>
            </p>
          ) : null}
          {checkoutError ? <p className="mt-2 text-[#ffb297]">{checkoutError}</p> : null}
        </div>
      </section>
    </main>
  );
}
