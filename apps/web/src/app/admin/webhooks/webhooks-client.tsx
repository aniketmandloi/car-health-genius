"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

type WebhookStatus = "processed" | "failed" | "received";

function statusBadgeClass(status: string) {
  switch (status) {
    case "processed":
      return "bg-green-100 text-green-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

export default function WebhooksClient() {
  const [statusFilter, setStatusFilter] = useState<WebhookStatus | "all">(
    "all",
  );
  const [expanded, setExpanded] = useState<number | null>(null);

  const events = useQuery(
    trpc.admin.listBillingWebhookEvents.queryOptions(
      statusFilter === "all"
        ? { limit: 100 }
        : { status: statusFilter, limit: 100 },
    ),
  );

  const data = events.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {(["all", "received", "processed", "failed"] as const).map((s) => (
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
            {s}
          </button>
        ))}
      </div>

      {events.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No webhook events found.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Provider</th>
                <th className="px-3 py-2 text-left font-medium">Event Type</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Received</th>
                <th className="px-3 py-2 text-left font-medium">Processed</th>
                <th className="px-3 py-2 text-left font-medium">Payload</th>
              </tr>
            </thead>
            <tbody>
              {data.map((event) => (
                <>
                  <tr
                    key={event.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2">{event.provider}</td>
                    <td className="px-3 py-2 font-mono">{event.eventType}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(event.status)}`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {new Date(event.receivedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      {event.processedAt
                        ? new Date(event.processedAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() =>
                          setExpanded(expanded === event.id ? null : event.id)
                        }
                      >
                        {expanded === event.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {expanded === event.id && (
                    <tr
                      key={`${event.id}-payload`}
                      className="border-b bg-muted/20"
                    >
                      <td colSpan={6} className="px-3 py-2">
                        {event.errorMessage && (
                          <p className="mb-2 text-xs text-red-600">
                            Error: {event.errorMessage}
                          </p>
                        )}
                        <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
