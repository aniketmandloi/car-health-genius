import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "car-health-genius.scan-upload-queue.v1";
const MAX_BACKOFF_MS = 60_000;
const BASE_BACKOFF_MS = 1_000;

type PendingScanUploadReading = {
  dtcCode: string;
  freezeFrame?: Record<string, unknown>;
};

export type PendingScanUpload = {
  id: string;
  sessionId: number;
  source: string;
  capturedAt: string;
  dtcReadings: PendingScanUploadReading[];
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
  lastError: string | null;
};

type PendingScanUploadInput = {
  id: string;
  sessionId: number;
  source: string;
  capturedAt: string;
  dtcReadings: PendingScanUploadReading[];
};

function backoffMsForAttempt(attempt: number): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(BASE_BACKOFF_MS * 2 ** exponent, MAX_BACKOFF_MS);
}

async function readQueue(): Promise<PendingScanUpload[]> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is PendingScanUpload => Boolean(entry && typeof entry === "object"));
  } catch {
    return [];
  }
}

async function writeQueue(entries: PendingScanUpload[]): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(entries));
}

export async function enqueueScanUpload(input: PendingScanUploadInput): Promise<PendingScanUpload> {
  const queue = await readQueue();
  const existing = queue.find((entry) => entry.id === input.id);
  if (existing) {
    return existing;
  }

  const next: PendingScanUpload = {
    ...input,
    attempts: 0,
    nextAttemptAt: Date.now(),
    createdAt: Date.now(),
    lastError: null,
  };

  queue.push(next);
  await writeQueue(queue);
  return next;
}

export async function listReadyScanUploads(now = Date.now()): Promise<PendingScanUpload[]> {
  const queue = await readQueue();
  return queue
    .filter((entry) => entry.nextAttemptAt <= now)
    .sort((a, b) => a.nextAttemptAt - b.nextAttemptAt || a.createdAt - b.createdAt);
}

export async function markScanUploadSucceeded(uploadId: string): Promise<void> {
  const queue = await readQueue();
  const filtered = queue.filter((entry) => entry.id !== uploadId);
  if (filtered.length === queue.length) {
    return;
  }

  await writeQueue(filtered);
}

export async function markScanUploadFailed(uploadId: string, errorMessage: string, now = Date.now()): Promise<void> {
  const queue = await readQueue();
  const updated = queue.map((entry) => {
    if (entry.id !== uploadId) {
      return entry;
    }

    const attempts = entry.attempts + 1;
    return {
      ...entry,
      attempts,
      lastError: errorMessage,
      nextAttemptAt: now + backoffMsForAttempt(attempts),
    };
  });

  await writeQueue(updated);
}
