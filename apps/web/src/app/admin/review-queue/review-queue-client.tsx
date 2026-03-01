"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient, trpc } from "@/utils/trpc";

type QueueStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "rejected"
  | "needs_revision";
type Resolution = "approved" | "rejected" | "needs_revision";

function readErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Request failed";
  const msg = (error as { message?: unknown }).message;
  return typeof msg === "string" && msg.length > 0 ? msg : "Request failed";
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "in_review":
      return "bg-blue-100 text-blue-800";
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function ReviewQueueClient() {
  const [statusFilter, setStatusFilter] = useState<QueueStatus | "all">(
    "pending",
  );
  const [resolveState, setResolveState] = useState<{
    itemId: number;
    resolution: Resolution;
    notes: string;
  } | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const items = useQuery(
    trpc.admin.listReviewQueue.queryOptions(
      statusFilter === "all"
        ? { limit: 100 }
        : { status: statusFilter, limit: 100 },
    ),
  );

  const claimMutation = useMutation(
    trpc.admin.claimReviewItem.mutationOptions({
      onSuccess: async () => {
        setMutationError(null);
        await queryClient.invalidateQueries(
          trpc.admin.listReviewQueue.queryFilter(),
        );
      },
      onError: (error) => setMutationError(readErrorMessage(error)),
    }),
  );

  const resolveMutation = useMutation(
    trpc.admin.resolveReviewItem.mutationOptions({
      onSuccess: async () => {
        setMutationError(null);
        setResolveState(null);
        await queryClient.invalidateQueries(
          trpc.admin.listReviewQueue.queryFilter(),
        );
      },
      onError: (error) => setMutationError(readErrorMessage(error)),
    }),
  );

  const data = items.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {(
          [
            "all",
            "pending",
            "in_review",
            "approved",
            "rejected",
            "needs_revision",
          ] as const
        ).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {mutationError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {mutationError}
        </p>
      )}

      {items.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No items in this queue.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm">Item #{item.id}</CardTitle>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(item.status)}`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">Urgency</span>
                    <p className="font-medium">{item.urgency}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence</span>
                    <p className="font-medium">{item.confidence}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Policy Blocked
                    </span>
                    <p
                      className={
                        item.policyBlocked
                          ? "font-medium text-red-600"
                          : "font-medium"
                      }
                    >
                      {item.policyBlocked ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Trigger</span>
                    <p className="font-medium">{item.triggerReason}</p>
                  </div>
                </div>

                {resolveState?.itemId === item.id ? (
                  <div className="space-y-2 rounded border p-3">
                    <select
                      value={resolveState.resolution}
                      onChange={(e) =>
                        setResolveState(
                          (s) =>
                            s && {
                              ...s,
                              resolution: e.target.value as Resolution,
                            },
                        )
                      }
                      className="h-8 w-full rounded border bg-background px-2 text-xs"
                    >
                      <option value="approved">Approve</option>
                      <option value="rejected">Reject</option>
                      <option value="needs_revision">Needs Revision</option>
                    </select>
                    <textarea
                      value={resolveState.notes}
                      onChange={(e) =>
                        setResolveState(
                          (s) => s && { ...s, notes: e.target.value },
                        )
                      }
                      placeholder="Resolution notes (required)"
                      rows={2}
                      className="w-full rounded border bg-background px-2 py-1.5 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          resolveMutation.mutate({
                            itemId: resolveState.itemId,
                            resolution: resolveState.resolution,
                            notes: resolveState.notes,
                          })
                        }
                        disabled={
                          resolveMutation.isPending ||
                          resolveState.notes.trim().length === 0
                        }
                      >
                        {resolveMutation.isPending ? "Saving..." : "Confirm"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResolveState(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {item.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          claimMutation.mutate({ itemId: item.id })
                        }
                        disabled={claimMutation.isPending}
                      >
                        Claim
                      </Button>
                    )}
                    {(item.status === "in_review" ||
                      item.status === "pending") && (
                      <Button
                        size="sm"
                        onClick={() =>
                          setResolveState({
                            itemId: item.id,
                            resolution: "approved",
                            notes: "",
                          })
                        }
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
