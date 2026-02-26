import { createBleAdapterDriver } from "./drivers/blePlx";
import { createSimulatedAdapterDriver } from "./drivers/simulated";
import type { AdapterDriver, AdapterDriverFactoryOptions } from "./types";

export function createAdapterDriver(options: AdapterDriverFactoryOptions): AdapterDriver {
  if (options.mode === "ble") {
    return createBleAdapterDriver();
  }

  return createSimulatedAdapterDriver();
}

export type {
  AdapterCapability,
  AdapterClearResult,
  AdapterConnectionState,
  AdapterDriver,
  AdapterDriverKind,
  AdapterDriverFactoryOptions,
  AdapterReadResult,
} from "./types";
