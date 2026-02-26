"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

export default function ScanPage() {
  const adapters = useQuery(trpc.diagnostics.listCompatibleAdapters.queryOptions());

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Pre-Scan Compatibility Check</CardTitle>
          <CardDescription>
            Free users can verify adapter compatibility before starting a scan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {adapters.isLoading ? <p className="text-xs text-muted-foreground">Loading adapters...</p> : null}
          {(adapters.data ?? []).map((adapter) => (
            <div key={adapter.id} className="border px-3 py-2 text-xs">
              {adapter.vendor} {adapter.model} ({adapter.connectionType}) - iOS{" "}
              {adapter.iosSupported ? "supported" : "not supported"}, Android{" "}
              {adapter.androidSupported ? "supported" : "not supported"}
            </div>
          ))}
          {!adapters.isLoading && (adapters.data?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">No active adapters available.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
