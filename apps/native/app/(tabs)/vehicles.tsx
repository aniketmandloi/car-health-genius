import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, Spinner } from "heroui-native";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Container } from "@/components/container";
import { queryClient, trpc } from "@/utils/trpc";

const TEAL = "#06B6D4";
const SLATE_400 = "#94A3B8";
const SLATE_500 = "#64748B";
const RED = "#EF4444";

function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "#10B981";
    case "B":
      return "#06B6D4";
    case "C":
      return "#F59E0B";
    case "D":
      return "#F97316";
    default:
      return "#EF4444";
  }
}

function VehicleHealthBadge({ vehicleId }: { vehicleId: number }) {
  const healthScore = useQuery(
    trpc.maintenance.getHealthScore.queryOptions({ vehicleId }),
  );

  if (healthScore.isLoading) {
    return <View className="h-8 w-8 animate-pulse rounded-full bg-muted" />;
  }
  if (!healthScore.data) return null;

  const color = gradeColor(healthScore.data.grade);

  return (
    <View className="items-center">
      <Text style={{ color, fontSize: 22, fontWeight: "800", lineHeight: 24 }}>
        {healthScore.data.grade}
      </Text>
      <Text style={{ color: SLATE_500, fontSize: 9 }}>
        {healthScore.data.score}/100
      </Text>
    </View>
  );
}

type VehicleForm = {
  make: string;
  model: string;
  modelYear: string;
  vin: string;
  mileage: string;
  engine: string;
};

const EMPTY_FORM: VehicleForm = {
  make: "",
  model: "",
  modelYear: "",
  vin: "",
  mileage: "",
  engine: "",
};

function readErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Request failed";
  const msg = (error as { message?: unknown }).message;
  return typeof msg === "string" && msg.length > 0 ? msg : "Request failed";
}

