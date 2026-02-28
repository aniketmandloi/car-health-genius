"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { queryClient, trpc } from "@/utils/trpc";

// ─── Severity ────────────────────────────────────────────────────────────────

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
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

// ─── Triage ───────────────────────────────────────────────────────────────────

type TriageClass = "safe" | "service_soon" | "service_now";

function getTriageConfig(triageClass: TriageClass | string | null) {
  switch (triageClass) {
    case "safe":
      return {
        label: "Safe to Drive",
        badgeClass:
          "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
        borderClass: "border-green-200 dark:border-green-800",
      };
    case "service_soon":
      return {
        label: "Service Soon",
        badgeClass:
          "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
        borderClass: "border-amber-200 dark:border-amber-800",
      };
    case "service_now":
      return {
        label: "Service Now",
        badgeClass:
          "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        borderClass: "border-red-200 dark:border-red-800",
      };
    default:
      return {
        label: "Unknown",
        badgeClass:
          "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
        borderClass: "border-gray-200 dark:border-gray-700",
      };
  }
}

// ─── Safe detail accessors ────────────────────────────────────────────────────

function getStringList(
  details: Record<string, unknown> | null,
  key: string,
): string[] {
  if (!details) return [];
  const value = details[key];
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function getTriageDetails(details: Record<string, unknown> | null) {
  if (!details) return null;
  const triage = details["triage"];
  if (!triage || typeof triage !== "object") return null;
  return triage as Record<string, unknown>;
}

function getString(
  obj: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!obj) return null;
  const val = obj[key];
  return typeof val === "string" ? val : null;
}

// ─── Components ───────────────────────────────────────────────────────────────

function RecommendationCard({
  rec,
}: {
  rec: {
    id: number;
    title: string;
    rationale: string;
    confidence: number;
    triageClass: TriageClass | null;
    details: Record<string, unknown> | null;
  };
}) {
  const triageDetails = getTriageDetails(rec.details);
  const driveability = getString(triageDetails, "driveability");
  const evidence = getStringList(rec.details, "evidence");
  const nextSteps = getStringList(rec.details, "nextSteps");
  const limitations = getStringList(rec.details, "limitations");
  const triage = getTriageConfig(rec.triageClass);

  return (
    <Card className={`border ${triage.borderClass}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{rec.title}</CardTitle>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${triage.badgeClass}`}
          >
            {triage.label}
          </span>
        </div>
        <CardDescription className="text-sm">{rec.rationale}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Confidence */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Confidence</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${rec.confidence}%` }}
            />
          </div>
          <span className="text-xs font-medium">{rec.confidence}%</span>
        </div>

        {/* Driveability */}
        {driveability && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Driveability: </span>
            {driveability}
          </p>
        )}

        {/* Evidence */}
        {evidence.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold">Evidence</p>
            <ul className="space-y-0.5">
              {evidence.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-1.5 text-xs text-muted-foreground"
                >
                  <span className="mt-0.5 text-primary">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps */}
        {nextSteps.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold">Recommended Steps</p>
            <ol className="space-y-0.5">
              {nextSteps.map((step, i) => (
                <li
                  key={i}
                  className="flex gap-1.5 text-xs text-muted-foreground"
                >
                  <span className="shrink-0 font-medium text-foreground">
                    {i + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Limitations */}
        {limitations.length > 0 && (
          <div className="rounded border border-dashed px-2 py-1.5">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">
              Limitations
            </p>
            {limitations.map((item, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {item}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResultsDetail({
  diagnosticEventId,
}: {
  diagnosticEventId: number;
}) {
  const [generating, setGenerating] = useState(false);

  const recommendations = useQuery(
    trpc.recommendations.listByDiagnosticEvent.queryOptions({
      diagnosticEventId,
    }),
  );

  const likelyCauses = useQuery({
    ...trpc.recommendations.likelyCauses.queryOptions({ diagnosticEventId }),
    retry: false,
  });

  const generateMutation = useMutation(
    trpc.recommendations.generateForDiagnosticEvent.mutationOptions({
      onSuccess: async () => {
        setGenerating(false);
        await queryClient.invalidateQueries(
          trpc.recommendations.listByDiagnosticEvent.queryFilter({
            diagnosticEventId,
          }),
        );
      },
      onError: () => setGenerating(false),
    }),
  );

  const activeRecs = (recommendations.data ?? []).filter((r) => r.isActive);
  const firstRec = activeRecs[0];

  // Derive DTC info from first recommendation's details if available
  const dtcFromDetails = firstRec?.details
    ? getString(firstRec.details as Record<string, unknown>, "dtcCode")
    : null;

  const isProLocked =
    likelyCauses.isError &&
    (likelyCauses.error as { data?: { businessCode?: string } } | undefined)
      ?.data?.businessCode === "ENTITLEMENT_REQUIRED";

  function handleGenerate() {
    setGenerating(true);
    generateMutation.mutate({ diagnosticEventId, mode: "basic" });
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4">
      {/* Back nav */}
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        ← Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl font-bold">
          {dtcFromDetails ?? `Event #${diagnosticEventId}`}
        </span>
        {firstRec && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSeverityBadgeClass(
              firstRec.urgency,
            )}`}
          >
            {firstRec.urgency}
          </span>
        )}
      </div>

      {/* Recommendations */}
      <section>
        <h2 className="mb-3 text-base font-semibold">AI Analysis</h2>

        {recommendations.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : activeRecs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <p className="font-medium">No analysis yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate an AI-powered explanation for this diagnostic code.
              </p>
              <Button
                className="mt-4"
                onClick={handleGenerate}
                disabled={generating || generateMutation.isPending}
              >
                {generating || generateMutation.isPending
                  ? "Generating..."
                  : "Generate Explanation"}
              </Button>
              {generateMutation.isError && (
                <p className="mt-2 text-xs text-red-500">
                  {generateMutation.error instanceof Error
                    ? generateMutation.error.message
                    : "Generation failed. Please try again."}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeRecs.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
        )}
      </section>

      {/* Likely Causes (Pro-gated) */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Likely Causes</h2>

        {likelyCauses.isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        ) : isProLocked ? (
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
              <p className="font-semibold">Pro Feature</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upgrade to Pro to see ranked likely causes with confidence
                scores.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => (window.location.href = "/pricing")}
              >
                Upgrade to Pro
              </Button>
            </div>
            {/* Blurred preview */}
            <CardContent className="space-y-2 py-4 blur-sm select-none">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <span className="text-sm">Cause #{i}</span>
                  <div className="h-2 w-16 rounded-full bg-muted" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : likelyCauses.data ? (
          <Card>
            <CardContent className="space-y-3 py-4">
              {likelyCauses.data.causes.map((cause) => (
                <div key={cause.rank} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {cause.rank}. {cause.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {cause.confidence}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${cause.confidence}%` }}
                    />
                  </div>
                  {cause.evidence.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {cause.evidence.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            No likely causes data available.
          </p>
        )}
      </section>

      {/* Compliance disclaimer (CMP-002) */}
      <div className="rounded-lg border border-dashed px-4 py-3 text-xs text-muted-foreground">
        <p className="font-semibold">Disclaimer (CMP-002)</p>
        <p className="mt-1">
          Car Health Genius provides AI-generated diagnostic information for
          educational purposes only. This is not a substitute for professional
          mechanical inspection or repair advice. Always consult a licensed
          mechanic before making vehicle repairs. Driving with active fault
          codes may be unsafe.
        </p>
      </div>
    </div>
  );
}
