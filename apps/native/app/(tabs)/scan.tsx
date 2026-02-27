import { env } from "@car-health-genius/env/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, Input, Spinner, TextField } from "heroui-native";
import * as Network from "expo-network";
import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";

import { Container } from "@/components/container";
import { createAdapterDriver } from "@/src/modules/adapter";
import type { AdapterConnectionState, AdapterReadResult } from "@/src/modules/adapter";
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

export default function ScanTab() {
  const mode = env.EXPO_PUBLIC_ADAPTER_MODE;
  const driver = useMemo(() => createAdapterDriver({ mode }), [mode]);

  const [status, setStatus] = useState<string>("Idle");
  const [onboardingStatus, setOnboardingStatus] = useState<string>("No vehicle created in this session.");
  const [vinInput, setVinInput] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [stateCode, setStateCode] = useState("");
  const [driverState, setDriverState] = useState<AdapterConnectionState>(driver.getState());
  const [readResult, setReadResult] = useState<AdapterReadResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeVehicleId, setActiveVehicleId] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const adapters = useQuery(trpc.diagnostics.listCompatibleAdapters.queryOptions());
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
          setOnboardingStatus(`Created ${result.vehicle.make} ${result.vehicle.model} (${result.vehicle.modelYear})`);
          setActiveVehicleId(result.vehicle.id);
          await queryClient.invalidateQueries(trpc.vehicles.list.queryFilter());
        } else {
          setOnboardingStatus(`VIN fallback required: ${result.decode.message}`);
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

  const startSession = useMutation(trpc.diagnostics.startSession.mutationOptions());
  const ingestScan = useMutation(trpc.diagnostics.ingestScan.mutationOptions());
  const clearCode = useMutation(trpc.diagnostics.clearCode.mutationOptions());
  const finishSession = useMutation(trpc.diagnostics.finishSession.mutationOptions());

  useEffect(() => {
    setDriverState(driver.getState());
    return () => {
      driver.disconnect().catch(() => {});
    };
  }, [driver]);

  async function flushPendingUploads() {
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected || networkState.isInternetReachable === false) {
      return {
        processed: 0,
        uploaded: 0,
      };
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

        await markScanUploadFailed(item.id, error instanceof Error ? error.message : "Upload failed");
      }
    }

    return {
      processed,
      uploaded,
    };
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
      metadata: {
        adapterMode: mode,
      },
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

    setStatus(`Read ${result.dtcCodes.length} DTC code(s); processed ${flush.processed}, persisted ${flush.uploaded}`);
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
        {
          text: "Cancel",
          style: "cancel",
        },
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

  return (
    <Container className="p-6">
      <View className="gap-4">
        <Card variant="secondary" className="p-4">
          <Card.Title>Vehicle Onboarding</Card.Title>
          <Card.Description>VIN + US-only validation path (Sprint 2).</Card.Description>
          <View className="mt-3 gap-2">
            <TextField>
              <Input
                value={vinInput}
                onChangeText={setVinInput}
                placeholder="VIN (17 chars)"
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </TextField>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <TextField>
                  <Input
                    value={countryCode}
                    onChangeText={(value) => setCountryCode(value.toUpperCase())}
                    placeholder="Country (US)"
                    autoCapitalize="characters"
                  />
                </TextField>
              </View>
              <View className="flex-1">
                <TextField>
                  <Input
                    value={stateCode}
                    onChangeText={(value) => setStateCode(value.toUpperCase())}
                    placeholder="State (CA)"
                    autoCapitalize="characters"
                  />
                </TextField>
              </View>
            </View>
            <Button
              isDisabled={createFromVin.isPending || vinInput.trim().length !== 17}
              onPress={() =>
                createFromVin.mutate({
                  vin: vinInput,
                  countryCode,
                  stateCode: stateCode.trim() ? stateCode : undefined,
                })
              }
            >
              {createFromVin.isPending ? <Spinner size="sm" color="default" /> : "Create From VIN"}
            </Button>
            <Text className="text-muted text-xs">{onboardingStatus}</Text>
            <Text className="text-muted text-xs">
              Active vehicle:{" "}
              {activeVehicleId
                ? `#${activeVehicleId}`
                : vehicles.isLoading
                  ? "Loading..."
                  : "None selected. Create a vehicle first."}
            </Text>
          </View>
        </Card>

        <Card variant="secondary" className="p-4">
          <Card.Title>Scan Adapter Mode</Card.Title>
          <Card.Description>
            Current mode: {mode}. Use `simulated` for Expo Go, `ble` for dev builds.
          </Card.Description>
          <Card.Description>
            Session: {activeSessionId ? `#${activeSessionId}` : "Not started"}
          </Card.Description>
        </Card>

        <Card variant="secondary" className="p-4">
          <Card.Title>Adapter Driver</Card.Title>
          <Card.Description>State: {driverState}</Card.Description>
          <Card.Description>Status: {status}</Card.Description>

          <View className="mt-3 flex-row flex-wrap gap-2">
            <Button
              isDisabled={busy || driverState === "connected"}
              onPress={() =>
                run(async () => {
                  setStatus("Connecting...");
                  await connectAndStartSession();
                })
              }
            >
              {busy && driverState !== "connected" ? <Spinner size="sm" color="default" /> : "Connect"}
            </Button>
            <Button
              variant="secondary"
              isDisabled={busy || driverState !== "connected" || !activeSessionId}
              onPress={() =>
                run(async () => {
                  await readAndUpload();
                })
              }
            >
              Read + Upload DTC
            </Button>
            <Button
              variant="secondary"
              isDisabled={busy || driverState !== "connected" || !readResult || readResult.dtcCodes.length === 0}
              onPress={confirmAndClearCodes}
            >
              Clear DTC
            </Button>
            <Button
              variant="ghost"
              isDisabled={busy || driverState === "disconnected"}
              onPress={() =>
                run(async () => {
                  await disconnectAndFinishSession();
                })
              }
            >
              Disconnect
            </Button>
          </View>
        </Card>

        <Card variant="secondary" className="p-4">
          <Card.Title>Compatible Adapters</Card.Title>
          <Card.Description>
            {adapters.isLoading
              ? "Loading adapter list..."
              : `${adapters.data?.length ?? 0} active adapter(s) available`}
          </Card.Description>

          <View className="mt-3 gap-2">
            {(adapters.data ?? []).map((entry) => (
              <Card key={entry.id} className="p-3">
                <Text className="text-foreground text-sm font-semibold">
                  {entry.vendor} {entry.model}
                </Text>
                <Text className="text-muted text-xs">
                  {entry.connectionType} | iOS {entry.iosSupported ? "yes" : "no"} | Android{" "}
                  {entry.androidSupported ? "yes" : "no"}
                </Text>
              </Card>
            ))}

            {!adapters.isLoading && (adapters.data?.length ?? 0) === 0 ? (
              <Text className="text-muted text-xs">No active adapters configured yet.</Text>
            ) : null}
          </View>
        </Card>
      </View>
    </Container>
  );
}
