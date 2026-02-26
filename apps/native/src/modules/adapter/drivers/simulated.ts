import type {
  AdapterClearResult,
  AdapterConnectionState,
  AdapterDriver,
  AdapterReadResult,
} from "../types";

const SIMULATED_DTC_CODES = ["P0420", "P0171"];

function nowIso() {
  return new Date().toISOString();
}

export function createSimulatedAdapterDriver(): AdapterDriver {
  let state: AdapterConnectionState = "disconnected";
  let activeCodes = [...SIMULATED_DTC_CODES];

  async function connect() {
    state = "connecting";
    await new Promise((resolve) => setTimeout(resolve, 200));
    state = "connected";
  }

  async function disconnect() {
    state = "disconnected";
  }

  function assertConnected() {
    if (state !== "connected") {
      throw new Error("Adapter is not connected");
    }
  }

  async function readDtc(): Promise<AdapterReadResult> {
    assertConnected();
    return {
      dtcCodes: [...activeCodes],
      freezeFrame: {
        engineLoadPct: 42.6,
        coolantTempC: 89,
        rpm: 1850,
      },
      capturedAt: nowIso(),
    };
  }

  async function clearDtc(codes: string[]): Promise<AdapterClearResult> {
    assertConnected();

    const requestedCodes = new Set(codes.map((code) => code.trim().toUpperCase()));
    const clearedCodes = activeCodes.filter((code) => requestedCodes.has(code));
    activeCodes = activeCodes.filter((code) => !requestedCodes.has(code));

    return {
      cleared: true,
      clearedCodes,
      clearedAt: nowIso(),
    };
  }

  return {
    kind: "simulated",
    connect,
    disconnect,
    getState: () => state,
    supports: () => true,
    readDtc,
    clearDtc,
  };
}
