import { env } from "@car-health-genius/env/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, Input, Spinner, TextField } from "heroui-native";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { trpc } from "@/utils/trpc";
import { createAdapterDriver } from "../../../src/modules/adapter";
import type { AdapterConnectionState, AdapterReadResult } from "../../../src/modules/adapter";

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

  const adapters = useQuery(trpc.diagnostics.listCompatibleAdapters.queryOptions());

  const createFromVin = useMutation(
    trpc.vehicles.createFromVin.mutationOptions({
      onSuccess: (result) => {
        if (result.created) {
          setOnboardingStatus(`Created ${result.vehicle.make} ${result.vehicle.model} (${result.vehicle.modelYear})`);
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

  useEffect(() => {
    setDriverState(driver.getState());
    return () => {
      driver.disconnect().catch(() => {});
    };
  }, [driver]);

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
          </View>
        </Card>

        <Card variant="secondary" className="p-4">
          <Card.Title>Scan Adapter Mode</Card.Title>
          <Card.Description>
            Current mode: {mode}. Use `simulated` for Expo Go, `ble` for dev builds.
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
                  await driver.connect();
                  setStatus("Connected");
                })
              }
            >
              {busy && driverState !== "connected" ? <Spinner size="sm" color="default" /> : "Connect"}
            </Button>
            <Button
              variant="secondary"
              isDisabled={busy || driverState !== "connected"}
              onPress={() =>
                run(async () => {
                  const result = await driver.readDtc();
                  setReadResult(result);
                  setStatus(`Read ${result.dtcCodes.length} DTC code(s)`);
                })
              }
            >
              Read DTC
            </Button>
            <Button
              variant="secondary"
              isDisabled={busy || driverState !== "connected" || !readResult || readResult.dtcCodes.length === 0}
              onPress={() =>
                run(async () => {
                  const result = await driver.clearDtc(readResult?.dtcCodes ?? []);
                  setStatus(`Cleared ${result.clearedCodes.length} DTC code(s)`);
                  setReadResult(null);
                })
              }
            >
              Clear DTC
            </Button>
            <Button
              variant="ghost"
              isDisabled={busy || driverState === "disconnected"}
              onPress={() =>
                run(async () => {
                  await driver.disconnect();
                  setStatus("Disconnected");
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
            {(adapters.data ?? []).map((adapter) => (
              <Card key={adapter.id} className="p-3">
                <Text className="text-foreground text-sm font-semibold">
                  {adapter.vendor} {adapter.model}
                </Text>
                <Text className="text-muted text-xs">
                  {adapter.connectionType} | iOS {adapter.iosSupported ? "yes" : "no"} | Android{" "}
                  {adapter.androidSupported ? "yes" : "no"}
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
