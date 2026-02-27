import { PermissionsAndroid, Platform } from "react-native";

import {
  decodeBase64Response,
  encodeCommandToBase64,
  isMode04Success,
  normalizeElm327Response,
  parseDtcCodesFromMode03,
} from "../elm327";
import type {
  AdapterCapability,
  AdapterClearResult,
  AdapterConnectionState,
  AdapterDriver,
  AdapterReadResult,
} from "../types";

const BLE_MODULE_NAME = "react-native-ble-plx";
const SCAN_TIMEOUT_MS = 12_000;
const BLE_READY_TIMEOUT_MS = 15_000;
const COMMAND_TIMEOUT_MS = 8_000;

type ScanSubscription = {
  remove: () => void;
};

type BleCharacteristic = {
  uuid: string;
  serviceUUID: string;
  value: string | null;
  isWritableWithResponse: boolean | null;
  isWritableWithoutResponse: boolean | null;
  isNotifiable: boolean | null;
  isIndicatable: boolean | null;
};

type BleService = {
  uuid: string;
};

type BleDevice = {
  id: string;
  name: string | null;
  localName: string | null;
  connect: (options?: Record<string, unknown>) => Promise<BleDevice>;
  discoverAllServicesAndCharacteristics: () => Promise<BleDevice>;
  services: () => Promise<BleService[]>;
  characteristicsForService: (serviceUUID: string) => Promise<BleCharacteristic[]>;
  cancelConnection: () => Promise<BleDevice>;
  isConnected: () => Promise<boolean>;
};

type BleManager = {
  state: () => Promise<string>;
  onStateChange: (listener: (newState: string) => void, emitCurrentState?: boolean) => ScanSubscription;
  startDeviceScan: (
    serviceUUIDs: string[] | null,
    options: Record<string, unknown> | null,
    listener: (error: Error | null, scannedDevice: BleDevice | null) => void,
  ) => void;
  stopDeviceScan: () => void;
  connectToDevice: (deviceId: string, options?: Record<string, unknown>) => Promise<BleDevice>;
  monitorCharacteristicForDevice: (
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    listener: (error: Error | null, characteristic: BleCharacteristic | null) => void,
  ) => ScanSubscription;
  writeCharacteristicWithResponseForDevice: (
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    valueBase64: string,
  ) => Promise<BleCharacteristic>;
  writeCharacteristicWithoutResponseForDevice: (
    deviceId: string,
    serviceUUID: string,
    characteristicUUID: string,
    valueBase64: string,
  ) => Promise<BleCharacteristic>;
  destroy: () => void;
};

type BleTransport = {
  serviceUUID: string;
  writeUUID: string;
  readUUID: string;
  writeWithResponse: boolean;
};

const DEVICE_NAME_PATTERNS = [/obd/i, /obdii/i, /obd2/i, /elm/i, /vgate/i, /vlink/i];

const KNOWN_GATT_PROFILES = [
  {
    serviceUUID: "0000FFE0-0000-1000-8000-00805F9B34FB",
    writeUUID: "0000FFE1-0000-1000-8000-00805F9B34FB",
    readUUID: "0000FFE1-0000-1000-8000-00805F9B34FB",
  },
  {
    serviceUUID: "6E400001-B5A3-F393-E0A9-E50E24DCCA9E",
    writeUUID: "6E400002-B5A3-F393-E0A9-E50E24DCCA9E",
    readUUID: "6E400003-B5A3-F393-E0A9-E50E24DCCA9E",
  },
] as const;

function normalizeUuid(uuid: string): string {
  return uuid.toUpperCase();
}

function unsupportedError(message: string) {
  return new Error(
    `BLE adapter is unavailable: ${message}. Install react-native-ble-plx and run an Expo development build.`,
  );
}

async function loadBleManagerCtor(): Promise<new () => BleManager> {
  try {
    const moduleName = BLE_MODULE_NAME;
    const imported = (await import(moduleName)) as {
      BleManager?: unknown;
    };
    if (typeof imported.BleManager !== "function") {
      throw unsupportedError("BleManager export is missing");
    }
    return imported.BleManager as new () => BleManager;
  } catch (error) {
    throw unsupportedError(error instanceof Error ? error.message : "failed to import module");
  }
}

async function ensureAndroidPermissions() {
  if (Platform.OS !== "android") {
    return;
  }

  const version =
    typeof Platform.Version === "string"
      ? Number.parseInt(Platform.Version, 10)
      : Number.parseInt(String(Platform.Version), 10);
  const sdk = Number.isFinite(version) ? version : 0;

  const permissions =
    sdk >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const results = await PermissionsAndroid.requestMultiple(permissions);
  const denied = Object.entries(results).filter(([, result]) => result !== PermissionsAndroid.RESULTS.GRANTED);

  if (denied.length > 0) {
    throw new Error(`Missing Bluetooth permissions: ${denied.map(([permission]) => permission).join(", ")}`);
  }
}

