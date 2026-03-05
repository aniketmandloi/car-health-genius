import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useAppTheme } from "@/contexts/app-theme-context";
import { TYPO } from "@/lib/design";
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

function extractBusinessCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const maybeData = (error as { data?: unknown }).data;
  if (!maybeData || typeof maybeData !== "object") return undefined;
  const code = (maybeData as { businessCode?: unknown }).businessCode;
  return typeof code === "string" ? code : undefined;
}

function EventCard({
  event,
}: {
  event: {
    id: number;
    dtcCode: string;
    severity: string;
    occurredAt: string;
    source: string;
  };
}) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [explainError, setExplainError] = useState<string | null>(null);

  const generateMutation = useMutation(
    trpc.recommendations.generateForDiagnosticEvent.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.recommendations.listByDiagnosticEvent.queryFilter({
            diagnosticEventId: event.id,
          }),
        );
        router.push(`/results/${event.id}` as never);
      },
      onError: (error) => {
        const code = extractBusinessCode(error);
        setExplainError(
          code === "AI_EXPLANATIONS_DISABLED"
            ? "AI explanations are currently disabled."
            : error instanceof Error
              ? error.message
              : "Generation failed.",
        );
      },
    }),
  );

  const severityColor =
    event.severity === "critical" || event.severity === "high"
      ? colors.danger
      : event.severity === "medium"
        ? colors.warning
        : event.severity === "low"
          ? colors.info
          : colors.textSubtle;

  return (
    <Card
      variant="elevated"
      noPadding
      style={{
        borderLeftWidth: 3,
        borderLeftColor: severityColor,
      }}
    >
      <View style={{ padding: 16 }} className="gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              {event.dtcCode}
            </Text>
            <Chip color={getSeverityColor(event.severity)}>
              {event.severity}
            </Chip>
          </View>
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {event.source} ·{" "}
          {new Date(event.occurredAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>

        {explainError && (
          <Text style={{ color: colors.danger, fontSize: 12 }}>
            {explainError}
          </Text>
        )}

        <View className="flex-row gap-3">
          <Button
            variant="primary"
            size="sm"
            isDisabled={generateMutation.isPending}
            isLoading={generateMutation.isPending}
            onPress={() => {
              setExplainError(null);
              generateMutation.mutate({
                diagnosticEventId: event.id,
                mode: "basic",
              });
            }}
            style={{ flex: 1 }}
          >
            Get Explanation
          </Button>
          <Button
            variant="outline"
            size="sm"
            onPress={() => router.push(`/results/${event.id}` as never)}
            style={{ flex: 1 }}
          >
            View Details
          </Button>
        </View>
      </View>
    </Card>
  );
}

export default function ScanResultsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ vehicleId: string }>();
  const vehicleId = Number.parseInt(params.vehicleId ?? "0", 10);

  const vehicles = useQuery(trpc.vehicles.list.queryOptions());
  const activeVehicle =
    vehicles.data?.find((v) => v.id === vehicleId) ?? vehicles.data?.[0];

  const events = useQuery({
    ...trpc.diagnostics.listByVehicle.queryOptions({
      vehicleId: activeVehicle?.id ?? 0,
    }),
    enabled: activeVehicle !== undefined,
  });

  const recentEvents = (events.data ?? []).slice(0, 10);

  return (
    <Container className="px-4 pt-2">
      <View className="gap-4">
        {/* Summary */}
        {!events.isLoading && recentEvents.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card variant="accent">
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="alert-circle"
                  size={24}
                  color={colors.primary}
                />
                <View>
                  <Text
                    style={{
                      ...TYPO.h3,
                      color: colors.text,
                    }}
                  >
                    {recentEvents.length} code
                    {recentEvents.length !== 1 ? "s" : ""} detected
                  </Text>
                  {activeVehicle && (
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {activeVehicle.make} {activeVehicle.model} (
                      {activeVehicle.modelYear})
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Events */}
        {events.isLoading ? (
          <View className="gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : recentEvents.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="No codes found"
            description="Your vehicle scan returned no diagnostic codes."
          />
        ) : (
          <View className="gap-3">
            {recentEvents.map((event, i) => (
              <Animated.View
                key={event.id}
                entering={FadeInDown.duration(300).delay(i * 50)}
              >
                <EventCard
                  event={event}
                />
              </Animated.View>
            ))}
          </View>
        )}

        <Button
          variant="ghost"
          icon="arrow-back-outline"
          onPress={() => router.back()}
        >
          Back to Scan
        </Button>
      </View>
    </Container>
  );
}
