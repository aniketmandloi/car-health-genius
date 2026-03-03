import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Chip, Spinner } from "heroui-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { Container } from "@/components/container";
import { trpc } from "@/utils/trpc";

const TEAL = "#06B6D4";
const SLATE_400 = "#94A3B8";

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

const EVENT_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "scan.ingested", label: "Scan" },
  { value: "dtc.cleared", label: "Cleared" },
  { value: "scan.event.created", label: "DTC Detected" },
];

export default function HistoryTab() {
  const router = useRouter();

  const vehicles = useQuery(trpc.vehicles.list.queryOptions());
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null,
  );
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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
      eventType: eventTypeFilter.length > 0 ? eventTypeFilter : undefined,
    }),
    enabled: activeVehicleId !== null,
  });

  const isLoading =
    vehicles.isLoading ||
    (activeVehicleId !== null && (events.isLoading || timeline.isLoading));

  const allDiagnosticEvents = events.data ?? [];
  const timelineEvents = timeline.data?.events ?? [];

  const diagnosticEvents = useMemo(() => {
    if (!eventTypeFilter) return allDiagnosticEvents;
    const refIds = new Set(
      timelineEvents.map((t) => t.eventRefId).filter(Boolean),
    );
    return allDiagnosticEvents.filter((e) => refIds.has(e.id));
  }, [allDiagnosticEvents, timelineEvents, eventTypeFilter]);

  function getTimelineEventForDiagnostic(eventId: number) {
    return timelineEvents.find((t) => t.eventRefId === eventId);
  }

  return (
    <Container>
      <ScrollView contentContainerClassName="p-4 gap-4">
        {/* Vehicle Selector */}
        <View className="gap-2">
          <Text className="text-foreground text-base font-bold">
            Select Vehicle
          </Text>
          {vehicles.isLoading ? (
            <View className="items-center py-4">
              <Spinner size="sm" />
            </View>
          ) : (vehicles.data?.length ?? 0) === 0 ? (
            <Card className="p-4 rounded-2xl border border-surface-border">
              <Text style={{ color: SLATE_400, fontSize: 13 }}>
                No vehicles found. Add a vehicle in the Vehicles tab.
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
                  style={
                    activeVehicleId === v.id
                      ? { backgroundColor: TEAL, borderColor: TEAL }
                      : { borderColor: "rgba(255,255,255,0.1)" }
                  }
                  className="rounded-full border px-3 py-1.5"
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: activeVehicleId === v.id ? "#FFFFFF" : "#F1F5F9",
                    }}
                  >
                    {v.make} {v.model} ({v.modelYear})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Filters */}
        {activeVehicleId !== null && (
          <View className="gap-2">
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="filter-outline" size={14} color={SLATE_400} />
              <Text style={{ color: SLATE_400, fontSize: 12 }}>
                {showFilters ? "Hide Filters" : "Filters"}
              </Text>
            </TouchableOpacity>

            {showFilters && (
              <View className="gap-2 rounded-xl border border-surface-border p-3">
                <Text className="text-foreground text-xs font-medium">
                  Event Type
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2"
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setEventTypeFilter(opt.value)}
                      style={
                        eventTypeFilter === opt.value
                          ? { backgroundColor: TEAL, borderColor: TEAL }
                          : { borderColor: "rgba(255,255,255,0.1)" }
                      }
                      className="rounded-full border px-3 py-1"
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color:
                            eventTypeFilter === opt.value
                              ? "#FFFFFF"
                              : "#F1F5F9",
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* History */}
        {activeVehicleId === null ? null : isLoading ? (
          <View className="items-center py-12">
            <Spinner size="lg" />
            <Text style={{ color: SLATE_400, fontSize: 13, marginTop: 12 }}>
              Loading history...
            </Text>
          </View>
        ) : diagnosticEvents.length === 0 ? (
          <Card className="items-center py-10 p-4 rounded-2xl border border-surface-border">
            <Ionicons name="time-outline" size={40} color={SLATE_400} />
            <Text className="text-foreground mt-3 font-medium">
              No scan history
            </Text>
            <Text
              style={{
                color: SLATE_400,
                fontSize: 12,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              Connect your OBD adapter in the Scan tab to record your first
              diagnostic.
            </Text>
          </Card>
        ) : (
          <View className="gap-2">
            <Text className="text-foreground text-base font-bold">
              Diagnostic Events ({diagnosticEvents.length})
            </Text>

            {diagnosticEvents.map((event) => {
              const timelineRef = getTimelineEventForDiagnostic(event.id);
              return (
                <Card
                  key={event.id}
                  className="p-3 rounded-2xl border border-surface-border"
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1 gap-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="text-foreground font-bold"
                          style={{ fontFamily: "monospace", fontSize: 14 }}
                        >
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

                      <Text style={{ color: SLATE_400, fontSize: 11 }}>
                        {timelineRef
                          ? getEventTypeLabel(timelineRef.eventType)
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
