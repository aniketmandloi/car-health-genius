"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient, trpc } from "@/utils/trpc";

type LeadStatus = "accepted" | "alternate" | "rejected";

type LeadItem = {
  id: number;
  issueSummary: string;
  preferredWindowStart: string;
  preferredWindowEnd: string;
  status: string;
  requestedAt: string;
};

function toDatetimeLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleString();
}

function readErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Request failed";
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.length > 0 ? message : "Request failed";
}

function LeadCard({
  lead,
  onRespond,
  isPending,
}: {
  lead: LeadItem;
  onRespond: (input: {
    bookingId: number;
    status: LeadStatus;
    message?: string;
    alternateWindowStart?: string;
    alternateWindowEnd?: string;
  }) => void;
  isPending: boolean;
}) {
  const [status, setStatus] = useState<LeadStatus>("accepted");
  const [message, setMessage] = useState("");
  const [alternateWindowStart, setAlternateWindowStart] = useState(toDatetimeLocalInput(lead.preferredWindowStart));
  const [alternateWindowEnd, setAlternateWindowEnd] = useState(toDatetimeLocalInput(lead.preferredWindowEnd));
  const [localError, setLocalError] = useState<string | null>(null);

  function submitResponse() {
    setLocalError(null);

    if (status === "alternate") {
      if (!alternateWindowStart || !alternateWindowEnd) {
        setLocalError("Alternate start/end are required.");
        return;
      }

      const start = new Date(alternateWindowStart);
      const end = new Date(alternateWindowEnd);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        setLocalError("Alternate window end must be after start.");
        return;
      }

      onRespond({
        bookingId: lead.id,
        status,
        message: message.trim().length > 0 ? message.trim() : undefined,
        alternateWindowStart: start.toISOString(),
        alternateWindowEnd: end.toISOString(),
      });
      return;
    }

    onRespond({
      bookingId: lead.id,
      status,
      message: message.trim().length > 0 ? message.trim() : undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lead #{lead.id}</CardTitle>
        <CardDescription>{lead.issueSummary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            Preferred start: <span className="text-foreground">{formatDateTime(lead.preferredWindowStart)}</span>
          </div>
          <div>
            Preferred end: <span className="text-foreground">{formatDateTime(lead.preferredWindowEnd)}</span>
          </div>
          <div>
            Requested: <span className="text-foreground">{formatDateTime(lead.requestedAt)}</span>
          </div>
          <div>
            Current status: <span className="text-foreground capitalize">{lead.status.replace("_", " ")}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`lead-${lead.id}-status`}>Response</Label>
          <select
            id={`lead-${lead.id}-status`}
            value={status}
            onChange={(event) => setStatus(event.target.value as LeadStatus)}
            className="h-8 w-full rounded border bg-background px-2 text-xs"
            disabled={isPending}
          >
            <option value="accepted">Accept</option>
            <option value="alternate">Propose Alternate Window</option>
            <option value="rejected">Reject</option>
          </select>
        </div>

        {status === "alternate" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`lead-${lead.id}-alt-start`}>Alternate start</Label>
              <Input
                id={`lead-${lead.id}-alt-start`}
                type="datetime-local"
                value={alternateWindowStart}
                onChange={(event) => setAlternateWindowStart(event.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`lead-${lead.id}-alt-end`}>Alternate end</Label>
              <Input
                id={`lead-${lead.id}-alt-end`}
                type="datetime-local"
                value={alternateWindowEnd}
                onChange={(event) => setAlternateWindowEnd(event.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor={`lead-${lead.id}-message`}>Message to customer (optional)</Label>
          <textarea
            id={`lead-${lead.id}-message`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={isPending}
            rows={3}
            className="w-full rounded border bg-background px-2 py-1.5 text-xs"
            placeholder="Share context, availability notes, or next steps."
          />
        </div>

        {localError && <p className="text-xs text-red-500">{localError}</p>}

        <Button type="button" size="sm" onClick={submitResponse} disabled={isPending}>
          {isPending ? "Submitting..." : "Submit Response"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LeadsClient() {
  const [mutationError, setMutationError] = useState<string | null>(null);
  const leads = useQuery(trpc.partnerPortal.listOpenLeads.queryOptions({ limit: 100 }));

  const sortedLeads = useMemo(() => {
    return [...(leads.data ?? [])].sort((a, b) => {
      const aTs = new Date(a.requestedAt).getTime();
      const bTs = new Date(b.requestedAt).getTime();
      return bTs - aTs;
    });
  }, [leads.data]);

  const respondMutation = useMutation(
    trpc.partnerPortal.respondToLead.mutationOptions({
      onSuccess: async () => {
        setMutationError(null);
        await queryClient.invalidateQueries(trpc.partnerPortal.listOpenLeads.queryFilter());
      },
      onError: (error) => {
        setMutationError(readErrorMessage(error));
      },
    }),
  );

  return (
    <div className="space-y-4">
      {mutationError && (
        <Card className="border-red-300">
          <CardContent className="py-3">
            <p className="text-xs text-red-500">{mutationError}</p>
          </CardContent>
        </Card>
      )}

      {leads.isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : leads.isError ? (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-medium">Unable to load partner leads.</p>
            <p className="text-xs text-muted-foreground">{readErrorMessage(leads.error)}</p>
          </CardContent>
        </Card>
      ) : sortedLeads.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium">No open leads right now.</p>
            <p className="text-xs text-muted-foreground">
              New partner-assigned requests in requested/alternate state will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isPending={respondMutation.isPending}
              onRespond={(input) => respondMutation.mutate(input)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
