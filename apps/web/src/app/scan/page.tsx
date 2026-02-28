"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default function ScanPage() {
  const adapters = useQuery(
    trpc.diagnostics.listCompatibleAdapters.queryOptions(),
  );
  const vehicles = useQuery(trpc.vehicles.list.queryOptions());

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null,
  );

  const activeVehicleId = selectedVehicleId ?? vehicles.data?.[0]?.id ?? null;

  const events = useQuery({
    ...trpc.diagnostics.listByVehicle.queryOptions({
      vehicleId: activeVehicleId ?? 0,
    }),
    enabled: activeVehicleId !== null,
  });

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4">
      {/* Mobile app guidance banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-400">
          📱 OBD scanning requires the mobile app
        </p>
        <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-500">
          Download the Car Health Genius app on iOS or Android to connect your
          OBD adapter and scan your vehicle. View your scan results below.
        </p>
      </div>

      {/* Vehicle selector */}
      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
          <CardDescription>
            {vehicles.isLoading
              ? "Loading vehicles..."
              : `${vehicles.data?.length ?? 0} vehicle${(vehicles.data?.length ?? 0) !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(vehicles.data?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {vehicles.data!.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    activeVehicleId === v.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                >
                  {v.make} {v.model} ({v.modelYear})
                </button>
              ))}
            </div>
          )}

          {activeVehicleId === null ? (
            <p className="text-sm text-muted-foreground">
              No vehicles found.{" "}
              <Link href="/vehicles" className="underline">
                Add a vehicle
              </Link>{" "}
              to get started.
            </p>
          ) : events.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (events.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scan results yet for this vehicle. Use the mobile app to run
              your first scan.
            </p>
          ) : (
            <div className="space-y-2">
              {events.data!.map((event) => (
                <Link key={event.id} href={`/results/${event.id}` as never}>
                  <div className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition-colors hover:bg-muted">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        {event.dtcCode}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getSeverityBadgeClass(event.severity)}`}
                      >
                        {event.severity}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compatible Adapters */}
      <Card>
        <CardHeader>
          <CardTitle>Compatible Adapters</CardTitle>
          <CardDescription>
            {adapters.isLoading
              ? "Loading..."
              : `${adapters.data?.length ?? 0} active adapter${(adapters.data?.length ?? 0) !== 1 ? "s" : ""} available`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {adapters.isLoading && (
            <p className="text-xs text-muted-foreground">Loading adapters...</p>
          )}
          {(adapters.data ?? []).map((adapter) => (
            <div
              key={adapter.id}
              className="rounded-lg border px-3 py-2 text-xs"
            >
              <span className="font-medium">
                {adapter.vendor} {adapter.model}
              </span>
              <span className="ml-2 text-muted-foreground">
                ({adapter.connectionType}) · iOS{" "}
                {adapter.iosSupported ? "✓" : "✗"} · Android{" "}
                {adapter.androidSupported ? "✓" : "✗"}
              </span>
            </div>
          ))}
          {!adapters.isLoading && (adapters.data?.length ?? 0) === 0 && (
            <p className="text-xs text-muted-foreground">
              No active adapters available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
