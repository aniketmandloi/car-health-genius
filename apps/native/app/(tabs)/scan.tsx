import { Ionicons } from "@expo/vector-icons";
import { env } from "@car-health-genius/env/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Network from "expo-network";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { AppTextInput } from "@/components/ui/text-input";
import { useAppTheme } from "@/contexts/app-theme-context";
import { TYPO } from "@/lib/design";
import { createAdapterDriver } from "@/src/modules/adapter";
import type {
  AdapterConnectionState,
  AdapterReadResult,
} from "@/src/modules/adapter";
import {
  enqueueScanUpload,
  listReadyScanUploads,
  markScanUploadFailed,
  markScanUploadSucceeded,
} from "@/src/modules/scan-upload/queue";
import { queryClient, trpc } from "@/utils/trpc";

function extractBusinessCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const maybeData = (error as { data?: unknown }).data;
  if (!maybeData || typeof maybeData !== "object") {
    return undefined;
  }
  const businessCode = (maybeData as { businessCode?: unknown }).businessCode;
  return typeof businessCode === "string" ? businessCode : undefined;
}

function createUploadId() {
  return `upl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function ConnectionIndicator({ state }: { state: AdapterConnectionState }) {
  const { colors } = useAppTheme();
  const colorMap: Record<AdapterConnectionState, string> = {
    disconnected: colors.textSubtle,
    connecting: colors.warning,
    connected: colors.success,
  };
  const color = colorMap[state] ?? colors.textSubtle;
  const label =
    state === "connected"
      ? "Connected"
      : state === "connecting"
        ? "Connecting..."
        : "Not Connected";

  return (
    <View className="items-center gap-3 py-4">
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          backgroundColor: `${color}18`,
          borderWidth: 2,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={
            state === "connected"
              ? "checkmark"
              : state === "connecting"
                ? "sync-outline"
                : "bluetooth-outline"
          }
          size={30}
          color={color}
        />
      </View>
      <Text style={{ color, fontSize: 14, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

export default function ScanTab() {
  const mode = env.EXPO_PUBLIC_ADAPTER_MODE;
  const driver = useMemo(() => createAdapterDriver({ mode }), [mode]);
  const { colors } = useAppTheme();
  const router = useRouter();

  const [status, setStatus] = useState<string>("Idle");
  const [onboardingStatus, setOnboardingStatus] = useState<string>(
    "No vehicle created in this session.",
  );
  const [vinInput, setVinInput] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [stateCode, setStateCode] = useState("");
  const [driverState, setDriverState] = useState<AdapterConnectionState>(
    driver.getState(),
  );
  const [readResult, setReadResult] = useState<AdapterReadResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeVehicleId, setActiveVehicleId] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [showAdapters, setShowAdapters] = useState(false);

  const adapters = useQuery(
    trpc.diagnostics.listCompatibleAdapters.queryOptions(),
  );
  const vehicles = useQuery(trpc.vehicles.list.queryOptions());

  useEffect(() => {
    if (activeVehicleId !== null) {
      return;
    }

    const candidate = vehicles.data?.[0];
    if (candidate) {
      setActiveVehicleId(candidate.id);
    }
  }, [activeVehicleId, vehicles.data]);

  const createFromVin = useMutation(
    trpc.vehicles.createFromVin.mutationOptions({
      onSuccess: async (result) => {
        if (result.created) {
          setOnboardingStatus(
            `Created ${result.vehicle.make} ${result.vehicle.model} (${result.vehicle.modelYear})`,
          );
          setActiveVehicleId(result.vehicle.id);
          await queryClient.invalidateQueries(trpc.vehicles.list.queryFilter());
        } else {
          setOnboardingStatus(
            `VIN fallback required: ${result.decode.message}`,
          );
        }
      },
      onError: (error) => {
        const businessCode = extractBusinessCode(error);
        setOnboardingStatus(
          businessCode === "UNSUPPORTED_GEOGRAPHY"
            ? "US-only launch: set Country to US and retry."
            : error instanceof Error
              ? error.message
              : "Vehicle onboarding failed",
        );
      },
    }),
  );

  const startSession = useMutation(
    trpc.diagnostics.startSession.mutationOptions(),
  );
  const ingestScan = useMutation(trpc.diagnostics.ingestScan.mutationOptions());
  const clearCode = useMutation(trpc.diagnostics.clearCode.mutationOptions());
  const finishSession = useMutation(
    trpc.diagnostics.finishSession.mutationOptions(),
  );

  useEffect(() => {
    setDriverState(driver.getState());
    return () => {
      driver.disconnect().catch(() => {});
    };
  }, [driver]);

  async function flushPendingUploads() {
    const networkState = await Network.getNetworkStateAsync();
    if (
      !networkState.isConnected ||
      networkState.isInternetReachable === false
    ) {
      return { processed: 0, uploaded: 0 };
    }

    const pending = await listReadyScanUploads();
    let processed = 0;
    let uploaded = 0;

    for (const item of pending) {
      processed += 1;
      try {
        const result = await ingestScan.mutateAsync({
          sessionId: item.sessionId,
          uploadId: item.id,
          source: item.source,
          capturedAt: item.capturedAt,
          dtcReadings: item.dtcReadings,
        });
        uploaded += result.insertedCount;
        await markScanUploadSucceeded(item.id);
      } catch (error) {
        const businessCode = extractBusinessCode(error);
        if (businessCode === "OBD_SESSION_CLOSED") {
          await markScanUploadSucceeded(item.id);
          continue;
        }

        await markScanUploadFailed(
          item.id,
          error instanceof Error ? error.message : "Upload failed",
        );
      }
    }

    return { processed, uploaded };
  }

  useEffect(() => {
    const subscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected) {
        void flushPendingUploads();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  async function run(action: () => Promise<void>) {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await action();
    } catch (error) {
      const businessCode = extractBusinessCode(error);
      setStatus(
        businessCode === "UNSUPPORTED_GEOGRAPHY"
          ? "US-only launch: update country to US in onboarding."
          : error instanceof Error
            ? error.message
            : "Action failed",
      );
    } finally {
      setDriverState(driver.getState());
      setBusy(false);
    }
  }

  async function connectAndStartSession() {
    if (!activeVehicleId) {
      setStatus("Create or select a vehicle before connecting.");
      return;
    }

    await driver.connect();
    const session = await startSession.mutateAsync({
      vehicleId: activeVehicleId,
      metadata: { adapterMode: mode },
    });
    setActiveSessionId(session.id);
    setStatus(`Connected. Session #${session.id} started.`);

    await flushPendingUploads();
  }

  async function readAndUpload() {
    if (!activeSessionId || !activeVehicleId) {
      setStatus("Start a scan session first.");
      return;
    }

    const result = await driver.readDtc();
    setReadResult(result);

    const uploadId = createUploadId();
    await enqueueScanUpload({
      id: uploadId,
      sessionId: activeSessionId,
      source: "obd_scan",
      capturedAt: result.capturedAt,
      dtcReadings: result.dtcCodes.map((dtcCode) => ({
        dtcCode,
        freezeFrame: result.freezeFrame ?? undefined,
      })),
    });

    const flush = await flushPendingUploads();
    if (flush.processed === 0) {
      setStatus(`Read ${result.dtcCodes.length} DTC code(s); queued for retry`);
      return;
    }

    setStatus(
      `Read ${result.dtcCodes.length} DTC code(s); processed ${flush.processed}, persisted ${flush.uploaded}`,
    );

    if (flush.uploaded > 0 && activeVehicleId) {
      router.push(`/scan-results?vehicleId=${activeVehicleId}` as never);
    }
  }

  function confirmAndClearCodes() {
    if (!activeVehicleId) {
      setStatus("Create or select a vehicle before clearing codes.");
      return;
    }

    const dtcCodes = readResult?.dtcCodes ?? [];
    if (dtcCodes.length === 0) {
      setStatus("No DTC codes available to clear.");
      return;
    }

    Alert.alert(
      "Clear Diagnostic Codes?",
      "Clearing codes can erase diagnostics that are needed for troubleshooting. Only continue if you understand the risk.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "I Understand",
          style: "destructive",
          onPress: () => {
            run(async () => {
              for (const dtcCode of dtcCodes) {
                await clearCode.mutateAsync({
                  vehicleId: activeVehicleId,
                  sessionId: activeSessionId ?? undefined,
                  dtcCode,
                  warningAcknowledged: true,
                });
              }

              setStatus(`Cleared ${dtcCodes.length} DTC code(s)`);
              setReadResult(null);
            });
          },
        },
      ],
    );
  }

  async function disconnectAndFinishSession() {
    await driver.disconnect();

    if (activeSessionId) {
      await finishSession.mutateAsync({
        sessionId: activeSessionId,
        status: "completed",
      });
      setActiveSessionId(null);
    }

    setStatus("Disconnected");
  }

  const activeVehicle = vehicles.data?.find((v) => v.id === activeVehicleId);

  return (
    <Container className="px-4 pt-2">
      <View className="gap-5">
        {/* Connection Status Hero */}
        <Animated.View entering={FadeInDown.duration(400).delay(50)}>
          <Card variant="elevated">
            <ConnectionIndicator state={driverState} />
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              {status}
            </Text>
          </Card>
        </Animated.View>

        {/* Active Vehicle Bar */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surfaceRecessed,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Ionicons
              name="car-outline"
              size={18}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{ color: colors.text, fontSize: 13, fontWeight: "500", flex: 1 }}
            >
              {activeVehicle
                ? `${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.modelYear})`
                : vehicles.isLoading
                  ? "Loading vehicles..."
                  : "No vehicle selected"}
            </Text>
          </View>
        </Animated.View>

        {/* Main Action */}
        <Animated.View entering={FadeInDown.duration(400).delay(150)}>
          <Button
            variant="primary"
            size="lg"
            icon="bluetooth-outline"
            isDisabled={busy || driverState === "connected"}
            isLoading={busy && driverState !== "connected"}
            onPress={() =>
              run(async () => {
                setStatus("Connecting...");
                await connectAndStartSession();
              })
            }
          >
            Connect & Start Scan
          </Button>
        </Animated.View>

        {/* Secondary Actions */}
        {driverState === "connected" && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View className="flex-row gap-3">
              <Button
                variant="secondary"
                size="md"
                icon="reader-outline"
                isDisabled={busy || !activeSessionId}
                isLoading={busy}
                onPress={() => run(readAndUpload)}
                style={{ flex: 1 }}
              >
                Read DTCs
              </Button>
              <Button
                variant="outline"
                size="md"
                icon="trash-outline"
                isDisabled={
                  busy ||
                  !readResult ||
                  readResult.dtcCodes.length === 0
                }
                onPress={confirmAndClearCodes}
                style={{ flex: 1 }}
              >
                Clear
              </Button>
            </View>
            <Button
              variant="ghost"
              size="sm"
              icon="power-outline"
              isDisabled={busy}
              onPress={() => run(disconnectAndFinishSession)}
              style={{ marginTop: 8 }}
            >
              Disconnect
            </Button>
          </Animated.View>
        )}

        {/* Vehicle Setup */}
        <Animated.View entering={FadeInDown.duration(400).delay(250)}>
          <Card variant="default">
            <SectionHeader
              title="Set Up Your Vehicle"
              subtitle="Enter your VIN to create a profile"
              icon="build-outline"
            />
            <View className="gap-3">
              <AppTextInput
                value={vinInput}
                onChangeText={setVinInput}
                placeholder="VIN (17 chars)"
                autoCapitalize="characters"
                autoCorrect={false}
                leftIcon="barcode-outline"
              />
              <View className="flex-row gap-3">
                <AppTextInput
                  value={countryCode}
                  onChangeText={(value) => setCountryCode(value.toUpperCase())}
                  placeholder="Country (US)"
                  autoCapitalize="characters"
                  containerClassName="flex-1"
                />
                <AppTextInput
                  value={stateCode}
                  onChangeText={(value) => setStateCode(value.toUpperCase())}
                  placeholder="State (CA)"
                  autoCapitalize="characters"
                  containerClassName="flex-1"
                />
              </View>
              <Button
                variant="secondary"
                isDisabled={
                  createFromVin.isPending || vinInput.trim().length !== 17
                }
                isLoading={createFromVin.isPending}
                onPress={() =>
                  createFromVin.mutate({
                    vin: vinInput,
                    countryCode,
                    stateCode: stateCode.trim() ? stateCode : undefined,
                  })
                }
              >
                Create From VIN
              </Button>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {onboardingStatus}
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* Compatible Adapters */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Pressable onPress={() => setShowAdapters(!showAdapters)}>
            <View className="flex-row items-center justify-between py-2">
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                Compatible Adapters ({adapters.data?.length ?? 0})
              </Text>
              <Ionicons
                name={showAdapters ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.textMuted}
              />
            </View>
          </Pressable>

          {showAdapters && (
            <View className="gap-2">
              {(adapters.data ?? []).map((entry) => (
                <Card key={entry.id} variant="recessed" noPadding>
                  <View style={{ padding: 12 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {entry.vendor} {entry.model}
                    </Text>
                    <Text
                      style={{ color: colors.textMuted, fontSize: 11 }}
                    >
                      {entry.connectionType} | iOS{" "}
                      {entry.iosSupported ? "✓" : "✗"} | Android{" "}
                      {entry.androidSupported ? "✓" : "✗"}
                    </Text>
                  </View>
                </Card>
              ))}
              {!adapters.isLoading && (adapters.data?.length ?? 0) === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  No active adapters configured yet.
                </Text>
              ) : null}
            </View>
          )}
        </Animated.View>
      </View>
    </Container>
  );
}
