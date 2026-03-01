import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Spinner } from "heroui-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { Container } from "@/components/container";
import { trpc } from "@/utils/trpc";

function difficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "beginner":
    case "easy":
      return "#16a34a";
    case "intermediate":
    case "medium":
      return "#ca8a04";
    case "advanced":
    case "hard":
      return "#dc2626";
    default:
      return "#6b7280";
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
            <Text className="text-primary text-sm">← Back</Text>
          </TouchableOpacity>
        </View>

        <View>
          <Text className="text-foreground text-2xl font-bold">
            DIY Repair Guide
          </Text>
          <Text className="text-muted mt-1 text-xs">
            Step-by-step instructions (Pro feature)
          </Text>
        </View>

        {!guide ? (
          <Card className="items-center p-8">
            <Text className="text-foreground font-medium">
              No DIY guide available
            </Text>
            <Text className="text-muted mt-1 text-xs text-center">
              A guide hasn&apos;t been published for this fault code yet.
            </Text>
          </Card>
        ) : (
          <>
            {/* Overview Card */}
            <Card className="p-4">
              <Text className="text-foreground font-semibold text-base">
                {guide.title}
              </Text>
              <Text className="text-muted font-mono text-xs mt-0.5">
                {guide.dtcCode}
              </Text>
              <View className="flex-row gap-2 mt-2">
                <Text
                  style={{
                    color: difficultyColor(guide.difficulty),
                    fontSize: 11,
                    fontWeight: "600",
                  }}
                >
                  {guide.difficulty}
                </Text>
                <Text className="text-muted text-xs">·</Text>
                <Text className="text-muted text-xs">
                  ~{guide.estimatedMinutes} min
                </Text>
              </View>
            </Card>

            {/* Safety Warnings */}
            {guide.safetyWarnings.length > 0 && (
              <Card className="border border-orange-300 p-4">
                <Text
                  className="font-semibold text-sm mb-2"
                  style={{ color: "#c2410c" }}
                >
                  ⚠ Safety Warnings
                </Text>
                {guide.safetyWarnings.map((warning, idx) => (
                  <Text key={idx} className="text-muted text-xs mb-1">
                    • {warning}
                  </Text>
                ))}
              </Card>
            )}

            {/* Tools & Parts */}
            <View className="flex-row gap-3">
              {guide.tools.length > 0 && (
                <Card className="flex-1 p-4">
                  <Text className="text-foreground font-semibold text-xs mb-2">
                    Tools Required
                  </Text>
                  {guide.tools.map((tool, idx) => (
                    <Text key={idx} className="text-muted text-xs mb-1">
                      🔧 {tool}
                    </Text>
                  ))}
                </Card>
              )}

              {guide.parts.length > 0 && (
                <Card className="flex-1 p-4">
                  <Text className="text-foreground font-semibold text-xs mb-2">
                    Parts Needed
                  </Text>
                  {guide.parts.map((part, idx) => (
                    <Text key={idx} className="text-muted text-xs mb-1">
                      📦 {part}
                    </Text>
                  ))}
                </Card>
              )}
            </View>

            {/* Steps */}
            {guide.steps.length > 0 && (
              <Card className="p-4">
                <Text className="text-foreground font-semibold text-sm mb-3">
                  Step-by-Step Instructions
                </Text>
                {guide.steps.map((step, idx) => (
                  <View key={idx} className="flex-row gap-3 mb-3">
                    <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary">
                      <Text className="text-white text-xs font-bold">
                        {idx + 1}
                      </Text>
                    </View>
                    <Text className="text-muted text-xs leading-relaxed flex-1">
                      {step}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Disclaimer */}
            <Text className="text-muted text-xs italic">
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
