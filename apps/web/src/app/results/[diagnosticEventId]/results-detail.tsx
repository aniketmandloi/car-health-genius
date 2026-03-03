"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Brain,
  DollarSign,
  Lock,
  MessageSquare,
  Search,
  Wrench,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Badge,
  getSeverityVariant,
  getTriageVariant,
} from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTransition } from "@/components/page-transition";
import { staggerContainer, fadeUp } from "@/lib/animation-variants";
import { cn } from "@/lib/utils";
import { queryClient, trpc } from "@/utils/trpc";

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

function extractBusinessCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const maybeData = (error as { data?: unknown }).data;
  if (!maybeData || typeof maybeData !== "object") return undefined;
  const code = (maybeData as { businessCode?: unknown }).businessCode;
  return typeof code === "string" ? code : undefined;
}

const TRIAGE_LABELS: Record<string, string> = {
  safe: "Safe to Drive",
  service_soon: "Service Soon",
  service_now: "Service Now",
};

// ─── Components ───────────────────────────────────────────────────────────────

function ProLockOverlay({ message }: { message: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[16px]">
        <Lock className="mb-2 size-5 text-muted-foreground" />
        <p className="font-semibold">Pro Feature</p>
        <p className="mt-1 text-sm text-muted-foreground text-center max-w-xs">
          {message}
        </p>
        <Button
          size="sm"
          className="mt-3"
          onClick={() => (window.location.href = "/pricing")}
        >
          Upgrade to Pro
        </Button>
      </div>
      <CardContent className="space-y-2 py-4 blur-sm select-none">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border px-3 py-2"
          >
            <span className="text-sm">Content #{i}</span>
            <div className="h-2 w-16 rounded-full bg-muted" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecommendationCard({
  rec,
  currentRating,
  onRateHelpful,
  onRateNotHelpful,
  isSaving,
}: {
  rec: {
    id: number;
    title: string;
    rationale: string;
    confidence: number;
    triageClass: string | null;
    details: Record<string, unknown> | null;
  };
  currentRating: number | null;
  onRateHelpful: () => void;
  onRateNotHelpful: () => void;
  isSaving: boolean;
}) {
  const triageDetails = getTriageDetails(rec.details);
  const driveability = getString(triageDetails, "driveability");
  const evidence = getStringList(rec.details, "evidence");
  const nextSteps = getStringList(rec.details, "nextSteps");
  const limitations = getStringList(rec.details, "limitations");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{rec.title}</CardTitle>
          <Badge variant={getTriageVariant(rec.triageClass)}>
            {TRIAGE_LABELS[rec.triageClass ?? ""] ?? "Unknown"}
          </Badge>
        </div>
        <CardDescription className="text-sm">{rec.rationale}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Confidence bar */}
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

        {driveability && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Driveability: </span>
            {driveability}
          </p>
        )}

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

        {limitations.length > 0 && (
          <div className="rounded-xl border border-dashed px-3 py-2">
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

        <div className="rounded-xl border border-dashed px-3 py-2">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Was this recommendation helpful?
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="xs"
              variant={
                currentRating !== null && currentRating >= 4
                  ? "default"
                  : "outline"
              }
              disabled={isSaving}
              onClick={onRateHelpful}
            >
              Helpful
            </Button>
            <Button
              type="button"
              size="xs"
              variant={
                currentRating !== null && currentRating <= 3
                  ? "default"
                  : "outline"
              }
              disabled={isSaving}
              onClick={onRateNotHelpful}
            >
              Not helpful
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Repair Outcome ───────────────────────────────────────────────────────────

const OUTCOME_STATUS_OPTIONS = [
  { value: "repaired", label: "Repaired" },
  { value: "partially_repaired", label: "Partially Repaired" },
  { value: "deferred", label: "Deferred" },
  { value: "not_repaired", label: "Not Repaired" },
  { value: "still_investigating", label: "Still Investigating" },
];

function RepairOutcomeSection({
  diagnosticEventId,
}: {
  diagnosticEventId: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [outcomeStatus, setOutcomeStatus] = useState("repaired");
  const [shopName, setShopName] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const outcomes = useQuery(
    trpc.repairOutcome.getByDiagnosticEvent.queryOptions({ diagnosticEventId }),
  );
  const createMutation = useMutation(
    trpc.repairOutcome.create.mutationOptions({
      onSuccess: async () => {
        setFormError(null);
        setShowForm(false);
        setShopName("");
        setInvoiceAmount("");
        setNotes("");
        await queryClient.invalidateQueries(
          trpc.repairOutcome.getByDiagnosticEvent.queryFilter({
            diagnosticEventId,
          }),
        );
      },
      onError: (error) => {
        setFormError(
          error instanceof Error ? error.message : "Failed to record outcome",
        );
      },
    }),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const invoiceCents = invoiceAmount.trim()
      ? Math.round(parseFloat(invoiceAmount) * 100)
      : undefined;
    createMutation.mutate({
      diagnosticEventId,
      outcomeStatus: outcomeStatus as
        | "repaired"
        | "partially_repaired"
        | "deferred"
        | "not_repaired"
        | "still_investigating",
      shopName: shopName.trim() || undefined,
      invoiceAmountCents: invoiceCents,
      notes: notes.trim() || undefined,
    });
  }

  const existingOutcomes = outcomes.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Repair Outcome</h3>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Record Outcome"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">
                  Outcome Status
                </label>
                <Select
                  value={outcomeStatus}
                  onValueChange={(val) => {
                    if (val !== null) setOutcomeStatus(val);
                  }}
                >
                  <SelectTrigger className="h-10 w-full rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTCOME_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">
                  Shop Name
                </label>
                <Input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">
                  Invoice Amount (USD)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  placeholder="e.g. 450.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm dark:bg-input/30"
                  placeholder="Optional notes..."
                />
              </div>
              {formError && (
                <p className="text-xs text-destructive">{formError}</p>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Saving..." : "Save Outcome"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {existingOutcomes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No repair outcomes recorded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {existingOutcomes.map((outcome) => (
            <Card key={outcome.id} size="sm">
              <CardContent className="grid grid-cols-2 gap-2 py-3 text-xs sm:grid-cols-4">
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium capitalize">
                    {outcome.outcomeStatus.replace(/_/g, " ")}
                  </p>
                </div>
                {outcome.shopName && (
                  <div>
                    <span className="text-muted-foreground">Shop</span>
                    <p className="font-medium">{outcome.shopName}</p>
                  </div>
                )}
                {outcome.invoiceAmountCents !== null && (
                  <div>
                    <span className="text-muted-foreground">Invoice</span>
                    <p className="font-medium">
                      ${(outcome.invoiceAmountCents / 100).toFixed(2)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Recorded</span>
                  <p className="font-medium">
                    {new Date(outcome.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {outcome.notes && (
                  <div className="col-span-2 sm:col-span-4">
                    <span className="text-muted-foreground">Notes</span>
                    <p className="text-muted-foreground">{outcome.notes}</p>
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResultsDetail({
  diagnosticEventId,
}: {
  diagnosticEventId: number;
}) {
  const [generating, setGenerating] = useState(false);
  const [estimateRegion, setEstimateRegion] = useState("us-ca-bay-area");

  const recommendations = useQuery(
    trpc.recommendations.listByDiagnosticEvent.queryOptions({
      diagnosticEventId,
    }),
  );

  const likelyCauses = useQuery({
    ...trpc.recommendations.likelyCauses.queryOptions({ diagnosticEventId }),
    retry: false,
  });
  const feedback = useQuery(
    trpc.feedback.listByDiagnosticEvent.queryOptions({
      diagnosticEventId,
    }),
  );
  const diyGuide = useQuery({
    ...trpc.recommendations.diyGuide.queryOptions({ diagnosticEventId }),
    retry: false,
  });
  const estimates = useQuery(
    trpc.estimates.listByDiagnosticEvent.queryOptions({
      diagnosticEventId,
    }),
  );

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
  const feedbackMutation = useMutation(
    trpc.feedback.createOrUpdate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.feedback.listByDiagnosticEvent.queryFilter({
            diagnosticEventId,
          }),
        );
      },
    }),
  );
  const generateEstimateMutation = useMutation(
    trpc.estimates.generateForDiagnosticEvent.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.estimates.listByDiagnosticEvent.queryFilter({
            diagnosticEventId,
          }),
        );
      },
    }),
  );

  const activeRecs = (recommendations.data ?? []).filter((r) => r.isActive);
  const feedbackByRecommendationId = new Map(
    (feedback.data ?? [])
      .filter((item) => item.recommendationId !== null)
      .map((item) => [item.recommendationId as number, item]),
  );
  const firstRec = activeRecs[0];
  const latestEstimate = (estimates.data ?? [])[0] ?? null;
  const negotiationScript = useQuery({
    ...trpc.estimates.negotiationScript.queryOptions({
      estimateId: latestEstimate?.id ?? 0,
    }),
    enabled: latestEstimate !== null,
    retry: false,
  });

  const dtcFromDetails = firstRec?.details
    ? getString(firstRec.details as Record<string, unknown>, "dtcCode")
    : null;

  const isLikelyCausesProLocked =
    likelyCauses.isError &&
    extractBusinessCode(likelyCauses.error) === "PRO_UPGRADE_REQUIRED";
  const isDiyProLocked =
    diyGuide.isError &&
    extractBusinessCode(diyGuide.error) === "PRO_UPGRADE_REQUIRED";
  const isEstimateProLocked =
    (estimates.isError &&
      extractBusinessCode(estimates.error) === "PRO_UPGRADE_REQUIRED") ||
    (generateEstimateMutation.isError &&
      extractBusinessCode(generateEstimateMutation.error) ===
        "PRO_UPGRADE_REQUIRED");
  const isNegotiationProLocked =
    negotiationScript.isError &&
    extractBusinessCode(negotiationScript.error) === "PRO_UPGRADE_REQUIRED";

  function handleGenerate() {
    setGenerating(true);
    generateMutation.mutate({ diagnosticEventId, mode: "basic" });
  }

  return (
    <PageTransition>
      <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        {/* Back nav */}
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

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3"
        >
          <span className="font-mono text-3xl font-bold tracking-wider">
            {dtcFromDetails ?? `Event #${diagnosticEventId}`}
          </span>
          {firstRec && (
            <div className="flex gap-2">
              <Badge variant={getSeverityVariant(firstRec.urgency)}>
                {firstRec.urgency}
              </Badge>
              {firstRec.triageClass && (
                <Badge variant={getTriageVariant(firstRec.triageClass)}>
                  {TRIAGE_LABELS[firstRec.triageClass] ?? firstRec.triageClass}
                </Badge>
              )}
            </div>
          )}
        </motion.div>

        {/* Tabs Layout */}
        <Tabs defaultValue="analysis">
          <TabsList
            variant="line"
            className="w-full justify-start overflow-x-auto"
          >
            <TabsTrigger value="analysis" className="gap-1.5">
              <Brain className="size-3.5" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="causes" className="gap-1.5">
              <Search className="size-3.5" />
              Causes
            </TabsTrigger>
            <TabsTrigger value="diy" className="gap-1.5">
              <Wrench className="size-3.5" />
              DIY
            </TabsTrigger>
            <TabsTrigger value="estimate" className="gap-1.5">
              <DollarSign className="size-3.5" />
              Estimate
            </TabsTrigger>
            <TabsTrigger value="outcome" className="gap-1.5">
              <MessageSquare className="size-3.5" />
              Outcome
            </TabsTrigger>
          </TabsList>

          {/* ── Analysis Tab ── */}
          <TabsContent value="analysis" className="space-y-4 pt-4">
            {recommendations.isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-32 animate-pulse rounded-2xl bg-muted"
                  />
                ))}
              </div>
            ) : activeRecs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <Brain className="mb-3 size-10 text-muted-foreground/50" />
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
                    <p className="mt-2 text-xs text-destructive">
                      {generateMutation.error instanceof Error
                        ? generateMutation.error.message
                        : "Generation failed. Please try again."}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {activeRecs.map((rec) => (
                  <motion.div key={rec.id} variants={fadeUp}>
                    <RecommendationCard
                      rec={rec}
                      currentRating={
                        feedbackByRecommendationId.get(rec.id)?.rating ?? null
                      }
                      isSaving={feedbackMutation.isPending}
                      onRateHelpful={() =>
                        feedbackMutation.mutate({
                          recommendationId: rec.id,
                          diagnosticEventId,
                          rating: 5,
                          outcome: "helpful",
                        })
                      }
                      onRateNotHelpful={() =>
                        feedbackMutation.mutate({
                          recommendationId: rec.id,
                          diagnosticEventId,
                          rating: 2,
                          outcome: "not_helpful",
                        })
                      }
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          {/* ── Causes Tab ── */}
          <TabsContent value="causes" className="pt-4">
            {likelyCauses.isLoading ? (
              <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            ) : isLikelyCausesProLocked ? (
              <ProLockOverlay message="Upgrade to Pro to see ranked likely causes with confidence scores." />
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
          </TabsContent>

          {/* ── DIY Tab ── */}
          <TabsContent value="diy" className="pt-4">
            {diyGuide.isLoading ? (
              <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            ) : isDiyProLocked ? (
              <ProLockOverlay message="Upgrade to Pro to access structured DIY guides with safety checks." />
            ) : diyGuide.data?.guide ? (
              <Card>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{diyGuide.data.guide.title}</p>
                    <div className="flex gap-2">
                      <Badge variant="default">
                        {diyGuide.data.guide.estimatedMinutes} min
                      </Badge>
                      <Badge
                        variant={
                          diyGuide.data.guide.difficulty === "easy"
                            ? "easy"
                            : diyGuide.data.guide.difficulty === "moderate"
                              ? "moderate"
                              : "hard"
                        }
                      >
                        {diyGuide.data.guide.difficulty}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold">Tools</p>
                    <p className="text-xs text-muted-foreground">
                      {diyGuide.data.guide.tools.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold">Parts</p>
                    <p className="text-xs text-muted-foreground">
                      {diyGuide.data.guide.parts.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold">
                      Safety Warnings
                    </p>
                    <ul className="space-y-1">
                      {diyGuide.data.guide.safetyWarnings.map(
                        (warning, index) => (
                          <li
                            key={index}
                            className="text-xs text-muted-foreground"
                          >
                            · {warning}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold">Steps</p>
                    <ol className="space-y-1">
                      {diyGuide.data.guide.steps.map((step, index) => (
                        <li
                          key={index}
                          className="text-xs text-muted-foreground"
                        >
                          {index + 1}. {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <Link
                    href={`/diy/${diagnosticEventId}` as never}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    View Full Step-by-Step Guide →
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">
                No approved DIY guide is currently available for this code.
              </p>
            )}
          </TabsContent>

          {/* ── Estimate Tab ── */}
          <TabsContent value="estimate" className="space-y-4 pt-4">
            {isEstimateProLocked ? (
              <ProLockOverlay message="Upgrade to Pro to generate estimate ranges and disclosures." />
            ) : (
              <Card>
                <CardContent className="space-y-3 py-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[160px]">
                      <label className="mb-1 block text-xs text-muted-foreground">
                        Region basis
                      </label>
                      <Input
                        value={estimateRegion}
                        onChange={(event) =>
                          setEstimateRegion(event.target.value)
                        }
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        generateEstimateMutation.mutate({
                          diagnosticEventId,
                          region: estimateRegion,
                        })
                      }
                      disabled={generateEstimateMutation.isPending}
                    >
                      {generateEstimateMutation.isPending
                        ? "Generating..."
                        : "Generate Estimate"}
                    </Button>
                  </div>

                  {latestEstimate ? (
                    <div className="space-y-3">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="text-2xl font-bold text-foreground">
                          $
                          {(
                            (latestEstimate.laborLowCents +
                              latestEstimate.partsLowCents) /
                            100
                          ).toFixed(0)}{" "}
                          – $
                          {(
                            (latestEstimate.laborHighCents +
                              latestEstimate.partsHighCents) /
                            100
                          ).toFixed(0)}
                        </p>
                        <p>
                          Labor: $
                          {(latestEstimate.laborLowCents / 100).toFixed(0)} – $
                          {(latestEstimate.laborHighCents / 100).toFixed(0)}
                        </p>
                        <p>
                          Parts: $
                          {(latestEstimate.partsLowCents / 100).toFixed(0)} – $
                          {(latestEstimate.partsHighCents / 100).toFixed(0)}
                        </p>
                        <p>Region: {latestEstimate.region}</p>
                      </div>
                      {/* CMP-003: Estimate disclosure */}
                      <div className="rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
                        <p className="mb-1 font-semibold text-foreground">
                          Estimate Disclosure (CMP-003)
                        </p>
                        <p>
                          <span className="font-medium">Geography basis: </span>
                          {latestEstimate.disclosure?.geographyBasis ??
                            latestEstimate.region}
                        </p>
                        {(latestEstimate.disclosure?.assumptions.length ?? 0) >
                          0 && (
                          <div className="mt-1">
                            <span className="font-medium">Assumptions: </span>
                            {latestEstimate.disclosure!.assumptions.join("; ")}
                          </div>
                        )}
                        {(latestEstimate.disclosure?.exclusions.length ?? 0) >
                          0 && (
                          <div className="mt-1">
                            <span className="font-medium">Exclusions: </span>
                            {latestEstimate.disclosure!.exclusions.join("; ")}
                          </div>
                        )}
                        <p className="mt-1 italic">
                          This estimate is for informational purposes only and
                          may vary based on actual parts, labor rates, and
                          vehicle condition. Consult a licensed mechanic for an
                          accurate diagnosis and quote.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No estimate generated for this diagnostic event yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Negotiation Script */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Negotiation Script</h3>
              {isNegotiationProLocked ? (
                <p className="text-sm text-muted-foreground">
                  Upgrade to Pro to unlock negotiation script guidance.
                </p>
              ) : negotiationScript.isLoading ? (
                <div className="h-24 animate-pulse rounded-2xl bg-muted" />
              ) : negotiationScript.data ? (
                <Card>
                  <CardContent className="space-y-3 py-4">
                    <p className="font-medium">
                      {negotiationScript.data.headline}
                    </p>
                    <div>
                      <p className="mb-1 text-xs font-semibold">
                        Questions to Ask
                      </p>
                      <ol className="space-y-1">
                        {negotiationScript.data.keyQuestions.map(
                          (question, index) => (
                            <li
                              key={index}
                              className="text-xs text-muted-foreground"
                            >
                              {index + 1}. {question}
                            </li>
                          ),
                        )}
                      </ol>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold">Cost Anchors</p>
                      <ul className="space-y-1">
                        {negotiationScript.data.costAnchors.map(
                          (anchor, index) => (
                            <li
                              key={index}
                              className="text-xs text-muted-foreground"
                            >
                              · {anchor}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {negotiationScript.data.closingPrompt}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Generate an estimate first to build a negotiation script.
                </p>
              )}
            </div>
          </TabsContent>

          {/* ── Outcome Tab ── */}
          <TabsContent value="outcome" className="pt-4">
            <RepairOutcomeSection diagnosticEventId={diagnosticEventId} />
          </TabsContent>
        </Tabs>

        {/* Compliance disclaimer (CMP-002) */}
        <div className="rounded-2xl border border-dashed px-4 py-3 text-xs text-muted-foreground">
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
    </PageTransition>
  );
}
