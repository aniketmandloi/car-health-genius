import type {
  AdapterCapability,
  AdapterClearResult,
  AdapterConnectionState,
  AdapterDriver,
  AdapterReadResult,
} from "../types";

function unsupportedError() {
  return new Error(
    "BLE adapter driver is not wired yet. Build a development client and complete react-native-ble-plx integration in Sprint 3.",
  );
}

export function createBleAdapterDriver(): AdapterDriver {
  let state: AdapterConnectionState = "disconnected";

  async function connect() {
    state = "connecting";
    throw unsupportedError();
  }

  async function disconnect() {
    state = "disconnected";
  }

  function supports(capability: AdapterCapability): boolean {
    return capability === "readDtc" || capability === "clearDtc" || capability === "freezeFrame";
  }

  async function readDtc(): Promise<AdapterReadResult> {
    throw unsupportedError();
  }

  async function clearDtc(_codes: string[]): Promise<AdapterClearResult> {
    throw unsupportedError();
  }

  return {
    kind: "ble",
    connect,
    disconnect,
    getState: () => state,
    supports,
    readDtc,
    clearDtc,
  };
}
