export type AdapterDriverKind = "simulated" | "ble";

export type AdapterCapability = "readDtc" | "clearDtc" | "freezeFrame";

export type AdapterConnectionState = "disconnected" | "connecting" | "connected";

export type AdapterReadResult = {
  dtcCodes: string[];
  freezeFrame: Record<string, unknown> | null;
  capturedAt: string;
};

export type AdapterClearResult = {
  cleared: boolean;
  clearedCodes: string[];
  clearedAt: string;
};

export type AdapterDriver = {
  kind: AdapterDriverKind;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getState: () => AdapterConnectionState;
  supports: (capability: AdapterCapability) => boolean;
  readDtc: () => Promise<AdapterReadResult>;
  clearDtc: (codes: string[]) => Promise<AdapterClearResult>;
};

export type AdapterDriverFactoryOptions = {
  mode: AdapterDriverKind;
};
