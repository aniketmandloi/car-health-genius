"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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

const EVENT_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "scan.ingested", label: "Scan" },
  { value: "dtc.cleared", label: "Code Cleared" },
  { value: "scan.event.created", label: "DTC Detected" },
];

export default function DiagnosticsList({ vehicleId }: { vehicleId: number }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [eventType, setEventType] = useState("");

  const vehicle = useQuery(trpc.vehicles.getById.queryOptions({ vehicleId }));
  const events = useQuery(
    trpc.diagnostics.listByVehicle.queryOptions({ vehicleId }),
  );
  const recalls = useQuery(
    trpc.vehicles.getRecalls.queryOptions({ vehicleId }),
  );
  const timeline = useQuery(
    trpc.diagnostics.timelineByVehicle.queryOptions({
      vehicleId,
      eventType: eventType.length > 0 ? eventType : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    }),
  );

  const vehicleData = vehicle.data;
  const recallCount = recalls.data?.records?.length ?? 0;

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4">
      {/* Vehicle Header */}
      <div className="flex items-center justify-between">
        <div>
          {vehicle.isLoading ? (
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          ) : (
            <>
              <h1 className="text-2xl font-semibold">
                {vehicleData?.make} {vehicleData?.model}
              </h1>
              <p className="text-sm text-muted-foreground">
                {vehicleData?.modelYear}
                {vehicleData?.mileage
                  ? ` · ${vehicleData.mileage.toLocaleString()} mi`
                  : ""}
                {vehicleData?.countryCode
                  ? ` · ${vehicleData.countryCode}`
                  : ""}
              </p>
            </>
          )}
        </div>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← Dashboard
        </Link>
      </div>

      {/* Recalls Warning */}
      {!recalls.isLoading && recallCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
            ⚠ {recallCount} Active Recall{recallCount !== 1 ? "s" : ""}
          </p>
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-500">
            Your vehicle has open recalls. Contact your dealer to schedule
            service.
          </p>
        </div>
      )}

      {/* Timeline Filters */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Timeline Filters</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="h-8 rounded border bg-background px-2 text-xs"
          >
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 w-36 text-xs"
            placeholder="From date"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 w-36 text-xs"
            placeholder="To date"
          />
          {(fromDate || toDate || eventType) && (
            <button
              type="button"
              onClick={() => {
                setFromDate("");
                setToDate("");
                setEventType("");
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </button>
          )}
        </div>
        {(fromDate || toDate || eventType) && !timeline.isLoading && (
          <p className="mt-2 text-xs text-muted-foreground">
            {timeline.data?.events.length ?? 0} timeline event
            {timeline.data?.events.length !== 1 ? "s" : ""} match your filters.
          </p>
        )}
      </section>

      {/* Diagnostic Events */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Diagnostic Events</h2>

        {events.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (events.data?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="font-medium">No diagnostic data yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect your OBD adapter via the mobile app to start scanning.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {events.data!.map((event) => (
              <Link key={event.id} href={`/results/${event.id}` as never}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold">
                        {event.dtcCode}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getSeverityBadgeClass(event.severity)}`}
                      >
                        {event.severity}
                      </span>
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {event.source}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.occurredAt).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(event.occurredAt).toLocaleTimeString(
                          undefined,
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
