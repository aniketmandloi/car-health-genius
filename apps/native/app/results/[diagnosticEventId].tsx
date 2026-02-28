import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, Chip, Spinner } from "heroui-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";
import { queryClient, trpc } from "@/utils/trpc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSeverityColor(
  severity: string,
): "success" | "warning" | "danger" | "default" {
  switch (severity) {
    case "critical":
    case "high":
      return "danger";
    case "medium":
      return "warning";
    case "low":
      return "success";
    default:
      return "default";
  }
}

function getTriageLabel(triageClass: string | null): string {
  switch (triageClass) {
    case "safe":
      return "Safe to Drive";
    case "service_soon":
      return "Service Soon";
    case "service_now":
      return "Service Now";
    default:
      return "Unknown";
  }
}

function getTriageColor(
  triageClass: string | null,
): "success" | "warning" | "danger" | "default" {
  switch (triageClass) {
    case "safe":
      return "success";
    case "service_soon":
      return "warning";
    case "service_now":
      return "danger";
    default:
      return "default";
  }
}

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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ResultsDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ diagnosticEventId: string }>();
  const diagnosticEventId = Number.parseInt(
    params.diagnosticEventId ?? "0",
    10,
  );

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [estimateRegion] = useState("us-ca-bay-area");

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
      onError: (error) => {
        setGenerating(false);
        const code = extractBusinessCode(error);
        setGenerateError(
          code === "AI_EXPLANATIONS_DISABLED"
            ? "AI explanations are currently disabled."
            : error instanceof Error
              ? error.message
              : "Generation failed.",
        );
      },
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

  const isProLocked =
    likelyCauses.isError &&
    extractBusinessCode(likelyCauses.error) === "PRO_UPGRADE_REQUIRED";
  const isDiyProLocked =
    diyGuide.isError && extractBusinessCode(diyGuide.error) === "PRO_UPGRADE_REQUIRED";
  const isEstimateProLocked =
    (estimates.isError && extractBusinessCode(estimates.error) === "PRO_UPGRADE_REQUIRED") ||
    (generateEstimateMutation.isError &&
      extractBusinessCode(generateEstimateMutation.error) === "PRO_UPGRADE_REQUIRED");
  const isNegotiationProLocked =
    negotiationScript.isError && extractBusinessCode(negotiationScript.error) === "PRO_UPGRADE_REQUIRED";

  function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    generateMutation.mutate({ diagnosticEventId, mode: "basic" });
  }

  return (
    <Container>
      <ScrollView contentContainerClassName="p-4 gap-5">
        {/* Back */}
        <Button
          variant="ghost"
          onPress={() => router.back()}
          className="self-start"
        >
          ← Back
        </Button>

        {/* Header */}
        <View className="flex-row items-center gap-3">
          {firstRec ? (
            <>
              <Text className="text-foreground font-mono text-2xl font-bold">
                {firstRec.title}
              </Text>
              <Chip
                variant="secondary"
                color={getSeverityColor(firstRec.urgency)}
                size="sm"
              >
                <Chip.Label>{firstRec.urgency}</Chip.Label>
              </Chip>
            </>
          ) : (
            <Text className="text-foreground font-mono text-2xl font-bold">
              Event #{diagnosticEventId}
            </Text>
          )}
        </View>

        {/* Triage card */}
        {firstRec && (
          <Card className="p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-foreground text-sm font-semibold">
                Triage
              </Text>
              <Chip
                variant="secondary"
                color={getTriageColor(firstRec.triageClass)}
                size="sm"
              >
                <Chip.Label>{getTriageLabel(firstRec.triageClass)}</Chip.Label>
              </Chip>
            </View>
            {(() => {
              const triageDetails = getTriageDetails(firstRec.details);
              const driveability = getString(triageDetails, "driveability");
              return driveability ? (
                <Text className="text-muted mt-2 text-xs">{driveability}</Text>
              ) : null;
            })()}
          </Card>
        )}

        {/* Recommendations */}
        <View className="gap-3">
          <Text className="text-foreground text-base font-semibold">
            AI Analysis
          </Text>

          {recommendations.isLoading ? (
            <View className="items-center py-8">
              <Spinner size="lg" />
            </View>
          ) : activeRecs.length === 0 ? (
            <Card className="items-center p-6">
              <Text className="text-foreground font-medium">
                No analysis yet
              </Text>
              <Text className="text-muted mt-1 text-xs text-center">
                Generate an AI-powered explanation for this code.
              </Text>
              {generateError && (
                <Text className="mt-2 text-xs text-red-500">
                  {generateError}
                </Text>
              )}
              <Button
                className="mt-4"
                onPress={handleGenerate}
                isDisabled={generating || generateMutation.isPending}
              >
                {generating || generateMutation.isPending ? (
                  <Spinner size="sm" color="default" />
                ) : (
                  "Generate Explanation"
                )}
              </Button>
            </Card>
          ) : (
            activeRecs.map((rec) => {
              const evidence = getStringList(rec.details, "evidence");
              const nextSteps = getStringList(rec.details, "nextSteps");
              const limitations = getStringList(rec.details, "limitations");

              return (
                <Card key={rec.id} className="p-4">
                  <View className="gap-3">
                    {/* Title + confidence */}
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-foreground flex-1 font-medium">
                        {rec.title}
                      </Text>
                      <Text className="text-muted text-xs">
                        {rec.confidence}%
                      </Text>
                    </View>

                    {/* Confidence bar */}
                    <View className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <View
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${rec.confidence}%` }}
                      />
                    </View>

                    {/* Rationale */}
                    <Text className="text-muted text-sm">{rec.rationale}</Text>

                    {/* Evidence */}
                    {evidence.length > 0 && (
                      <View className="gap-1">
                        <Text className="text-foreground text-xs font-semibold">
                          Evidence
                        </Text>
                        {evidence.map((item, i) => (
                          <Text key={i} className="text-muted text-xs">
                            · {item}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Next steps */}
                    {nextSteps.length > 0 && (
                      <View className="gap-1">
                        <Text className="text-foreground text-xs font-semibold">
                          Recommended Steps
                        </Text>
                        {nextSteps.map((step, i) => (
                          <Text key={i} className="text-muted text-xs">
                            {i + 1}. {step}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Limitations */}
                    {limitations.length > 0 && (
                      <View className="rounded border border-dashed p-2">
                        <Text className="text-muted text-xs font-semibold">
                          Limitations
                        </Text>
                        {limitations.map((item, i) => (
                          <Text key={i} className="text-muted text-xs">
                            {item}
                          </Text>
                        ))}
                      </View>
                    )}

                    <View className="rounded border border-dashed p-2">
                      <Text className="text-muted text-xs font-semibold">
                        Was this recommendation helpful?
                      </Text>
                      <View className="mt-2 flex-row gap-2">
                        <Button
                          variant={
                            (feedbackByRecommendationId.get(rec.id)?.rating ?? 0) >= 4
                              ? "primary"
                              : "secondary"
                          }
                          size="sm"
                          isDisabled={feedbackMutation.isPending}
                          onPress={() =>
                            feedbackMutation.mutate({
                              recommendationId: rec.id,
                              diagnosticEventId,
                              rating: 5,
                              outcome: "helpful",
                            })
                          }
                        >
                          Helpful
                        </Button>
                        <Button
                          variant={
                            (feedbackByRecommendationId.get(rec.id)?.rating ?? 0) > 0 &&
                            (feedbackByRecommendationId.get(rec.id)?.rating ?? 0) <= 3
                              ? "primary"
                              : "secondary"
                          }
                          size="sm"
                          isDisabled={feedbackMutation.isPending}
                          onPress={() =>
                            feedbackMutation.mutate({
                              recommendationId: rec.id,
                              diagnosticEventId,
                              rating: 2,
                              outcome: "not_helpful",
                            })
                          }
                        >
                          Not helpful
                        </Button>
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {/* Likely Causes (Pro-gated) */}
        <View className="gap-3">
          <Text className="text-foreground text-base font-semibold">
            Likely Causes
          </Text>

          {likelyCauses.isLoading ? (
            <View className="items-center py-4">
              <Spinner size="sm" />
            </View>
          ) : isProLocked ? (
            <Card className="items-center p-6">
              <Text className="text-foreground font-semibold">Pro Feature</Text>
              <Text className="text-muted mt-1 text-xs text-center">
                Upgrade to Pro to see ranked likely causes with confidence
                scores.
              </Text>
            </Card>
          ) : likelyCauses.data ? (
            <Card className="p-4">
              <View className="gap-4">
                {likelyCauses.data.causes.map((cause) => (
                  <View key={cause.rank} className="gap-1.5">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-foreground flex-1 text-sm font-medium">
                        {cause.rank}. {cause.title}
                      </Text>
                      <Text className="text-muted text-xs">
                        {cause.confidence}%
                      </Text>
                    </View>
                    <View className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <View
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${cause.confidence}%` }}
                      />
                    </View>
                    {cause.evidence.length > 0 && (
                      <Text className="text-muted text-xs">
                        {cause.evidence.join(", ")}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </Card>
          ) : null}
        </View>

        <View className="gap-3">
          <Text className="text-foreground text-base font-semibold">
            DIY Guide
          </Text>

          {diyGuide.isLoading ? (
            <View className="items-center py-4">
              <Spinner size="sm" />
            </View>
          ) : isDiyProLocked ? (
            <Card className="items-center p-6">
              <Text className="text-foreground font-semibold">Pro Feature</Text>
              <Text className="text-muted mt-1 text-xs text-center">
                Upgrade to Pro to access structured DIY guides.
              </Text>
            </Card>
          ) : diyGuide.data?.guide ? (
            <Card className="p-4">
              <View className="gap-2">
                <Text className="text-foreground text-sm font-semibold">
                  {diyGuide.data.guide.title}
                </Text>
                <Text className="text-muted text-xs">
                  {diyGuide.data.guide.estimatedMinutes} min ·{" "}
                  {diyGuide.data.guide.difficulty}
                </Text>
                <Text className="text-muted text-xs">
                  Tools: {diyGuide.data.guide.tools.join(", ")}
                </Text>
                <Text className="text-muted text-xs">
                  Parts: {diyGuide.data.guide.parts.join(", ")}
                </Text>
                {diyGuide.data.guide.safetyWarnings.length > 0 && (
                  <View className="gap-1">
                    <Text className="text-foreground text-xs font-semibold">
                      Safety Warnings
                    </Text>
                    {diyGuide.data.guide.safetyWarnings.map((warning, index) => (
                      <Text key={index} className="text-muted text-xs">
                        • {warning}
                      </Text>
                    ))}
                  </View>
                )}
                {diyGuide.data.guide.steps.length > 0 && (
                  <View className="gap-1">
                    <Text className="text-foreground text-xs font-semibold">
                      Steps
                    </Text>
                    {diyGuide.data.guide.steps.map((step, index) => (
                      <Text key={index} className="text-muted text-xs">
                        {index + 1}. {step}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </Card>
          ) : (
            <Text className="text-muted text-xs">
              No approved DIY guide is currently available for this code.
            </Text>
          )}
        </View>

        <View className="gap-3">
          <Text className="text-foreground text-base font-semibold">
            Cost Estimate
          </Text>

          {isEstimateProLocked ? (
            <Card className="items-center p-6">
              <Text className="text-foreground font-semibold">Pro Feature</Text>
              <Text className="text-muted mt-1 text-xs text-center">
                Upgrade to Pro to generate estimates.
              </Text>
            </Card>
          ) : (
            <Card className="p-4">
              <View className="gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  isDisabled={generateEstimateMutation.isPending}
                  onPress={() =>
                    generateEstimateMutation.mutate({
                      diagnosticEventId,
                      region: estimateRegion,
                    })
                  }
                >
                  {generateEstimateMutation.isPending
                    ? "Generating..."
                    : "Generate Estimate"}
                </Button>
                {latestEstimate ? (
                  <>
                    <Text className="text-muted text-xs">
                      Total: $
                      {(
                        (latestEstimate.laborLowCents +
                          latestEstimate.partsLowCents) /
                        100
                      ).toFixed(0)}{" "}
                      - $
                      {(
                        (latestEstimate.laborHighCents +
                          latestEstimate.partsHighCents) /
                        100
                      ).toFixed(0)}
                    </Text>
                    <Text className="text-muted text-xs">
                      Region: {latestEstimate.region}
                    </Text>
                    <Text className="text-muted text-xs">
                      Labor: ${(latestEstimate.laborLowCents / 100).toFixed(0)} - $
                      {(latestEstimate.laborHighCents / 100).toFixed(0)}
                    </Text>
                    <Text className="text-muted text-xs">
                      Parts: ${(latestEstimate.partsLowCents / 100).toFixed(0)} - $
                      {(latestEstimate.partsHighCents / 100).toFixed(0)}
                    </Text>
                    {latestEstimate.disclosure && (
                      <>
                        <Text className="text-muted text-xs">
                          Geography basis: {latestEstimate.disclosure.geographyBasis}
                        </Text>
                        {latestEstimate.disclosure.assumptions.map((item, index) => (
                          <Text key={`assumption-${index}`} className="text-muted text-xs">
                            Assumption: {item}
                          </Text>
                        ))}
                        {latestEstimate.disclosure.exclusions.map((item, index) => (
                          <Text key={index} className="text-muted text-xs">
                            Exclusion: {item}
                          </Text>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <Text className="text-muted text-xs">
                    No estimate generated for this event yet.
                  </Text>
                )}
              </View>
            </Card>
          )}
        </View>

        <View className="gap-3">
          <Text className="text-foreground text-base font-semibold">
            Negotiation Script
          </Text>

          {isNegotiationProLocked ? (
            <Text className="text-muted text-xs">
              Upgrade to Pro to unlock negotiation guidance.
            </Text>
          ) : negotiationScript.isLoading ? (
            <View className="items-center py-4">
              <Spinner size="sm" />
            </View>
          ) : negotiationScript.data ? (
            <Card className="p-4">
              <View className="gap-2">
                <Text className="text-foreground text-sm font-semibold">
                  {negotiationScript.data.headline}
                </Text>
                {negotiationScript.data.keyQuestions.map((question, index) => (
                  <Text key={index} className="text-muted text-xs">
                    {index + 1}. {question}
                  </Text>
                ))}
                {negotiationScript.data.costAnchors.map((anchor, index) => (
                  <Text key={`anchor-${index}`} className="text-muted text-xs">
                    • {anchor}
                  </Text>
                ))}
                <Text className="text-muted text-xs">
                  {negotiationScript.data.closingPrompt}
                </Text>
              </View>
            </Card>
          ) : (
            <Text className="text-muted text-xs">
              Generate an estimate first to build the script.
            </Text>
          )}
        </View>

        {/* Disclaimer */}
        <View className="rounded border border-dashed p-3">
          <Text className="text-muted text-xs font-semibold">
            Disclaimer (CMP-002)
          </Text>
          <Text className="text-muted mt-1 text-xs">
            Car Health Genius provides AI-generated diagnostic information for
            educational purposes only. Always consult a licensed mechanic before
            making vehicle repairs.
          </Text>
        </View>
      </ScrollView>
    </Container>
  );
}