async function waitForBlePoweredOn(manager: BleManager) {
  const current = await manager.state();
  if (current === "PoweredOn") {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscription.remove();
      reject(new Error("Bluetooth did not reach PoweredOn state"));
    }, BLE_READY_TIMEOUT_MS);

    const subscription = manager.onStateChange((nextState) => {
      if (nextState === "PoweredOn") {
        clearTimeout(timeout);
        subscription.remove();
        resolve();
      }
    }, true);
  });
}

function deviceNameScore(device: BleDevice): number {
  const name = `${device.name ?? ""} ${device.localName ?? ""}`.trim();
  if (name.length === 0) {
    return 0;
  }

  let score = 0;
  for (const pattern of DEVICE_NAME_PATTERNS) {
    if (pattern.test(name)) {
      score += 1;
    }
  }
  return score;
}

async function scanForAdapter(manager: BleManager): Promise<BleDevice> {
  return await new Promise<BleDevice>((resolve, reject) => {
    let settled = false;
    let bestDevice: BleDevice | null = null;
    let bestScore = -1;

    const finish = (error: Error | null, device: BleDevice | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      manager.stopDeviceScan();

      if (error) {
        reject(error);
        return;
      }
      if (!device) {
        reject(new Error("No compatible BLE OBD adapter found"));
        return;
      }
      resolve(device);
    };

    const timeout = setTimeout(() => {
      finish(null, bestDevice);
    }, SCAN_TIMEOUT_MS);

    manager.startDeviceScan(null, null, (error, scannedDevice) => {
      if (error) {
        finish(error, null);
        return;
      }
      if (!scannedDevice) {
        return;
      }

      const score = deviceNameScore(scannedDevice);
      if (score > bestScore) {
        bestScore = score;
        bestDevice = scannedDevice;
      }

      if (score >= 2 && bestDevice) {
        finish(null, bestDevice);
      }
    });
  });
}

function isCharacteristicWritable(characteristic: BleCharacteristic): boolean {
  return Boolean(characteristic.isWritableWithResponse || characteristic.isWritableWithoutResponse);
}

function isCharacteristicNotifiable(characteristic: BleCharacteristic): boolean {
  return Boolean(characteristic.isNotifiable || characteristic.isIndicatable);
}

async function discoverTransport(device: BleDevice): Promise<BleTransport> {
  const services = await device.services();
  const serviceCharacteristics = new Map<string, BleCharacteristic[]>();

  for (const service of services) {
    const chars = await device.characteristicsForService(service.uuid);
    serviceCharacteristics.set(normalizeUuid(service.uuid), chars);
  }

  for (const profile of KNOWN_GATT_PROFILES) {
    const serviceUUID = normalizeUuid(profile.serviceUUID);
    const chars = serviceCharacteristics.get(serviceUUID);
    if (!chars) {
      continue;
    }

    const writeCharacteristic = chars.find((entry) => normalizeUuid(entry.uuid) === normalizeUuid(profile.writeUUID));
    const readCharacteristic = chars.find((entry) => normalizeUuid(entry.uuid) === normalizeUuid(profile.readUUID));
    if (!writeCharacteristic || !readCharacteristic) {
      continue;
    }

    return {
      serviceUUID: writeCharacteristic.serviceUUID,
      writeUUID: writeCharacteristic.uuid,
      readUUID: readCharacteristic.uuid,
      writeWithResponse: Boolean(writeCharacteristic.isWritableWithResponse),
    };
  }

  for (const chars of serviceCharacteristics.values()) {
    const writeCharacteristic = chars.find((entry) => isCharacteristicWritable(entry));
    const readCharacteristic =
      chars.find((entry) => isCharacteristicNotifiable(entry)) ??
      chars.find((entry) => normalizeUuid(entry.uuid) === normalizeUuid(writeCharacteristic?.uuid ?? ""));

    if (writeCharacteristic && readCharacteristic) {
      return {
        serviceUUID: writeCharacteristic.serviceUUID,
        writeUUID: writeCharacteristic.uuid,
        readUUID: readCharacteristic.uuid,
        writeWithResponse: Boolean(writeCharacteristic.isWritableWithResponse),
      };
    }
  }

  throw new Error("No compatible BLE transport characteristics found on connected adapter");
}

function normalizeCommand(command: string): string {
  return `${command.trim()}\r`;
}

