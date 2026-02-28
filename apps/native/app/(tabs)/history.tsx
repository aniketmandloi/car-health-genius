import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Chip, Spinner, useThemeColor } from "heroui-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { Container } from "@/components/container";
import { trpc } from "@/utils/trpc";

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

function getEventTypeLabel(eventType: string): string {
  switch (eventType) {
    case "scan.ingested":
      return "Scan";
    case "dtc.cleared":
      return "Code Cleared";
    case "scan.event.created":
      return "DTC Detected";
    default:
      return eventType.replace(/\./g, " ");
  }
}

export default function HistoryTab() {
  const router = useRouter();
  const mutedColor = useThemeColor("muted");

  const vehicles = useQuery(trpc.vehicles.list.queryOptions());
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null,
  );

  const activeVehicleId = selectedVehicleId ?? vehicles.data?.[0]?.id ?? null;

  const events = useQuery({
    ...trpc.diagnostics.listByVehicle.queryOptions({
      vehicleId: activeVehicleId ?? 0,
    }),
    enabled: activeVehicleId !== null,
  });

  const timeline = useQuery({
    ...trpc.diagnostics.timelineByVehicle.queryOptions({
      vehicleId: activeVehicleId ?? 0,
    }),
    enabled: activeVehicleId !== null,
  });

  const isLoading =
    vehicles.isLoading ||
    (activeVehicleId !== null && (events.isLoading || timeline.isLoading));

  // Build a combined list: diagnostic events with timeline context
  const diagnosticEvents = events.data ?? [];
  const timelineEvents = timeline.data?.events ?? [];

  // Merge timeline events as annotations on top of diagnostic events
  function getTimelineEventForDiagnostic(eventId: number) {
    return timelineEvents.find((t) => t.eventRefId === eventId);
  }

  return (
    <Container>
      <ScrollView contentContainerClassName="p-4 gap-4">
        {/* Vehicle Selector */}
        <View className="gap-2">
          <Text className="text-foreground text-base font-semibold">
            Select Vehicle
          </Text>
          {vehicles.isLoading ? (
            <View className="items-center py-4">
              <Spinner size="sm" />
            </View>
          ) : (vehicles.data?.length ?? 0) === 0 ? (
            <Card className="p-4">
              <Text className="text-muted text-sm">
                No vehicles found. Add a vehicle in the Scan tab.
              </Text>
            </Card>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
            >
              {vehicles.data!.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => setSelectedVehicleId(v.id)}
                  className={`rounded-full border px-3 py-1.5 ${
                    activeVehicleId === v.id
                      ? "border-primary bg-primary"
                      : "border-border bg-card"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      activeVehicleId === v.id
                        ? "text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {v.make} {v.model} ({v.modelYear})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* History */}
        {activeVehicleId === null ? null : isLoading ? (
          <View className="items-center py-12">
            <Spinner size="lg" />
            <Text className="text-muted mt-3 text-sm">Loading history...</Text>
          </View>
        ) : diagnosticEvents.length === 0 ? (
          <Card className="items-center py-10 p-4">
            <Ionicons name="time-outline" size={40} color={mutedColor} />
            <Text className="text-foreground mt-3 font-medium">
              No scan history
            </Text>
            <Text className="text-muted mt-1 text-xs text-center">
              Connect your OBD adapter in the Scan tab to record your first
              diagnostic.
            </Text>
          </Card>
        ) : (
          <View className="gap-2">
            <Text className="text-foreground text-base font-semibold">
              Diagnostic Events ({diagnosticEvents.length})
            </Text>

            {diagnosticEvents.map((event) => {
              const timelineRef = getTimelineEventForDiagnostic(event.id);
              return (
                <Card key={event.id} className="p-3">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1 gap-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-foreground font-mono text-sm font-bold">
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

                      <Text className="text-muted text-xs">
                        {timelineRef
                          ? getTimelineEventForDiagnostic(event.id)
                            ? getEventTypeLabel(timelineRef.eventType)
                            : event.source
                          : event.source}{" "}
                        ·{" "}
                        {new Date(event.occurredAt).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </Text>
                    </View>

                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        router.push(`/results/${event.id}` as never)
                      }
                    >
                      View
                    </Button>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Container>
  );
}
