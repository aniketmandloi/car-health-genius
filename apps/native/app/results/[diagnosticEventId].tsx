import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { SectionHeader } from "@/components/ui/section-header";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useAppTheme } from "@/contexts/app-theme-context";
import { queryClient, trpc } from "@/utils/trpc";

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

function ProLockedCard({ feature }: { feature: string }) {
  const { colors } = useAppTheme();
  const router = useRouter();

  return (
    <Card variant="outlined" style={{ borderColor: `${colors.secondary}33` }}>
      <View className="items-center gap-2 py-2">
        <Ionicons name="lock-closed" size={22} color={colors.secondary} />
        <Text
          style={{ color: colors.secondary, fontSize: 14, fontWeight: "700" }}
        >
          Pro Feature
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12,
            textAlign: "center",
          }}
        >
          Upgrade to Pro to {feature}.
        </Text>
        <Button
          variant="outline"
          size="sm"
          onPress={() => router.push("/(tabs)/pricing" as never)}
          style={{ marginTop: 4 }}
        >
          Upgrade
        </Button>
      </View>
    </Card>
  );
}

export default function ResultsDetailScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ diagnosticEventId: string }>();
  const diagnosticEventId = Number.parseInt(
    params.diagnosticEventId ?? "0",
    10,
  );

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [estimateRegion] = useState("us-ca-bay-area");
  const [showDisclaimer, setShowDisclaimer] = useState(false);

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
    trpc.feedback.listByDiagnosticEvent.queryOptions({ diagnosticEventId }),
  );
  const diyGuide = useQuery({
    ...trpc.recommendations.diyGuide.queryOptions({ diagnosticEventId }),
    retry: false,
  });
  const estimates = useQuery(
    trpc.estimates.listByDiagnosticEvent.queryOptions({ diagnosticEventId }),
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
    setGenerateError(null);
    generateMutation.mutate({ diagnosticEventId, mode: "basic" });
  }

  return (
    <Container className="p-4">
      <View className="gap-5">
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <View className="flex-row items-center gap-3">
            {firstRec ? (
              <>
                <Text
                  style={{
                    fontFamily: "monospace",
                    fontSize: 22,
                    fontWeight: "800",
                    color: colors.text,
                    flex: 1,
                  }}
                >
                  {firstRec.title}
                </Text>
                <Chip color={getSeverityColor(firstRec.urgency)}>
                  {firstRec.urgency}
                </Chip>
              </>
            ) : (
              <Text
                style={{
                  fontFamily: "monospace",
                  fontSize: 22,
                  fontWeight: "800",
                  color: colors.text,
                }}
              >
                Event #{diagnosticEventId}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Triage card */}
        {firstRec && (
          <Animated.View entering={FadeInDown.duration(300).delay(50)}>
            <Card variant="default">
              <View className="flex-row items-center justify-between">
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  Triage
                </Text>
                <Chip color={getTriageColor(firstRec.triageClass)} dot>
                  {getTriageLabel(firstRec.triageClass)}
                </Chip>
              </View>
              {(() => {
                const triageDetails = getTriageDetails(firstRec.details);
                const driveability = getString(triageDetails, "driveability");
                return driveability ? (
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 12,
                      marginTop: 8,
                    }}
                  >
                    {driveability}
                  </Text>
                ) : null;
              })()}
            </Card>
          </Animated.View>
        )}

        {/* AI Analysis */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <SectionHeader title="AI Analysis" icon="sparkles-outline" />

          {recommendations.isLoading ? (
            <SkeletonCard />
          ) : activeRecs.length === 0 ? (
            <Card variant="default" className="items-center">
              <Ionicons
                name="sparkles-outline"
                size={28}
                color={colors.textMuted}
                style={{ marginBottom: 8 }}
              />
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                No analysis yet
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Generate an AI-powered explanation for this code.
              </Text>
              {generateError && (
                <Text
                  style={{ color: colors.danger, fontSize: 12, marginTop: 8 }}
                >
                  {generateError}
                </Text>
              )}
              <Button
                style={{ marginTop: 12 }}
                onPress={handleGenerate}
                isDisabled={generating || generateMutation.isPending}
                isLoading={generating || generateMutation.isPending}
              >
                Generate Explanation
              </Button>
            </Card>
          ) : (
            activeRecs.map((rec) => {
              const evidence = getStringList(rec.details, "evidence");
              const nextSteps = getStringList(rec.details, "nextSteps");
              const limitations = getStringList(rec.details, "limitations");
              const existingFeedback = feedbackByRecommendationId.get(rec.id);
              const rating = existingFeedback?.rating ?? 0;

              return (
                <Card key={rec.id} variant="default" className="gap-3">
                  {/* Title + confidence */}
                  <View className="flex-row items-center justify-between gap-2">
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "600",
                        flex: 1,
                      }}
                    >
                      {rec.title}
                    </Text>
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 13,
                        fontWeight: "700",
                      }}
                    >
                      {rec.confidence}%
                    </Text>
                  </View>

                  {/* Confidence bar — thicker */}
                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.track,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${rec.confidence}%`,
                        backgroundColor: colors.primary,
                        borderRadius: 4,
                      }}
                    />
                  </View>

                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                    {rec.rationale}
                  </Text>

                  {evidence.length > 0 && (
                    <View className="gap-1">
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Evidence
                      </Text>
                      {evidence.map((item, i) => (
                        <Text
                          key={i}
                          style={{ color: colors.textMuted, fontSize: 12 }}
                        >
                          · {item}
                        </Text>
                      ))}
                    </View>
                  )}

                  {nextSteps.length > 0 && (
                    <View className="gap-1">
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Recommended Steps
                      </Text>
                      {nextSteps.map((step, i) => (
                        <Text
                          key={i}
                          style={{ color: colors.textMuted, fontSize: 12 }}
                        >
                          {i + 1}. {step}
                        </Text>
                      ))}
                    </View>
                  )}

                  {limitations.length > 0 && (
                    <Card variant="recessed" noPadding>
                      <View style={{ padding: 10 }}>
                        <Text
                          style={{
                            color: colors.textMuted,
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          Limitations
                        </Text>
                        {limitations.map((item, i) => (
                          <Text
                            key={i}
                            style={{
                              color: colors.textSubtle,
                              fontSize: 12,
                              marginTop: 2,
                            }}
                          >
                            {item}
                          </Text>
                        ))}
                      </View>
                    </Card>
                  )}

                  {/* Feedback — thumbs up/down */}
                  <View className="flex-row items-center gap-3 pt-2">
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: 12,
                        flex: 1,
                      }}
                    >
                      Was this helpful?
                    </Text>
                    <Pressable
                      onPress={() =>
                        feedbackMutation.mutate({
                          recommendationId: rec.id,
                          diagnosticEventId,
                          rating: 5,
                          outcome: "helpful",
                        })
                      }
                      disabled={feedbackMutation.isPending}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor:
                          rating >= 4 ? `${colors.success}22` : colors.input,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="thumbs-up"
                        size={16}
                        color={rating >= 4 ? colors.success : colors.textMuted}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        feedbackMutation.mutate({
                          recommendationId: rec.id,
                          diagnosticEventId,
                          rating: 2,
                          outcome: "not_helpful",
                        })
                      }
                      disabled={feedbackMutation.isPending}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor:
                          rating > 0 && rating <= 3
                            ? `${colors.danger}22`
                            : colors.input,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="thumbs-down"
                        size={16}
                        color={
                          rating > 0 && rating <= 3
                            ? colors.danger
                            : colors.textMuted
                        }
                      />
                    </Pressable>
                  </View>
                </Card>
              );
            })
          )}
        </Animated.View>

        {/* Likely Causes */}
        <Animated.View entering={FadeInDown.duration(300).delay(150)}>
          <SectionHeader title="Likely Causes" icon="search-outline" />

          {likelyCauses.isLoading ? (
            <SkeletonCard />
          ) : isProLocked ? (
            <ProLockedCard feature="see ranked likely causes with confidence scores" />
          ) : likelyCauses.data ? (
            <Card variant="default" className="gap-4">
              {likelyCauses.data.causes.map((cause) => (
                <View key={cause.rank} className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 13,
                        fontWeight: "600",
                        flex: 1,
                      }}
                    >
                      {cause.rank}. {cause.title}
                    </Text>
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {cause.confidence}%
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.track,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${cause.confidence}%`,
                        backgroundColor: colors.primary,
                        borderRadius: 4,
                      }}
                    />
                  </View>
                  {cause.evidence.length > 0 && (
                    <Text
                      style={{ color: colors.textMuted, fontSize: 12 }}
                    >
                      {cause.evidence.join(", ")}
                    </Text>
                  )}
                </View>
              ))}
            </Card>
          ) : null}
        </Animated.View>

        {/* DIY Guide */}
        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <SectionHeader title="DIY Guide" icon="construct-outline" />

          {diyGuide.isLoading ? (
            <SkeletonCard />
          ) : isDiyProLocked ? (
            <ProLockedCard feature="access structured DIY guides" />
          ) : diyGuide.data?.guide ? (
            <Card variant="default" className="gap-2">
              <Text
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {diyGuide.data.guide.title}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {diyGuide.data.guide.estimatedMinutes} min ·{" "}
                {diyGuide.data.guide.difficulty}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Tools: {diyGuide.data.guide.tools.join(", ")}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                Parts: {diyGuide.data.guide.parts.join(", ")}
              </Text>
              {diyGuide.data.guide.safetyWarnings.length > 0 && (
                <View className="gap-1">
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    Safety Warnings
                  </Text>
                  {diyGuide.data.guide.safetyWarnings.map(
                    (warning, index) => (
                      <Text
                        key={index}
                        style={{ color: colors.warning, fontSize: 12 }}
                      >
                        • {warning}
                      </Text>
                    ),
                  )}
                </View>
              )}
              {diyGuide.data.guide.steps.length > 0 && (
                <View className="gap-1">
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    Steps
                  </Text>
                  {diyGuide.data.guide.steps.map((step, index) => (
                    <Text
                      key={index}
                      style={{ color: colors.textMuted, fontSize: 12 }}
                    >
                      {index + 1}. {step}
                    </Text>
                  ))}
                </View>
              )}
              <Button
                variant="outline"
                size="sm"
                icon="arrow-forward-outline"
                iconPosition="right"
                onPress={() =>
                  router.push(`/diy/${diagnosticEventId}` as never)
                }
                style={{ marginTop: 4 }}
              >
                View Full Guide
              </Button>
            </Card>
          ) : (
            <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
              No approved DIY guide is currently available for this code.
            </Text>
          )}
        </Animated.View>

        {/* Cost Estimate */}
        <Animated.View entering={FadeInDown.duration(300).delay(250)}>
          <SectionHeader title="Cost Estimate" icon="cash-outline" />

          {isEstimateProLocked ? (
            <ProLockedCard feature="generate cost estimates" />
          ) : (
            <Card variant="default" className="gap-3">
              <Button
                variant="secondary"
                size="sm"
                isDisabled={generateEstimateMutation.isPending}
                isLoading={generateEstimateMutation.isPending}
                onPress={() =>
                  generateEstimateMutation.mutate({
                    diagnosticEventId,
                    region: estimateRegion,
                  })
                }
              >
                Generate Estimate
              </Button>
              {latestEstimate ? (
                <>
                  {/* Clean table layout */}
                  <View
                    style={{
                      borderRadius: 10,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    {[
                      {
                        label: "Labor",
                        value: `$${(latestEstimate.laborLowCents / 100).toFixed(0)} - $${(latestEstimate.laborHighCents / 100).toFixed(0)}`,
                      },
                      {
                        label: "Parts",
                        value: `$${(latestEstimate.partsLowCents / 100).toFixed(0)} - $${(latestEstimate.partsHighCents / 100).toFixed(0)}`,
                      },
                    ].map((row, i) => (
                      <View
                        key={row.label}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text
                          style={{ color: colors.textMuted, fontSize: 13 }}
                        >
                          {row.label}
                        </Text>
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 13,
                            fontWeight: "600",
                          }}
                        >
                          {row.value}
                        </Text>
                      </View>
                    ))}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        backgroundColor: colors.surfaceRecessed,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 14,
                          fontWeight: "700",
                        }}
                      >
                        Total
                      </Text>
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: 14,
                          fontWeight: "700",
                        }}
                      >
                        $
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
                    </View>
                  </View>
                  <Text
                    style={{ color: colors.textMuted, fontSize: 11 }}
                  >
                    Region: {latestEstimate.region}
                  </Text>

                  {/* CMP-003 disclosure */}
                  <Card variant="recessed" noPadding>
                    <View style={{ padding: 10 }}>
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        Estimate Disclosure (CMP-003)
                      </Text>
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        Geography basis:{" "}
                        {latestEstimate.disclosure?.geographyBasis ??
                          latestEstimate.region}
                      </Text>
                      {latestEstimate.disclosure?.assumptions.map(
                        (item, index) => (
                          <Text
                            key={`assumption-${index}`}
                            style={{ color: colors.textMuted, fontSize: 11 }}
                          >
                            Assumption: {item}
                          </Text>
                        ),
                      )}
                      {latestEstimate.disclosure?.exclusions.map(
                        (item, index) => (
                          <Text
                            key={`exclusion-${index}`}
                            style={{ color: colors.textMuted, fontSize: 11 }}
                          >
                            Exclusion: {item}
                          </Text>
                        ),
                      )}
                      <Text
                        style={{
                          color: colors.textSubtle,
                          fontSize: 11,
                          marginTop: 4,
                          fontStyle: "italic",
                        }}
                      >
                        Estimate is for informational purposes only. Consult a
                        licensed mechanic for an accurate quote.
                      </Text>
                    </View>
                  </Card>
                </>
              ) : (
                <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                  No estimate generated for this event yet.
                </Text>
              )}
            </Card>
          )}
        </Animated.View>

        {/* Negotiation Script */}
        <Animated.View entering={FadeInDown.duration(300).delay(300)}>
          <SectionHeader
            title="Negotiation Script"
            icon="chatbubble-ellipses-outline"
          />

          {isNegotiationProLocked ? (
            <ProLockedCard feature="unlock negotiation guidance" />
          ) : negotiationScript.isLoading ? (
            <SkeletonCard />
          ) : negotiationScript.data ? (
            <Card variant="default" className="gap-2">
              <Text
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {negotiationScript.data.headline}
              </Text>
              {negotiationScript.data.keyQuestions.map((question, index) => (
                <Text
                  key={index}
                  style={{ color: colors.textMuted, fontSize: 12 }}
                >
                  {index + 1}. {question}
                </Text>
              ))}
              {negotiationScript.data.costAnchors.map((anchor, index) => (
                <Text
                  key={`anchor-${index}`}
                  style={{ color: colors.textMuted, fontSize: 12 }}
                >
                  • {anchor}
                </Text>
              ))}
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {negotiationScript.data.closingPrompt}
              </Text>
            </Card>
          ) : (
            <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
              Generate an estimate first to build the script.
            </Text>
          )}
        </Animated.View>

        {/* Disclaimer — collapsible */}
        <Animated.View entering={FadeInDown.duration(300).delay(350)}>
          <TouchableOpacity
            onPress={() => setShowDisclaimer(!showDisclaimer)}
          >
            <Card variant="recessed">
              <View className="flex-row items-center justify-between">
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  Disclaimer (CMP-002)
                </Text>
                <Ionicons
                  name={showDisclaimer ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.textMuted}
                />
              </View>
              {showDisclaimer && (
                <Text
                  style={{
                    color: colors.textSubtle,
                    fontSize: 12,
                    marginTop: 8,
                  }}
                >
                  Car Health Genius provides AI-generated diagnostic information
                  for educational purposes only. Always consult a licensed
                  mechanic before making vehicle repairs.
                </Text>
              )}
            </Card>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Container>
  );
}
