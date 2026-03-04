import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Container } from "@/components/container";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useAppTheme } from "@/contexts/app-theme-context";
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

function getSeverityDotColor(severity: string, colors: any): string {
  switch (severity) {
    case "critical":
      return colors.danger;
    case "high":
      return "#F97316";
    case "medium":
      return colors.warning;
    case "low":
      return colors.info;
    default:
      return colors.textSubtle;
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
  { value: "", label: "All" },
  { value: "scan.ingested", label: "Scans" },
  { value: "dtc.cleared", label: "Cleared" },
  { value: "scan.event.created", label: "DTCs" },
];

export default function HistoryTab() {
  const router = useRouter();
  const { colors } = useAppTheme();

  const vehicles = useQuery(trpc.vehicles.list.queryOptions());
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(
    null,
  );
  const [eventTypeFilter, setEventTypeFilter] = useState("");

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

  const getTimelineEventForDiagnostic = useCallback(
    (eventId: number) => {
      return timelineEvents.find((t) => t.eventRefId === eventId);
    },
    [timelineEvents],
  );

  const handleRefresh = useCallback(() => {
    events.refetch();
    timeline.refetch();
  }, [events, timeline]);

  return (
    <Container
      refreshing={events.isFetching}
      onRefresh={activeVehicleId ? handleRefresh : undefined}
    >
      <View className="p-4 gap-4">
        {/* Vehicle Selector */}
        {vehicles.isLoading ? null : (vehicles.data?.length ?? 0) === 0 ? (
          <Card variant="default">
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              No vehicles found. Add a vehicle in the Vehicles tab.
            </Text>
          </Card>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {vehicles.data!.map((v) => {
              const isActive = activeVehicleId === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => setSelectedVehicleId(v.id)}
                  style={{
                    backgroundColor: isActive ? colors.primary : "transparent",
                    borderColor: isActive ? colors.primary : colors.border,
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: isActive ? colors.textOnPrimary : colors.text,
                    }}
                  >
                    {v.make} {v.model}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Filter Chips — always visible */}
        {activeVehicleId !== null && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {EVENT_TYPE_OPTIONS.map((opt) => {
              const isActive = eventTypeFilter === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setEventTypeFilter(opt.value)}
                  style={{
                    backgroundColor: isActive
                      ? colors.primarySoft
                      : "transparent",
                    borderColor: isActive ? colors.primary : colors.border,
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "500",
                      color: isActive ? colors.primary : colors.textMuted,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* History List */}
        {activeVehicleId === null ? null : isLoading ? (
          <View className="gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : diagnosticEvents.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title="No scan history"
            description="Connect your OBD adapter in the Scan tab to record your first diagnostic."
          />
        ) : (
          <View className="gap-2">
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                fontWeight: "500",
              }}
            >
              {diagnosticEvents.length} event
              {diagnosticEvents.length !== 1 ? "s" : ""}
            </Text>

            {diagnosticEvents.map((event, i) => {
              const timelineRef = getTimelineEventForDiagnostic(event.id);
              return (
                <Animated.View
                  key={event.id}
                  entering={FadeInDown.duration(300).delay(i * 40)}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push(`/results/${event.id}` as never)
                    }
                  >
                    <Card variant="default" noPadding>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          gap: 12,
                        }}
                      >
                        {/* Severity dot */}
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: getSeverityDotColor(
                              event.severity,
                              colors,
                            ),
                          }}
                        />
                        {/* Content */}
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text
                              style={{
                                fontFamily: "monospace",
                                fontSize: 14,
                                fontWeight: "700",
                                color: colors.text,
                              }}
                            >
                              {event.dtcCode}
                            </Text>
                            <Chip
                              color={getSeverityColor(event.severity)}
                              size="sm"
                            >
                              {event.severity}
                            </Chip>
                          </View>
                          <Text
                            style={{
                              color: colors.textMuted,
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
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
                        {/* Chevron */}
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={colors.textMuted}
                        />
                      </View>
                    </Card>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        )}
      </View>
    </Container>
  );
}
