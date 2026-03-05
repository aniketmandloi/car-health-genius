"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, ScanLine } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, getSeverityVariant } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";
import { staggerContainer, fadeUp } from "@/lib/animation-variants";
import { trpc } from "@/utils/trpc";

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
    <PageTransition>
      <div className="cb-page-narrow space-y-6">
        {/* Mobile app guidance banner */}
        <div className="cb-section-soft flex items-start gap-3 px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-info" />
          <div>
            <p className="text-sm font-semibold">
              OBD scanning requires the mobile app
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Download the Car Health Genius app on iOS or Android to connect
              your OBD adapter and scan your vehicle. View your scan results
              below.
            </p>
          </div>
        </div>

        {/* Vehicle selector */}
        <motion.div variants={staggerContainer} initial="hidden" animate="show">
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ScanLine className="size-5 text-primary" />
                  <CardTitle>Scan History</CardTitle>
                </div>
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
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          activeVehicleId === v.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/80 bg-card hover:bg-muted/70"
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
                    <Link
                      href="/vehicles"
                      className="text-primary hover:underline"
                    >
                      Add a vehicle
                    </Link>{" "}
                    to get started.
                  </p>
                ) : events.isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-12 animate-pulse rounded-xl bg-muted"
                      />
                    ))}
                  </div>
                ) : (events.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No scan results yet for this vehicle. Use the mobile app to
                    run your first scan.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {events.data!.map((event) => (
                      <Link
                        key={event.id}
                        href={`/results/${event.id}` as never}
                      >
                        <div className="surface-subtle flex cursor-pointer items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/65">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold">
                              {event.dtcCode}
                            </span>
                            <Badge variant={getSeverityVariant(event.severity)}>
                              {event.severity}
                            </Badge>
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
          </motion.div>

          {/* Compatible Adapters */}
          <motion.div variants={fadeUp} className="mt-6">
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
                  <p className="text-sm text-muted-foreground">
                    Loading adapters...
                  </p>
                )}
                {(adapters.data ?? []).map((adapter) => (
                  <div
                    key={adapter.id}
                    className="surface-subtle px-4 py-2.5 text-sm"
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
                  <p className="text-sm text-muted-foreground">
                    No active adapters available.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
