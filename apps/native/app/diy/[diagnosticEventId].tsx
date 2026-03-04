import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Container } from "@/components/container";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useAppTheme } from "@/contexts/app-theme-context";
import { TYPO } from "@/lib/design";
import { trpc } from "@/utils/trpc";

export default function DiyGuideScreen() {
  const { diagnosticEventId: rawId } = useLocalSearchParams<{
    diagnosticEventId: string;
  }>();
  const { colors } = useAppTheme();
  const diagnosticEventId = parseInt(rawId ?? "0", 10);

  const guideQuery = useQuery(
    trpc.recommendations.diyGuide.queryOptions({ diagnosticEventId }),
  );

  if (guideQuery.isLoading) {
    return (
      <Container className="px-4 pb-8 pt-2">
        <View className="gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Container>
    );
  }

  const guide = guideQuery.data?.guide;

  return (
    <Container className="px-4 pb-8 pt-2">
      <View className="gap-4">
        <Animated.View entering={FadeInDown.duration(300)}>
          <Text style={{ ...TYPO.h1, color: colors.text }}>
            DIY Repair Guide
          </Text>
          <Text
            style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}
          >
            Step-by-step instructions (Pro feature)
          </Text>
        </Animated.View>

        {!guide ? (
          <EmptyState
            icon="construct-outline"
            title="No DIY guide available"
            description="A guide hasn't been published for this fault code yet."
          />
        ) : (
          <>
            {/* Overview Card */}
            <Animated.View entering={FadeInDown.duration(300).delay(50)}>
              <Card variant="elevated">
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  {guide.title}
                </Text>
                <Text
                  style={{
                    color: colors.textSubtle,
                    fontSize: 12,
                    marginTop: 4,
                    fontWeight: "600",
                  }}
                >
                  {guide.dtcCode}
                </Text>
                <View className="flex-row gap-3 mt-3 items-center">
                  <Chip
                    color={
                      guide.difficulty.toLowerCase().includes("begin") ||
                      guide.difficulty.toLowerCase().includes("easy")
                        ? "success"
                        : guide.difficulty.toLowerCase().includes("advanced") ||
                            guide.difficulty.toLowerCase().includes("hard")
                          ? "danger"
                          : "warning"
                    }
                  >
                    {guide.difficulty}
                  </Chip>
                  <View className="flex-row items-center gap-1">
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      ~{guide.estimatedMinutes} min
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>

            {/* Safety Warnings */}
            {guide.safetyWarnings.length > 0 && (
              <Animated.View entering={FadeInDown.duration(300).delay(100)}>
                <Card
                  variant="outlined"
                  style={{ borderColor: `${colors.warning}66` }}
                >
                  <View className="flex-row items-center gap-2 mb-2">
                    <Ionicons
                      name="warning-outline"
                      size={18}
                      color={colors.warning}
                    />
                    <Text
                      style={{
                        color: colors.warning,
                        fontSize: 14,
                        fontWeight: "700",
                      }}
                    >
                      Safety Warnings
                    </Text>
                  </View>
                  {guide.safetyWarnings.map((warning, idx) => (
                    <Text
                      key={idx}
                      style={{
                        color: colors.textMuted,
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      • {warning}
                    </Text>
                  ))}
                </Card>
              </Animated.View>
            )}

            {/* Tools & Parts */}
            <Animated.View entering={FadeInDown.duration(300).delay(150)}>
              <View className="flex-row gap-3">
                {guide.tools.length > 0 && (
                  <Card variant="default" className="flex-1">
                    <SectionHeader title="Tools" icon="hammer-outline" />
                    {guide.tools.map((tool, idx) => (
                      <View
                        key={idx}
                        className="flex-row items-center gap-2"
                        style={{ marginBottom: 4 }}
                      >
                        <Ionicons
                          name="build-outline"
                          size={12}
                          color={colors.textMuted}
                        />
                        <Text
                          style={{ color: colors.textMuted, fontSize: 12 }}
                        >
                          {tool}
                        </Text>
                      </View>
                    ))}
                  </Card>
                )}

                {guide.parts.length > 0 && (
                  <Card variant="default" className="flex-1">
                    <SectionHeader title="Parts" icon="cube-outline" />
                    {guide.parts.map((part, idx) => (
                      <View
                        key={idx}
                        className="flex-row items-center gap-2"
                        style={{ marginBottom: 4 }}
                      >
                        <Ionicons
                          name="layers-outline"
                          size={12}
                          color={colors.textMuted}
                        />
                        <Text
                          style={{ color: colors.textMuted, fontSize: 12 }}
                        >
                          {part}
                        </Text>
                      </View>
                    ))}
                  </Card>
                )}
              </View>
            </Animated.View>

            {/* Steps with timeline */}
            {guide.steps.length > 0 && (
              <Animated.View entering={FadeInDown.duration(300).delay(200)}>
                <SectionHeader title="Step-by-Step" icon="list-outline" />
                <Card variant="default" noPadding>
                  <View style={{ padding: 16 }}>
                    {guide.steps.map((step, idx) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: "row",
                          gap: 12,
                          marginBottom: idx < guide.steps.length - 1 ? 0 : 0,
                        }}
                      >
                        {/* Timeline column */}
                        <View style={{ alignItems: "center", width: 28 }}>
                          <View
                            style={{
                              backgroundColor: colors.primary,
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: colors.textOnPrimary,
                                fontSize: 11,
                                fontWeight: "700",
                              }}
                            >
                              {idx + 1}
                            </Text>
                          </View>
                          {idx < guide.steps.length - 1 && (
                            <View
                              style={{
                                width: 2,
                                flex: 1,
                                backgroundColor: `${colors.primary}30`,
                                marginVertical: 4,
                              }}
                            />
                          )}
                        </View>
                        {/* Step text */}
                        <Text
                          style={{
                            color: colors.textMuted,
                            fontSize: 13,
                            flex: 1,
                            lineHeight: 18,
                            paddingBottom:
                              idx < guide.steps.length - 1 ? 16 : 0,
                          }}
                        >
                          {step}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </Animated.View>
            )}

            {/* Disclaimer */}
            <Animated.View entering={FadeInDown.duration(300).delay(250)}>
              <Card variant="recessed">
                <Text
                  style={{
                    color: colors.textSubtle,
                    fontSize: 11,
                    fontStyle: "italic",
                    lineHeight: 16,
                  }}
                >
                  This guide is for informational purposes only. If unsure about
                  any step, consult a licensed mechanic. Improper repairs can
                  cause vehicle damage or safety hazards.
                </Text>
              </Card>
            </Animated.View>
          </>
        )}
      </View>
    </Container>
  );
}
