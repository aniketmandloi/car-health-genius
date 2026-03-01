"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient, trpc } from "@/utils/trpc";

type SafetySwitch = {
  scope: string;
  enabled: boolean;
  reason: string | null;
  effectiveAt: string;
  expiresAt: string | null;
};

function readErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Request failed";
  const msg = (error as { message?: unknown }).message;
  return typeof msg === "string" && msg.length > 0 ? msg : "Request failed";
}

function SwitchCard({
  sw,
  onToggle,
  isPending,
}: {
  sw: SafetySwitch;
  onToggle: (scope: string, enabled: boolean, reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Card className={sw.enabled ? "border-green-200" : "border-red-200"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-mono text-sm">{sw.scope}</CardTitle>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              sw.enabled
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {sw.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-muted-foreground">Reason</span>
            <p className="font-medium">{sw.reason ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Effective at</span>
            <p className="font-medium">
              {new Date(sw.effectiveAt).toLocaleString()}
            </p>
          </div>
          {sw.expiresAt && (
            <div>
              <span className="text-muted-foreground">Expires at</span>
              <p className="font-medium">
                {new Date(sw.expiresAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Reason for change..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-7 flex-1 rounded border bg-background px-2 text-xs"
          />
          <Button
            size="sm"
            variant={sw.enabled ? "destructive" : "default"}
            onClick={() => onToggle(sw.scope, !sw.enabled, reason)}
            disabled={isPending || reason.trim().length === 0}
          >
            {sw.enabled ? "Disable" : "Enable"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SafetySwitchesClient() {
  const [mutationError, setMutationError] = useState<string | null>(null);
  const switches = useQuery(trpc.admin.listSafetySwitches.queryOptions());

  const setMutation = useMutation(
    trpc.admin.setSafetySwitch.mutationOptions({
      onSuccess: async () => {
        setMutationError(null);
        await queryClient.invalidateQueries(
          trpc.admin.listSafetySwitches.queryFilter(),
        );
      },
      onError: (error) => setMutationError(readErrorMessage(error)),
    }),
  );

  function handleToggle(scope: string, enabled: boolean, reason: string) {
    setMutation.mutate({
      scope: scope as Parameters<typeof setMutation.mutate>[0]["scope"],
      enabled,
      reason,
    });
  }

  return (
    <div className="space-y-4">
      {mutationError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {mutationError}
        </p>
      )}

      {switches.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (switches.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No safety switches configured.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {switches.data!.map((sw) => (
            <SwitchCard
              key={sw.scope}
              sw={sw}
              onToggle={handleToggle}
              isPending={setMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
