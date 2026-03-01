"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient, trpc } from "@/utils/trpc";

function IssueStatusBadge({ status }: { status: string }) {
  const classMap: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    resolved:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${classMap[status] ?? classMap.open}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function SupportClient() {
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [includeBundle, setIncludeBundle] = useState(false);
  const [consentBundle, setConsentBundle] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const issuesQuery = useQuery(trpc.support.listMyIssues.queryOptions());

  const priorityQuery = useQuery(
    trpc.billing.getSupportPriority.queryOptions(),
  );

  const createMutation = useMutation(
    trpc.support.createIssue.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.support.listMyIssues.queryFilter(),
        );
        setSummary("");
        setDetails("");
        setIncludeBundle(false);
        setConsentBundle(false);
        setSubmitSuccess(true);
      },
    }),
  );

  const isPriorityUser = priorityQuery.data?.priorityTier === "priority";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitSuccess(false);
    createMutation.mutate({
      issueSummary: summary.trim(),
      issueDetails: details.trim() || undefined,
      includeDiagnosticBundle: includeBundle,
      consentDiagnosticBundle: consentBundle,
    });
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit a support request and track your issues.
          </p>
        </div>
        {isPriorityUser && (
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            Pro Priority Support
          </span>
        )}
      </div>

      {priorityQuery.data && (
        <div className="rounded-lg border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          Your support tier:{" "}
          <span className="font-semibold text-foreground capitalize">
            {priorityQuery.data.priorityTier}
          </span>{" "}
          &middot; SLA target: {priorityQuery.data.slaTargetMinutes} min
          &middot; {priorityQuery.data.priorityReason}
        </div>
      )}

      {/* New Issue Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit a New Issue</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Summary *</label>
              <input
                type="text"
                required
                maxLength={240}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief description of the issue"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Details (optional)</label>
              <textarea
                maxLength={4000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide additional context, steps to reproduce, etc."
                rows={4}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeBundle}
                  onChange={(e) => {
                    setIncludeBundle(e.target.checked);
                    if (!e.target.checked) setConsentBundle(false);
                  }}
                />
                Attach recent diagnostic data to help debug the issue
              </label>
              {includeBundle && (
                <label className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs dark:bg-amber-950/20">
                  <input
                    type="checkbox"
                    required={includeBundle}
                    checked={consentBundle}
                    onChange={(e) => setConsentBundle(e.target.checked)}
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    I consent to sharing my recent diagnostic event data (DTC
                    codes, severity, timestamps) with the support team to help
                    resolve my issue. No personal identifiers beyond my user ID
                    will be included.
                  </span>
                </label>
              )}
            </div>
            {createMutation.error && (
              <p className="text-sm text-destructive">
                {createMutation.error.message}
              </p>
            )}
            {submitSuccess && (
              <p className="text-sm text-green-600">
                Your issue has been submitted. We&apos;ll be in touch soon.
              </p>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !summary.trim()}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Issue"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Issues */}
      <section>
        <h2 className="mb-3 text-base font-semibold">My Issues</h2>
        {issuesQuery.isLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        ) : (issuesQuery.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            No issues submitted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {issuesQuery.data!.map((issue) => (
              <Card key={issue.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {issue.issueSummary}
                      </p>
                      {issue.issueDetails && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {issue.issueDetails}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <IssueStatusBadge status={issue.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
