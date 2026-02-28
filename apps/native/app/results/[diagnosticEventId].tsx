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

  const activeRecs = (recommendations.data ?? []).filter((r) => r.isActive);
  const firstRec = activeRecs[0];

  const isProLocked =
    likelyCauses.isError &&
    extractBusinessCode(likelyCauses.error) === "ENTITLEMENT_REQUIRED";

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
