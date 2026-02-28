"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

function getSeverityBadgeClass(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "high":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "low":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "cleared":
      return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

function getMaintenanceStatusClass(status: string) {
  switch (status) {
    case "overdue":
      return "text-red-600 dark:text-red-400";
    case "scheduled":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

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
  const latestEvent = diagnostics.data?.[0];

  return (
    <Link href={`/diagnostics/${vehicleId}` as never}>
      <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {make} {model}
          </CardTitle>
          <CardDescription>{modelYear}</CardDescription>
        </CardHeader>
        <CardContent>
          {diagnostics.isLoading ? (
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          ) : latestEvent ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold">
                {latestEvent.dtcCode}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${getSeverityBadgeClass(latestEvent.severity)}`}
              >
                {latestEvent.severity}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No diagnostic codes</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            View diagnostics →
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
          className="flex items-center justify-between rounded-lg border px-3 py-2"
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
          <span
            className={`text-xs font-semibold ${getMaintenanceStatusClass(item.status)}`}
          >
            {item.status === "overdue" ? "Overdue" : "Upcoming"}
          </span>
        </div>
      ))}
    </>
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
    <div className="container mx-auto max-w-5xl space-y-8 p-4">
      {/* Pro/Free Banner */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">
            {hasProSubscription ? "Pro Plan" : "Free Plan"}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasProSubscription
              ? "Full access to AI diagnostics and likely causes."
              : "Upgrade to unlock AI-powered likely causes and advanced diagnostics."}
          </p>
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
          <Button size="sm" onClick={() => (window.location.href = "/pricing")}>
            Upgrade to Pro
          </Button>
        )}
      </div>

      {/* Your Vehicles */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Vehicles</h2>
          <Link
            href="/vehicles"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Manage →
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
      </section>

      {/* Upcoming Maintenance */}
      {(vehicles.data?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Upcoming Maintenance</h2>
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
        </section>
      )}
    </div>
  );
}