export function createBleAdapterDriver(): AdapterDriver {
  let state: AdapterConnectionState = "disconnected";
  let manager: BleManager | null = null;
  let connectedDevice: BleDevice | null = null;
  let transport: BleTransport | null = null;

  async function ensureConnected() {
    if (!manager || !connectedDevice || !transport || state !== "connected") {
      throw new Error("BLE adapter is not connected");
    }
    return {
      manager,
      connectedDevice,
      transport,
    };
  }

  async function sendCommand(command: string): Promise<string> {
    const context = await ensureConnected();
    const payload = encodeCommandToBase64(normalizeCommand(command));

    return await new Promise<string>((resolve, reject) => {
      let buffer = "";
      let settled = false;

      const cleanup = (subscription: ScanSubscription, timeout: ReturnType<typeof setTimeout>) => {
        clearTimeout(timeout);
        subscription.remove();
      };

      const finalize = (
        subscription: ScanSubscription,
        timeout: ReturnType<typeof setTimeout>,
        result: { ok: true; value: string } | { ok: false; error: Error },
      ) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup(subscription, timeout);
        if (result.ok) {
          resolve(result.value);
        } else {
          reject(result.error);
        }
      };

      const timeout = setTimeout(() => {
        finalize(subscription, timeout, { ok: false, error: new Error(`Timed out waiting for response to '${command}'`) });
      }, COMMAND_TIMEOUT_MS);

      const subscription = context.manager.monitorCharacteristicForDevice(
        context.connectedDevice.id,
        context.transport.serviceUUID,
        context.transport.readUUID,
        (error, characteristic) => {
          if (error) {
            finalize(subscription, timeout, { ok: false, error });
            return;
          }

          if (!characteristic?.value) {
            return;
          }

          try {
            const chunk = decodeBase64Response(characteristic.value);
            buffer += chunk;
            if (buffer.includes(">")) {
              finalize(subscription, timeout, { ok: true, value: buffer });
            }
          } catch (decodeError) {
            finalize(subscription, timeout, {
              ok: false,
              error: decodeError instanceof Error ? decodeError : new Error("Failed to decode BLE payload"),
            });
          }
        },
      );

      const writer = context.transport.writeWithResponse
        ? context.manager.writeCharacteristicWithResponseForDevice.bind(context.manager)
        : context.manager.writeCharacteristicWithoutResponseForDevice.bind(context.manager);

      writer(context.connectedDevice.id, context.transport.serviceUUID, context.transport.writeUUID, payload).catch(
        (writeError: unknown) => {
          finalize(subscription, timeout, {
            ok: false,
            error: writeError instanceof Error ? writeError : new Error("Failed to write BLE command"),
          });
        },
      );
    });
  }

  async function initializeElm327() {
    const setupCommands = ["AT Z", "AT E0", "AT L0", "AT S0", "AT H0", "AT SP0"];
    for (const command of setupCommands) {
      try {
        await sendCommand(command);
      } catch (error) {
        console.warn(
          JSON.stringify({
            level: "warn",
            event: "ble.elm327.setup.error",
            command,
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        );
      }
    }
  }

  async function connect() {
    if (state === "connected") {
      return;
    }

    state = "connecting";

    try {
      await ensureAndroidPermissions();
      const BleManagerCtor = await loadBleManagerCtor();
      manager = new BleManagerCtor();

      await waitForBlePoweredOn(manager);
      const scanned = await scanForAdapter(manager);
      const connected = await manager.connectToDevice(scanned.id, {
        autoConnect: false,
      });

      connectedDevice = await connected.discoverAllServicesAndCharacteristics();
      transport = await discoverTransport(connectedDevice);
      state = "connected";

      await initializeElm327();
    } catch (error) {
      state = "disconnected";
      if (connectedDevice) {
        await connectedDevice.cancelConnection().catch(() => {});
      }
      connectedDevice = null;
      transport = null;
      if (manager) {
        manager.destroy();
      }
      manager = null;
      throw error;
    }
  }

  async function disconnect() {
    if (connectedDevice) {
      await connectedDevice.cancelConnection().catch(() => {});
    }

    connectedDevice = null;
    transport = null;
    if (manager) {
      manager.destroy();
    }
    manager = null;
    state = "disconnected";
  }

  function supports(capability: AdapterCapability): boolean {
    return capability === "readDtc" || capability === "clearDtc" || capability === "freezeFrame";
  }

  async function readDtc(): Promise<AdapterReadResult> {
    const rawResponse = await sendCommand("03");
    const dtcCodes = parseDtcCodesFromMode03(rawResponse);

    return {
      dtcCodes,
      freezeFrame: {
        source: "elm327",
        rawResponse: normalizeElm327Response(rawResponse),
      },
      capturedAt: new Date().toISOString(),
    };
  }

  async function clearDtc(codes: string[]): Promise<AdapterClearResult> {
    const rawResponse = await sendCommand("04");
    if (!isMode04Success(rawResponse)) {
      throw new Error("ELM327 did not acknowledge clear command");
    }

    return {
      cleared: true,
      clearedCodes: codes.map((code) => code.trim().toUpperCase()),
      clearedAt: new Date().toISOString(),
    };
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
