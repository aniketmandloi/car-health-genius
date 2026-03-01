"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { queryClient, trpc } from "@/utils/trpc";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";
    case "canceled":
    case "cancelled":
      return "bg-gray-100 text-gray-500";
    case "past_due":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default function BillingClient() {
  const subscription = useQuery(trpc.billing.getSubscription.queryOptions());
  const entitlements = useQuery(trpc.billing.getEntitlements.queryOptions());
  const supportPriority = useQuery(
    trpc.billing.getSupportPriority.queryOptions(),
  );

  const checkoutMutation = useMutation(
    trpc.billing.createCheckoutSession.mutationOptions({
      onSuccess: (data) => {
        window.location.href = data.checkoutUrl;
      },
    }),
  );

  const sub = subscription.data?.subscription;
  const isPro = entitlements.data?.plan === "pro";

  return (
    <div className="space-y-4">
      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscription.isLoading || entitlements.isLoading ? (
            <div className="h-16 animate-pulse rounded bg-muted" />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold capitalize">
                  {entitlements.data?.plan ?? "Free"}
                </span>
                {sub && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(sub.status)}`}
                  >
                    {sub.status}
                  </span>
                )}
              </div>

              {sub && (
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="block">Current period</span>
                    <span className="font-medium text-foreground">
                      {formatDate(sub.currentPeriodStart)} –{" "}
                      {formatDate(sub.currentPeriodEnd)}
                    </span>
                  </div>
                  {sub.cancelAt && (
                    <div>
                      <span className="block">Cancels on</span>
                      <span className="font-medium text-red-600">
                        {formatDate(sub.cancelAt)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!isPro && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => checkoutMutation.mutate({ plan: "monthly", successUrl: `${window.location.origin}/success?plan=monthly&checkout_id={CHECKOUT_ID}` })}
                    disabled={checkoutMutation.isPending}
                  >
                    Upgrade to Pro (Monthly)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => checkoutMutation.mutate({ plan: "annual", successUrl: `${window.location.origin}/success?plan=annual&checkout_id={CHECKOUT_ID}` })}
                    disabled={checkoutMutation.isPending}
                  >
                    Annual (Save 20%)
                  </Button>
                </div>
              )}

              {isPro && sub && sub.status === "active" && !sub.cancelAt && (
                <p className="text-xs text-muted-foreground">
                  To cancel your subscription, contact support or visit{" "}
                  <Link
                    href={"/support" as never}
                    className="text-primary hover:underline"
                  >
                    the support page
                  </Link>
                  .
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Support priority */}
      {supportPriority.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Support Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  supportPriority.data.priorityTier === "priority"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {supportPriority.data.priorityTier === "priority"
                  ? "Priority Support"
                  : "Standard Support"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {supportPriority.data.priorityReason}
            </p>
            <p className="text-xs text-muted-foreground">
              Target SLA: {supportPriority.data.slaTargetMinutes} minutes
            </p>
          </CardContent>
        </Card>
      )}

      {/* Feature entitlements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Features</CardTitle>
        </CardHeader>
        <CardContent>
          {entitlements.isLoading ? (
            <div className="h-16 animate-pulse rounded bg-muted" />
          ) : (entitlements.data?.features.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Pro features active on this account.
            </p>
          ) : (
            <ul className="space-y-1">
              {entitlements.data!.features.map((f) => (
                <li
                  key={f.featureKey}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="text-green-600">✓</span>
                  <span className="font-mono">{f.featureKey}</span>
                  <span className="text-muted-foreground">({f.source})</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link
          href={"/account" as never}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Account
        </Link>
        <Link
          href="/pricing"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          View Plans
        </Link>
      </div>
    </div>
  );
}
