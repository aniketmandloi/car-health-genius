"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function mapMutationError(error: unknown): string {
  const businessCode = extractBusinessCode(error);
  if (businessCode === "UNSUPPORTED_GEOGRAPHY") {
    return "US-only launch: set Country to US to continue.";
  }

  if (error instanceof Error) {
    return error.message;
  }
  return "Request failed";
}

export default function VehiclesPage() {
  const vehicles = useQuery(trpc.vehicles.list.queryOptions());
  const adapters = useQuery(trpc.diagnostics.listCompatibleAdapters.queryOptions());

  const [vin, setVin] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [stateCode, setStateCode] = useState("");
  const [mileage, setMileage] = useState("");
  const [manualMake, setManualMake] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [manualYear, setManualYear] = useState("");
  const [manualEngine, setManualEngine] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const createFromVin = useMutation(
    trpc.vehicles.createFromVin.mutationOptions({
      onSuccess: async (result) => {
        if (result.created) {
          setStatusMessage(`Created vehicle ${result.vehicle.make} ${result.vehicle.model} (${result.vehicle.modelYear})`);
          setVin("");
          await queryClient.invalidateQueries(trpc.vehicles.list.queryFilter());
          return;
        }

        setStatusMessage(`VIN decode fallback required: ${result.decode.message}`);
      },
      onError: (error) => {
        setStatusMessage(mapMutationError(error));
      },
    }),
  );

  const createManual = useMutation(
    trpc.vehicles.create.mutationOptions({
      onSuccess: async (result) => {
        setStatusMessage(`Created vehicle ${result.make} ${result.model} (${result.modelYear})`);
        setManualMake("");
        setManualModel("");
        setManualYear("");
        setManualEngine("");
        setMileage("");
        await queryClient.invalidateQueries(trpc.vehicles.list.queryFilter());
      },
      onError: (error) => {
        setStatusMessage(mapMutationError(error));
      },
    }),
  );

  const parsedMileage = useMemo(() => {
    if (!mileage.trim()) {
      return undefined;
    }
    const parsed = Number.parseInt(mileage, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [mileage]);

  return (
    <div className="container mx-auto max-w-5xl p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>VIN Onboarding</CardTitle>
            <CardDescription>Decode VIN first, then fallback to manual if needed.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Label htmlFor="vin-input">VIN</Label>
            <Input id="vin-input" value={vin} onChange={(event) => setVin(event.target.value)} placeholder="1HGCM82633A123456" />

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="country-code-input">Country</Label>
                <Input
                  id="country-code-input"
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value.toUpperCase())}
                  placeholder="US"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state-code-input">State</Label>
                <Input
                  id="state-code-input"
                  value={stateCode}
                  onChange={(event) => setStateCode(event.target.value.toUpperCase())}
                  placeholder="CA"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mileage-input">Mileage</Label>
              <Input
                id="mileage-input"
                value={mileage}
                onChange={(event) => setMileage(event.target.value)}
                placeholder="120000"
                inputMode="numeric"
              />
            </div>

            <Button
              disabled={createFromVin.isPending || vin.trim().length !== 17}
              onClick={() =>
                createFromVin.mutate({
                  vin,
                  mileage: parsedMileage,
                  countryCode,
                  stateCode: stateCode.trim() ? stateCode : undefined,
                })
              }
            >
              {createFromVin.isPending ? "Decoding..." : "Create From VIN"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual Fallback</CardTitle>
            <CardDescription>Use this when VIN decode is unavailable or incomplete.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input value={manualMake} onChange={(event) => setManualMake(event.target.value)} placeholder="Make" />
            <Input value={manualModel} onChange={(event) => setManualModel(event.target.value)} placeholder="Model" />
            <Input
              value={manualYear}
              onChange={(event) => setManualYear(event.target.value)}
              placeholder="Model year"
              inputMode="numeric"
            />
            <Input value={manualEngine} onChange={(event) => setManualEngine(event.target.value)} placeholder="Engine (optional)" />

            <Button
              disabled={
                createManual.isPending ||
                !manualMake.trim() ||
                !manualModel.trim() ||
                Number.parseInt(manualYear, 10) < 1980
              }
              onClick={() =>
                createManual.mutate({
                  make: manualMake,
                  model: manualModel,
                  modelYear: Number.parseInt(manualYear, 10),
                  engine: manualEngine.trim() ? manualEngine : undefined,
                  mileage: parsedMileage,
                  countryCode,
                  stateCode: stateCode.trim() ? stateCode : undefined,
                })
              }
            >
              {createManual.isPending ? "Saving..." : "Create Manually"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {statusMessage ? (
        <Card className="mt-4">
          <CardContent className="pt-2">
            <p>{statusMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Vehicles</CardTitle>
            <CardDescription>{vehicles.isLoading ? "Loading..." : `${vehicles.data?.length ?? 0} vehicles`}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {(vehicles.data ?? []).map((entry) => (
              <div key={entry.id} className="border px-3 py-2 text-xs">
                {entry.make} {entry.model} ({entry.modelYear}) - {entry.countryCode}
                {entry.stateCode ? `-${entry.stateCode}` : ""}
              </div>
            ))}
            {!vehicles.isLoading && (vehicles.data?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">No vehicles yet.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compatible Adapters</CardTitle>
            <CardDescription>{adapters.isLoading ? "Loading..." : `${adapters.data?.length ?? 0} active adapters`}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {(adapters.data ?? []).map((entry) => (
              <div key={entry.id} className="border px-3 py-2 text-xs">
                {entry.vendor} {entry.model} ({entry.connectionType}) - iOS {entry.iosSupported ? "yes" : "no"}, Android{" "}
                {entry.androidSupported ? "yes" : "no"}
              </div>
            ))}
            {!adapters.isLoading && (adapters.data?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">No active adapters configured.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
