"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge, getSeverityVariant } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTransition } from "@/components/page-transition";
import { staggerContainer, fadeUp } from "@/lib/animation-variants";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

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
    <PageTransition>
      <div className="cb-page-narrow space-y-6">
        {/* Vehicle Header */}
        <div className="flex items-center justify-between">
          <div>
            {vehicle.isLoading ? (
              <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />
            ) : (
              <>
                <h1 className="text-2xl font-bold">
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
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5",
            )}
          >
            <ArrowLeft className="size-3.5" />
            Dashboard
          </Link>
        </div>

        {/* Recalls Warning */}
        {!recalls.isLoading && recallCount > 0 && (
          <div className="cb-section-soft border-warning/20 bg-warning/10 px-4 py-3">
            <p className="text-sm font-semibold text-warning">
              {recallCount} Active Recall{recallCount !== 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your vehicle has open recalls. Contact your dealer to schedule
              service.
            </p>
          </div>
        )}

        {/* Timeline Filters */}
        <section>
          <h2 className="mb-3 text-base font-semibold">Timeline Filters</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={eventType === "" ? "__all__" : eventType}
              onValueChange={(val) =>
                setEventType(val === "__all__" || val === null ? "" : val)
              }
            >
              <SelectTrigger className="h-10 w-[160px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value === "" ? "__all__" : opt.value}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-36"
              placeholder="From date"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-36"
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
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
          {(fromDate || toDate || eventType) && !timeline.isLoading && (
            <p className="mt-2 text-xs text-muted-foreground">
              {timeline.data?.events.length ?? 0} timeline event
              {timeline.data?.events.length !== 1 ? "s" : ""} match your
              filters.
            </p>
          )}
        </section>

        {/* Diagnostic Events */}
        <section>
          <h2 className="mb-3 text-base font-semibold">Diagnostic Events</h2>

          {events.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl bg-muted"
                />
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
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-2"
            >
              {events.data!.map((event) => (
                <motion.div key={event.id} variants={fadeUp}>
                  <Link href={`/results/${event.id}` as never}>
                    <Card className="cursor-pointer">
                      <CardContent className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold">
                            {event.dtcCode}
                          </span>
                          <Badge variant={getSeverityVariant(event.severity)}>
                            {event.severity}
                          </Badge>
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
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
