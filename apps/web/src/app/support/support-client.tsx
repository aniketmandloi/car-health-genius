"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Crown, Headphones } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, getStatusVariant } from "@/components/ui/badge";
import { PageTransition } from "@/components/page-transition";
import { queryClient, trpc } from "@/utils/trpc";

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
    <PageTransition>
      <div className="cb-page-compact space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="size-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Support</h1>
              <p className="text-sm text-muted-foreground">
                Submit a support request and track your issues.
              </p>
            </div>
          </div>
          {isPriorityUser && (
            <Badge variant="pro" className="gap-1">
              <Crown className="size-3" />
              Pro Priority
            </Badge>
          )}
        </div>

        {priorityQuery.data && (
          <div className="cb-section-soft px-4 py-2.5 text-sm text-muted-foreground">
            Your support tier:{" "}
            <span className="font-semibold text-foreground capitalize">
              {priorityQuery.data.priorityTier}
            </span>{" "}
            · SLA target: {priorityQuery.data.slaTargetMinutes} min ·{" "}
            {priorityQuery.data.priorityReason}
          </div>
        )}

        {/* New Issue Form */}
        <Card>
          <CardHeader>
            <CardTitle>Submit a New Issue</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Summary *</label>
                <Input
                  type="text"
                  required
                  maxLength={240}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief description of the issue"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Details (optional)
                </label>
                <textarea
                  maxLength={4000}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide additional context, steps to reproduce, etc."
                  rows={4}
                  className="cb-textarea min-h-28"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={includeBundle}
                    onCheckedChange={(checked) => {
                      setIncludeBundle(!!checked);
                      if (!checked) setConsentBundle(false);
                    }}
                  />
                  Attach recent diagnostic data to help debug the issue
                </label>
                {includeBundle && (
                  <label className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs">
                    <Checkbox
                      required={includeBundle}
                      checked={consentBundle}
                      onCheckedChange={(checked) => setConsentBundle(!!checked)}
                      className="mt-0.5 shrink-0"
                    />
                    <span>
                      I consent to sharing my recent diagnostic event data (DTC
                      codes, severity, timestamps) with the support team to help
                      resolve my issue. No personal identifiers beyond my user
                      ID will be included.
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
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
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
            <div className="h-20 animate-pulse rounded-2xl bg-muted" />
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
                      <Badge variant={getStatusVariant(issue.status)}>
                        {issue.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
