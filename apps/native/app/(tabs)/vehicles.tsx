import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Alert, Pressable, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { AppTextInput } from "@/components/ui/text-input";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useAppTheme } from "@/contexts/app-theme-context";
import { ELEVATION } from "@/lib/design";
import { queryClient, trpc } from "@/utils/trpc";

function VehicleHealthBadge({ vehicleId }: { vehicleId: number }) {
  const healthScore = useQuery(
    trpc.maintenance.getHealthScore.queryOptions({ vehicleId }),
  );

  if (healthScore.isLoading || !healthScore.data) return null;

  return (
    <ProgressRing
      score={healthScore.data.score}
      grade={healthScore.data.grade}
      size={56}
      strokeWidth={5}
    />
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
  const { colors } = useAppTheme();
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

  return (
    <Card variant="outlined">
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: "600",
          marginBottom: 12,
        }}
      >
        {vehicleId ? "Edit Vehicle" : "Add Vehicle"}
      </Text>

      <View className="gap-3">
        <View className="flex-row gap-3">
          <AppTextInput
            label="Make *"
            value={form.make}
            onChangeText={(t) => setForm((f) => ({ ...f, make: t }))}
            placeholder="Toyota"
            containerClassName="flex-1"
          />
          <AppTextInput
            label="Model *"
            value={form.model}
            onChangeText={(t) => setForm((f) => ({ ...f, model: t }))}
            placeholder="Camry"
            containerClassName="flex-1"
          />
        </View>

        <View className="flex-row gap-3">
          <AppTextInput
            label="Year *"
            value={form.modelYear}
            onChangeText={(t) => setForm((f) => ({ ...f, modelYear: t }))}
            placeholder="2020"
            keyboardType="numeric"
            containerClassName="flex-1"
          />
          <AppTextInput
            label="Engine"
            value={form.engine}
            onChangeText={(t) => setForm((f) => ({ ...f, engine: t }))}
            placeholder="2.5L 4-cyl"
            containerClassName="flex-1"
          />
        </View>

        <AppTextInput
          label="VIN"
          value={form.vin}
          onChangeText={(t) => setForm((f) => ({ ...f, vin: t.toUpperCase() }))}
          placeholder="17-character VIN"
          autoCapitalize="characters"
        />

        <AppTextInput
          label="Mileage"
          value={form.mileage}
          onChangeText={(t) => setForm((f) => ({ ...f, mileage: t }))}
          placeholder="50000"
          keyboardType="numeric"
        />

        {error && (
          <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
        )}

        <View className="flex-row gap-3">
          <Button
            onPress={handleSubmit}
            isDisabled={isPending}
            isLoading={isPending}
            style={{ flex: 1 }}
          >
            {vehicleId ? "Update" : "Add Vehicle"}
          </Button>
          <Button variant="outline" onPress={onCancel} style={{ flex: 1 }}>
            Cancel
          </Button>
        </View>
      </View>
    </Card>
  );
}

export default function VehiclesTab() {
  const { colors } = useAppTheme();
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

  const handleRefresh = useCallback(() => {
    vehicles.refetch();
  }, [vehicles]);

  return (
    <Container
      refreshing={vehicles.isFetching}
      onRefresh={handleRefresh}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 14 }}>
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
          <Text style={{ color: colors.danger, fontSize: 12 }}>
            {deleteError}
          </Text>
        )}

        {vehicles.isLoading ? (
          <View className="gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (vehicles.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon="car-outline"
            title="No vehicles yet"
            description="Add your first vehicle to start scanning for issues."
            actionLabel="Add Vehicle"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <View className="gap-3">
            {vehicles.data!.map((v, i) => (
              <Animated.View
                key={v.id}
                entering={FadeInDown.duration(300).delay(i * 60)}
                exiting={FadeOutUp.duration(200)}
              >
                <Card variant="elevated">
                  <View className="flex-row items-center gap-4">
                    <VehicleHealthBadge vehicleId={v.id} />
                    <View className="flex-1">
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 15,
                          fontWeight: "700",
                        }}
                      >
                        {v.make} {v.model}
                      </Text>
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {v.modelYear}
                        {v.mileage
                          ? ` · ${v.mileage.toLocaleString()} mi`
                          : ""}
                        {v.engine ? ` · ${v.engine}` : ""}
                      </Text>
                      {v.vin && (
                        <Text
                          style={{
                            color: colors.textSubtle,
                            fontSize: 11,
                            fontWeight: "600",
                            marginTop: 2,
                          }}
                        >
                          {v.vin}
                        </Text>
                      )}
                    </View>
                    <View className="flex-row gap-2">
                      <Pressable
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
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: colors.surfaceRecessed,
                          borderWidth: 1,
                          borderColor: colors.border,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="pencil-outline"
                          size={16}
                          color={colors.textMuted}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          handleDelete(
                            v.id,
                            `${v.make} ${v.model} (${v.modelYear})`,
                          )
                        }
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: `${colors.danger}14`,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={colors.danger}
                        />
                      </Pressable>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            ))}
          </View>
        )}
      </View>

      {/* FAB */}
      {!showForm && !editTarget && (
        <Pressable
          onPress={() => setShowForm(true)}
          style={{
            position: "absolute",
            bottom: 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.primary,
            borderWidth: 1,
            borderColor: colors.primaryPressed,
            alignItems: "center",
            justifyContent: "center",
            ...ELEVATION.sm,
          }}
        >
          <Ionicons name="add" size={26} color={colors.textOnPrimary} />
        </Pressable>
      )}
    </Container>
  );
}
