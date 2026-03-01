import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, Spinner, useThemeColor } from "heroui-native";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#16a34a";
    case "B": return "#65a30d";
    case "C": return "#ca8a04";
    case "D": return "#ea580c";
    default:  return "#dc2626";
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
      <Text style={{ color, fontSize: 20, fontWeight: "700", lineHeight: 22 }}>
        {healthScore.data.grade}
      </Text>
      <Text className="text-muted" style={{ fontSize: 9 }}>
        {healthScore.data.score}/100
      </Text>
    </View>
  );
}

import { Container } from "@/components/container";
import { queryClient, trpc } from "@/utils/trpc";

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
      mileage: form.mileage.trim() ? parseInt(form.mileage.trim(), 10) : undefined,
      engine: form.engine.trim() || undefined,
    };

    if (vehicleId !== undefined) {
      updateMutation.mutate({ vehicleId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const inputClass =
    "rounded border border-border bg-card px-3 py-2 text-sm text-foreground";

  return (
    <View className="gap-3 rounded-xl border border-border bg-card p-4">
      <Text className="text-foreground text-base font-semibold">
        {vehicleId ? "Edit Vehicle" : "Add Vehicle"}
      </Text>

      <View className="gap-2">
        <Text className="text-muted text-xs">Make *</Text>
        <TextInput
          value={form.make}
          onChangeText={(t) => setForm((f) => ({ ...f, make: t }))}
          placeholder="Toyota"
          className={inputClass}
          placeholderTextColor="#888"
        />
      </View>

      <View className="gap-2">
        <Text className="text-muted text-xs">Model *</Text>
        <TextInput
          value={form.model}
          onChangeText={(t) => setForm((f) => ({ ...f, model: t }))}
          placeholder="Camry"
          className={inputClass}
          placeholderTextColor="#888"
        />
      </View>

      <View className="gap-2">
        <Text className="text-muted text-xs">Year *</Text>
        <TextInput
          value={form.modelYear}
          onChangeText={(t) => setForm((f) => ({ ...f, modelYear: t }))}
          placeholder="2020"
          keyboardType="numeric"
          className={inputClass}
          placeholderTextColor="#888"
        />
      </View>

      <View className="gap-2">
        <Text className="text-muted text-xs">VIN (optional)</Text>
        <TextInput
          value={form.vin}
          onChangeText={(t) => setForm((f) => ({ ...f, vin: t.toUpperCase() }))}
          placeholder="17-character VIN"
          autoCapitalize="characters"
          className={inputClass}
          placeholderTextColor="#888"
        />
      </View>

      <View className="gap-2">
        <Text className="text-muted text-xs">Mileage (optional)</Text>
        <TextInput
          value={form.mileage}
          onChangeText={(t) => setForm((f) => ({ ...f, mileage: t }))}
          placeholder="50000"
          keyboardType="numeric"
          className={inputClass}
          placeholderTextColor="#888"
        />
      </View>

      <View className="gap-2">
        <Text className="text-muted text-xs">Engine (optional)</Text>
        <TextInput
          value={form.engine}
          onChangeText={(t) => setForm((f) => ({ ...f, engine: t }))}
          placeholder="2.5L 4-cylinder"
          className={inputClass}
          placeholderTextColor="#888"
        />
      </View>

      {error && <Text className="text-xs text-red-500">{error}</Text>}

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
  const mutedColor = useThemeColor("muted");
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
          <Text className="text-foreground text-xl font-semibold">My Vehicles</Text>
          {!showForm && !editTarget && (
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              className="flex-row items-center gap-1 rounded-full bg-primary px-3 py-1.5"
            >
              <Ionicons name="add" size={14} color="white" />
              <Text className="text-xs font-medium text-white">Add</Text>
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
          <Text className="text-xs text-red-500">{deleteError}</Text>
        )}

        {vehicles.isLoading ? (
          <View className="items-center py-12">
            <Spinner size="lg" />
          </View>
        ) : (vehicles.data?.length ?? 0) === 0 ? (
          <Card className="items-center p-6">
            <Ionicons name="car-outline" size={40} color={mutedColor} />
            <Text className="text-foreground mt-3 text-base font-medium">
              No vehicles yet
            </Text>
            <Text className="text-muted mt-1 text-xs text-center">
              Add your first vehicle to start scanning for issues.
            </Text>
          </Card>
        ) : (
          <View className="gap-3">
            {vehicles.data!.map((v) => (
              <Card key={v.id} className="p-4">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1 gap-1">
                    <Text className="text-foreground font-semibold">
                      {v.make} {v.model}
                    </Text>
                    <Text className="text-muted text-xs">
                      {v.modelYear}
                      {v.mileage ? ` · ${v.mileage.toLocaleString()} mi` : ""}
                      {v.engine ? ` · ${v.engine}` : ""}
                    </Text>
                    {v.vin && (
                      <Text className="text-muted font-mono text-xs">{v.vin}</Text>
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
                        className="rounded border border-border px-2 py-1"
                      >
                        <Text className="text-foreground text-xs">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          handleDelete(v.id, `${v.make} ${v.model} (${v.modelYear})`)
                        }
                        className="rounded border border-red-200 px-2 py-1"
                      >
                        <Text className="text-xs text-red-500">Delete</Text>
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
