"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Car,
  TrendingUp,
  Wrench,
  DollarSign,
  ArrowRight,
  Crown,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Badge,
  getSeverityVariant,
  getPriorityVariant,
} from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { PageTransition } from "@/components/page-transition";
import { staggerContainer, fadeUp } from "@/lib/animation-variants";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

function VehicleHealthCard({
  vehicleId,
  make,
  model,
  modelYear,
}: {
  vehicleId: number;
  make: string;
  model: string;
  modelYear: number;
}) {
  const diagnostics = useQuery(
    trpc.diagnostics.listByVehicle.queryOptions({ vehicleId }),
  );
  const healthScore = useQuery(
    trpc.maintenance.getHealthScore.queryOptions({ vehicleId }),
  );
  const latestEvent = diagnostics.data?.[0];

  return (
    <Link href={`/diagnostics/${vehicleId}` as never}>
      <Card className="h-full cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>
                {make} {model}
              </CardTitle>
              <CardDescription>{modelYear}</CardDescription>
            </div>
            {healthScore.data && (
              <ProgressRing
                score={healthScore.data.score}
                grade={healthScore.data.grade}
                size={56}
                strokeWidth={4}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {diagnostics.isLoading ? (
            <div className="h-5 w-24 animate-pulse rounded-lg bg-muted" />
          ) : latestEvent ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold">
                {latestEvent.dtcCode}
              </span>
              <Badge variant={getSeverityVariant(latestEvent.severity)}>
                {latestEvent.severity}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No diagnostic codes</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            View diagnostics <ArrowRight className="size-3" />
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function MaintenanceSummary({
  vehicleId,
  make,
  model,
}: {
  vehicleId: number;
  make: string;
  model: string;
}) {
  const maintenance = useQuery(
    trpc.maintenance.listByVehicle.queryOptions({ vehicleId }),
  );
  const upcoming = (maintenance.data ?? []).filter(
    (item) => item.status === "overdue" || item.status === "scheduled",
  );

  if (maintenance.isLoading || upcoming.length === 0) {
    return null;
  }

  return (
    <>
      {upcoming.map((item) => (
        <div
          key={item.id}
          className={cn(
            "surface-subtle flex items-center justify-between px-4 py-3",
            item.status === "overdue"
              ? "border-l-2 border-l-red-500"
              : "border-l-2 border-l-amber-500",
          )}
        >
          <div>
            <p className="text-sm font-medium">{item.serviceType}</p>
            <p className="text-xs text-muted-foreground">
              {make} {model}
              {item.dueDate
                ? ` · Due ${new Date(item.dueDate).toLocaleDateString()}`
                : ""}
              {item.dueMileage
                ? ` · Due at ${item.dueMileage.toLocaleString()} mi`
                : ""}
            </p>
          </div>
          <Badge variant={item.status === "overdue" ? "critical" : "medium"}>
            {item.status === "overdue" ? "Overdue" : "Upcoming"}
          </Badge>
        </div>
      ))}
    </>
  );
}

function MaintenancePredictionsSection({
  vehicleId,
  make,
  model,
}: {
  vehicleId: number;
  make: string;
  model: string;
}) {
  const predictions = useQuery(
    trpc.maintenance.getPredictions.queryOptions({ vehicleId }),
  );

  const topItems = (predictions.data ?? [])
    .filter((p) => p.priority === "soon")
    .slice(0, 3);

  if (predictions.isLoading || topItems.length === 0) return null;

  return (
    <>
      {topItems.map((item) => (
        <div
          key={`${vehicleId}-${item.serviceType}`}
          className="surface-subtle flex items-center justify-between px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium">{item.serviceType}</p>
            <p className="text-xs text-muted-foreground">
              {make} {model}
              {item.estimatedDueMileage
                ? ` · ~${item.estimatedDueMileage.toLocaleString()} mi`
                : ""}
              {item.estimatedDueDate
                ? ` · ~${new Date(item.estimatedDueDate).toLocaleDateString()}`
                : ""}
            </p>
          </div>
          <Badge variant={getPriorityVariant(item.priority)}>
            {item.priority === "soon" ? "Due Soon" : "Upcoming"}
          </Badge>
        </div>
      ))}
    </>
  );
}

function SavingsSummaryCard() {
  const savings = useQuery(trpc.billing.getSavingsSummary.queryOptions());

  if (savings.isLoading) {
    return <div className="h-20 animate-pulse rounded-2xl bg-muted" />;
  }

  const data = savings.data;
  if (!data) return null;

  const hasSavings = data.estimatedSavingsHighCents > 0;

  return (
    <motion.section variants={fadeUp}>
      <div className="mb-3 flex items-center gap-2">
        <DollarSign className="size-5 text-emerald-500" />
        <h2 className="text-lg font-semibold">Savings Summary</h2>
      </div>
      <Card>
        <CardContent className="space-y-3 py-4">
          {hasSavings ? (
            <div>
              <p className="text-3xl font-bold text-emerald-500">
                ${(data.estimatedSavingsLowCents / 100).toFixed(0)} – $
                {(data.estimatedSavingsHighCents / 100).toFixed(0)}
              </p>
              <p className="text-sm text-muted-foreground">
                Estimated savings based on {data.outcomeCount} recorded repair
                outcome{data.outcomeCount !== 1 ? "s" : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {data.confidenceNote}
            </p>
          )}
          <p className="text-xs text-muted-foreground italic">
            {data.disclaimer}
          </p>
        </CardContent>
      </Card>
    </motion.section>
  );
}

export default function Dashboard({
  customerState,
  session,
}: {
  customerState: ReturnType<typeof authClient.customer.state>;
  session: typeof authClient.$Infer.Session;
}) {
  const vehicles = useQuery(trpc.vehicles.list.queryOptions());
  const hasProSubscription =
    (customerState?.activeSubscriptions?.length ?? 0) > 0;

  return (
    <PageTransition>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="container mx-auto max-w-5xl space-y-8 p-4 md:p-6"
      >
        {/* Pro/Free Banner */}
        <motion.div variants={fadeUp}>
          <Card
            className={cn(
              "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5",
              hasProSubscription
                ? "border-primary/30 dark:border-primary/20"
                : "border-secondary/30 dark:border-secondary/20",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl",
                  hasProSubscription ? "bg-primary/10" : "bg-secondary/10",
                )}
              >
                <Crown
                  className={cn(
                    "size-5",
                    hasProSubscription ? "text-primary" : "text-secondary",
                  )}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">
                    {hasProSubscription ? "Pro Plan" : "Free Plan"}
                  </p>
                  {hasProSubscription && <Badge variant="pro">Active</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {hasProSubscription
                    ? "Full access to AI diagnostics and likely causes."
                    : "Upgrade to unlock AI-powered likely causes and advanced diagnostics."}
                </p>
              </div>
            </div>
            {hasProSubscription ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => await authClient.customer.portal()}
              >
                Manage Subscription
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => (window.location.href = "/pricing")}
                className="gap-1.5"
              >
                Upgrade to Pro
                <ArrowRight className="size-3.5" />
              </Button>
            )}
          </Card>
        </motion.div>

        {/* Your Vehicles */}
        <motion.section variants={fadeUp}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="size-5 text-primary" />
              <h2 className="text-lg font-semibold">Your Vehicles</h2>
            </div>
            <Link
              href="/vehicles"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Manage <ArrowRight className="size-3" />
            </Link>
          </div>

          {vehicles.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((i) => (
                <Card key={i} className="h-32 animate-pulse bg-muted" />
              ))}
            </div>
          ) : (vehicles.data?.length ?? 0) === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12 text-center">
              <CardContent>
                <Car className="mx-auto mb-3 size-10 text-muted-foreground/50" />
                <p className="font-medium">No vehicles added yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add your first vehicle to start tracking diagnostics.
                </p>
                <Link href="/vehicles" className={cn(buttonVariants(), "mt-4")}>
                  Add a Vehicle
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vehicles.data!.map((v) => (
                <VehicleHealthCard
                  key={v.id}
                  vehicleId={v.id}
                  make={v.make}
                  model={v.model}
                  modelYear={v.modelYear}
                />
              ))}
            </div>
          )}
        </motion.section>

        {/* Upcoming Maintenance */}
        {(vehicles.data?.length ?? 0) > 0 && (
          <motion.section variants={fadeUp}>
            <div className="mb-3 flex items-center gap-2">
              <Wrench className="size-5 text-amber-500" />
              <h2 className="text-lg font-semibold">Upcoming Maintenance</h2>
            </div>
            <div className="space-y-2">
              {vehicles.data!.map((v) => (
                <MaintenanceSummary
                  key={v.id}
                  vehicleId={v.id}
                  make={v.make}
                  model={v.model}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Only overdue and scheduled items are shown.
            </p>
          </motion.section>
        )}

        {/* Predicted Maintenance */}
        {(vehicles.data?.length ?? 0) > 0 && (
          <motion.section variants={fadeUp}>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              <h2 className="text-lg font-semibold">Predicted Maintenance</h2>
            </div>
            <div className="space-y-2">
              {vehicles.data!.map((v) => (
                <MaintenancePredictionsSection
                  key={v.id}
                  vehicleId={v.id}
                  make={v.make}
                  model={v.model}
                />
              ))}
            </div>
          </motion.section>
        )}

        {/* Savings Summary */}
        <SavingsSummaryCard />
      </motion.div>
    </PageTransition>
  );
}
