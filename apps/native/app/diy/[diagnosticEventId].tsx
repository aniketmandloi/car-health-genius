import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Spinner } from "heroui-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { Container } from "@/components/container";
import { trpc } from "@/utils/trpc";

const TEAL = "#06B6D4";
const SLATE_400 = "#94A3B8";
const SLATE_500 = "#64748B";
const AMBER = "#F59E0B";

function difficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "beginner":
    case "easy":
      return "#10B981";
    case "intermediate":
    case "medium":
    case "moderate":
      return "#F59E0B";
    case "advanced":
    case "hard":
      return "#EF4444";
    default:
      return "#64748B";
  }
}

export default function DiyGuideScreen() {
  const { diagnosticEventId: rawId } = useLocalSearchParams<{
    diagnosticEventId: string;
  }>();
  const router = useRouter();
  const diagnosticEventId = parseInt(rawId ?? "0", 10);

  const guideQuery = useQuery(
    trpc.recommendations.diyGuide.queryOptions({ diagnosticEventId }),
  );

  if (guideQuery.isLoading) {
    return (
      <Container>
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
        </View>
      </Container>
    );
  }

  const guide = guideQuery.data?.guide;

  return (
    <Container>
      <ScrollView contentContainerClassName="p-4 gap-4">
        {/* Header */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: TEAL, fontSize: 13 }}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View>
          <Text className="text-foreground text-2xl font-bold">
            DIY Repair Guide
          </Text>
          <Text style={{ color: SLATE_400, fontSize: 12, marginTop: 4 }}>
            Step-by-step instructions (Pro feature)
          </Text>
        </View>

        {!guide ? (
          <Card className="items-center p-8 rounded-2xl border border-surface-border">
            <Text className="text-foreground font-medium">
              No DIY guide available
            </Text>
            <Text
              style={{
                color: SLATE_400,
                fontSize: 12,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              A guide hasn&apos;t been published for this fault code yet.
            </Text>
          </Card>
        ) : (
          <>
            {/* Overview Card */}
            <Card className="p-4 rounded-2xl border border-surface-border">
              <Text className="text-foreground font-bold text-base">
                {guide.title}
              </Text>
              <Text
                style={{
                  color: SLATE_500,
                  fontFamily: "monospace",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {guide.dtcCode}
              </Text>
              <View className="flex-row gap-3 mt-2 items-center">
                <View
                  style={{
                    backgroundColor: `${difficultyColor(guide.difficulty)}20`,
                  }}
                  className="rounded-full px-2 py-0.5"
                >
                  <Text
                    style={{
                      color: difficultyColor(guide.difficulty),
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {guide.difficulty}
                  </Text>
                </View>
                <Text style={{ color: SLATE_400, fontSize: 12 }}>
                  ~{guide.estimatedMinutes} min
                </Text>
              </View>
            </Card>

            {/* Safety Warnings */}
            {guide.safetyWarnings.length > 0 && (
              <Card
                className="p-4 rounded-2xl"
                style={{ borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" }}
              >
                <Text
                  style={{
                    color: AMBER,
                    fontSize: 14,
                    fontWeight: "700",
                    marginBottom: 8,
                  }}
                >
                  Safety Warnings
                </Text>
                {guide.safetyWarnings.map((warning, idx) => (
                  <Text
                    key={idx}
                    style={{ color: SLATE_400, fontSize: 12, marginBottom: 4 }}
                  >
                    • {warning}
                  </Text>
                ))}
              </Card>
            )}

            {/* Tools & Parts */}
            <View className="flex-row gap-3">
              {guide.tools.length > 0 && (
                <Card className="flex-1 p-4 rounded-2xl border border-surface-border">
                  <Text className="text-foreground font-semibold text-xs mb-2">
                    Tools Required
                  </Text>
                  {guide.tools.map((tool, idx) => (
                    <Text
                      key={idx}
                      style={{
                        color: SLATE_400,
                        fontSize: 12,
                        marginBottom: 3,
                      }}
                    >
                      {tool}
                    </Text>
                  ))}
                </Card>
              )}

              {guide.parts.length > 0 && (
                <Card className="flex-1 p-4 rounded-2xl border border-surface-border">
                  <Text className="text-foreground font-semibold text-xs mb-2">
                    Parts Needed
                  </Text>
                  {guide.parts.map((part, idx) => (
                    <Text
                      key={idx}
                      style={{
                        color: SLATE_400,
                        fontSize: 12,
                        marginBottom: 3,
                      }}
                    >
                      {part}
                    </Text>
                  ))}
                </Card>
              )}
            </View>

            {/* Steps */}
            {guide.steps.length > 0 && (
              <Card className="p-4 rounded-2xl border border-surface-border">
                <Text className="text-foreground font-bold text-sm mb-3">
                  Step-by-Step Instructions
                </Text>
                {guide.steps.map((step, idx) => (
                  <View key={idx} className="flex-row gap-3 mb-3">
                    <View
                      style={{ backgroundColor: TEAL }}
                      className="h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    >
                      <Text className="text-white text-xs font-bold">
                        {idx + 1}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: SLATE_400,
                        fontSize: 12,
                        flex: 1,
                        lineHeight: 18,
                      }}
                    >
                      {step}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Disclaimer */}
            <Text
              style={{ color: SLATE_500, fontSize: 11, fontStyle: "italic" }}
            >
              This guide is for informational purposes only. If unsure about any
              step, consult a licensed mechanic. Improper repairs can cause
              vehicle damage or safety hazards.
            </Text>
          </>
        )}
      </ScrollView>
    </Container>
  );
}
