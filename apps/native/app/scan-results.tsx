import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, Chip, Spinner } from "heroui-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Container } from "@/components/container";
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
  vehicleId,
}: {
  event: {
    id: number;
    dtcCode: string;
    severity: string;
    occurredAt: string;
    source: string;
  };
  vehicleId: number;
}) {
  const router = useRouter();
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

  return (
    <Card className="p-4">
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-foreground font-mono text-lg font-bold">
              {event.dtcCode}
            </Text>
            <Chip
              variant="secondary"
              color={getSeverityColor(event.severity)}
              size="sm"
            >
              <Chip.Label>{event.severity}</Chip.Label>
            </Chip>
          </View>
        </View>

        <Text className="text-muted text-xs">
          {event.source} ·{" "}
          {new Date(event.occurredAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>

        {explainError && (
          <Text className="text-xs text-red-500">{explainError}</Text>
        )}

        <View className="mt-1 flex-row gap-2">
          <Button
            variant="primary"
            size="sm"
            isDisabled={generateMutation.isPending}
            onPress={() => {
              setExplainError(null);
              generateMutation.mutate({
                diagnosticEventId: event.id,
                mode: "basic",
              });
            }}
          >
            {generateMutation.isPending ? (
              <Spinner size="sm" color="default" />
            ) : (
              "Get Explanation"
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => router.push(`/results/${event.id}` as never)}
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

  // Show only events from the latest session (most recent ~10 events)
  const recentEvents = (events.data ?? []).slice(0, 10);

  return (
    <Container>
      <ScrollView contentContainerClassName="p-4 gap-4">
        {/* Header */}
        <View className="gap-1">
          <Text className="text-foreground text-xl font-bold">
            Scan Results
          </Text>
          {activeVehicle ? (
            <Text className="text-muted text-sm">
              {activeVehicle.make} {activeVehicle.model} (
              {activeVehicle.modelYear})
            </Text>
          ) : null}
        </View>

        {/* Events */}
        {events.isLoading ? (
          <View className="items-center py-12">
            <Spinner size="lg" />
            <Text className="text-muted mt-3 text-sm">Loading results...</Text>
          </View>
        ) : recentEvents.length === 0 ? (
          <Card className="items-center p-6">
            <Text className="text-foreground font-medium">No codes found</Text>
            <Text className="text-muted mt-1 text-xs text-center">
              Your vehicle scan returned no diagnostic codes.
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            <Text className="text-foreground text-sm font-semibold">
              {recentEvents.length} code{recentEvents.length !== 1 ? "s" : ""}{" "}
              detected
            </Text>
            {recentEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                vehicleId={activeVehicle?.id ?? vehicleId}
              />
            ))}
          </View>
        )}

        {/* Done button */}
        <Button variant="ghost" onPress={() => router.back()}>
          Back to Scan
        </Button>
      </ScrollView>
    </Container>
  );
}