function VehicleFormSheet({
  initial,
  vehicleId,
  onDone,
  onCancel,
}: {
  initial?: VehicleForm;
  vehicleId?: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<VehicleForm>(initial ?? EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation(
    trpc.vehicles.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.vehicles.list.queryFilter());
        onDone();
      },
      onError: (err) => setError(readErrorMessage(err)),
    }),
  );

  const updateMutation = useMutation(
    trpc.vehicles.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.vehicles.list.queryFilter());
        onDone();
      },
      onError: (err) => setError(readErrorMessage(err)),
    }),
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    setError(null);
    const year = parseInt(form.modelYear, 10);
    if (!form.make.trim() || !form.model.trim() || isNaN(year)) {
      setError("Make, model, and year are required.");
      return;
    }

    const payload = {
      make: form.make.trim(),
      model: form.model.trim(),
      modelYear: year,
      vin: form.vin.trim() || undefined,
      mileage: form.mileage.trim()
        ? parseInt(form.mileage.trim(), 10)
        : undefined,
      engine: form.engine.trim() || undefined,
    };

    if (vehicleId !== undefined) {
      updateMutation.mutate({ vehicleId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const inputClass =
    "rounded-xl border border-white/10 bg-[#162032] px-3 py-2.5 text-sm text-white";

  return (
    <View className="gap-3 rounded-2xl border border-white/10 bg-[#0F1A2E] p-4">
      <Text className="text-foreground text-base font-semibold">
        {vehicleId ? "Edit Vehicle" : "Add Vehicle"}
      </Text>

      <View className="gap-2">
        <Text style={{ color: SLATE_400, fontSize: 12 }}>Make *</Text>
        <TextInput
          value={form.make}
          onChangeText={(t) => setForm((f) => ({ ...f, make: t }))}
          placeholder="Toyota"
          className={inputClass}
          placeholderTextColor={SLATE_500}
        />
      </View>

      <View className="gap-2">
        <Text style={{ color: SLATE_400, fontSize: 12 }}>Model *</Text>
        <TextInput
          value={form.model}
          onChangeText={(t) => setForm((f) => ({ ...f, model: t }))}
          placeholder="Camry"
          className={inputClass}
          placeholderTextColor={SLATE_500}
        />
      </View>

      <View className="gap-2">
        <Text style={{ color: SLATE_400, fontSize: 12 }}>Year *</Text>
        <TextInput
          value={form.modelYear}
          onChangeText={(t) => setForm((f) => ({ ...f, modelYear: t }))}
          placeholder="2020"
          keyboardType="numeric"
          className={inputClass}
          placeholderTextColor={SLATE_500}
        />
      </View>

      <View className="gap-2">
        <Text style={{ color: SLATE_400, fontSize: 12 }}>VIN (optional)</Text>
        <TextInput
          value={form.vin}
          onChangeText={(t) => setForm((f) => ({ ...f, vin: t.toUpperCase() }))}
          placeholder="17-character VIN"
          autoCapitalize="characters"
          className={inputClass}
          placeholderTextColor={SLATE_500}
        />
      </View>

      <View className="gap-2">
        <Text style={{ color: SLATE_400, fontSize: 12 }}>
          Mileage (optional)
        </Text>
        <TextInput
          value={form.mileage}
          onChangeText={(t) => setForm((f) => ({ ...f, mileage: t }))}
          placeholder="50000"
          keyboardType="numeric"
          className={inputClass}
          placeholderTextColor={SLATE_500}
        />
      </View>

      <View className="gap-2">
        <Text style={{ color: SLATE_400, fontSize: 12 }}>
          Engine (optional)
        </Text>
        <TextInput
          value={form.engine}
          onChangeText={(t) => setForm((f) => ({ ...f, engine: t }))}
          placeholder="2.5L 4-cylinder"
          className={inputClass}
          placeholderTextColor={SLATE_500}
        />
      </View>

      {error && <Text style={{ color: RED, fontSize: 12 }}>{error}</Text>}

      <View className="flex-row gap-2">
        <Button
          onPress={handleSubmit}
          isDisabled={isPending}
          className="flex-1"
        >
          {isPending ? "Saving..." : vehicleId ? "Update" : "Add Vehicle"}
        </Button>
        <Button variant="secondary" onPress={onCancel} className="flex-1">
          Cancel
        </Button>
      </View>
    </View>
  );
}

export default function VehiclesTab() {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    id: number;
    form: VehicleForm;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const vehicles = useQuery(trpc.vehicles.list.queryOptions());

  const deleteMutation = useMutation(
    trpc.vehicles.delete.mutationOptions({
      onSuccess: async () => {
        setDeleteError(null);
        await queryClient.invalidateQueries(trpc.vehicles.list.queryFilter());
      },
      onError: (err) => setDeleteError(readErrorMessage(err)),
    }),
  );

  function handleDelete(vehicleId: number, label: string) {
    Alert.alert(
      "Delete Vehicle",
      `Remove "${label}" from your garage? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate({ vehicleId }),
        },
      ],
    );
  }

  return (
    <Container>
      <ScrollView contentContainerClassName="p-4 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-foreground text-xl font-bold">My Vehicles</Text>
          {!showForm && !editTarget && (
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              style={{
                backgroundColor: TEAL,
                shadowColor: "#06B6D4",
                shadowOpacity: 0.3,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
                elevation: 6,
              }}
              className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
            >
              <Ionicons name="add" size={14} color="white" />
              <Text className="text-xs font-semibold text-white">Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {showForm && (
          <VehicleFormSheet
            onDone={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        )}

        {editTarget && (
          <VehicleFormSheet
            vehicleId={editTarget.id}
            initial={editTarget.form}
            onDone={() => setEditTarget(null)}
            onCancel={() => setEditTarget(null)}
          />
        )}

        {deleteError && (
          <Text style={{ color: RED, fontSize: 12 }}>{deleteError}</Text>
        )}

        {vehicles.isLoading ? (
          <View className="items-center py-12">
            <Spinner size="lg" />
          </View>
        ) : (vehicles.data?.length ?? 0) === 0 ? (
          <Card className="items-center p-6 rounded-2xl border border-white/10">
            <Ionicons name="car-outline" size={40} color={SLATE_500} />
            <Text className="text-foreground mt-3 text-base font-medium">
              No vehicles yet
            </Text>
            <Text
              style={{
                color: SLATE_400,
                fontSize: 12,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              Add your first vehicle to start scanning for issues.
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            {vehicles.data!.map((v) => (
              <Card
                key={v.id}
                className="p-4 rounded-2xl border border-white/10"
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1 gap-1">
                    <Text className="text-foreground font-bold text-base">
                      {v.make} {v.model}
                    </Text>
                    <Text style={{ color: SLATE_400, fontSize: 12 }}>
                      {v.modelYear}
                      {v.mileage ? ` · ${v.mileage.toLocaleString()} mi` : ""}
                      {v.engine ? ` · ${v.engine}` : ""}
                    </Text>
                    {v.vin && (
                      <Text
                        style={{
                          color: SLATE_500,
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                      >
                        {v.vin}
                      </Text>
                    )}
                  </View>

                  <View className="items-end gap-2">
                    <VehicleHealthBadge vehicleId={v.id} />
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() =>
                          setEditTarget({
                            id: v.id,
                            form: {
                              make: v.make,
                              model: v.model,
                              modelYear: String(v.modelYear),
                              vin: v.vin ?? "",
                              mileage: v.mileage ? String(v.mileage) : "",
                              engine: v.engine ?? "",
                            },
                          })
                        }
                        className="rounded-lg border border-white/10 px-2.5 py-1"
                      >
                        <Text className="text-foreground text-xs">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          handleDelete(
                            v.id,
                            `${v.make} ${v.model} (${v.modelYear})`,
                          )
                        }
                        style={{ borderColor: "rgba(239,68,68,0.3)" }}
                        className="rounded-lg border px-2.5 py-1"
                      >
                        <Text style={{ color: RED, fontSize: 12 }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Container>
  );
}
