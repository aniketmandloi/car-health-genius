import { z } from "zod";

const jsonRecordSchema = z.record(z.string(), z.unknown());

const dtcCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(16)
  .regex(/^[A-Za-z0-9-]+$/)
  .transform((value) => value.toUpperCase());

export const scanReadingInputSchema = z.object({
  dtcCode: dtcCodeSchema,
  severity: z.string().trim().min(1).max(64).optional(),
  freezeFrame: jsonRecordSchema.optional(),
  sensorSnapshot: jsonRecordSchema.optional(),
  occurredAt: z.coerce.date().optional(),
});

export const ingestScanInputSchema = z.object({
  sessionId: z.number().int().positive(),
  uploadId: z
    .string()
    .trim()
    .min(8)
    .max(64)
    .regex(/^[A-Za-z0-9:_-]+$/),
  source: z.string().trim().min(1).max(64).optional(),
  capturedAt: z.coerce.date().optional(),
  dtcReadings: z.array(scanReadingInputSchema).min(1).max(100),
});

export type IngestScanInput = z.infer<typeof ingestScanInputSchema>;
export type ScanReadingInput = z.infer<typeof scanReadingInputSchema>;

export function buildIngestIdempotencyKey(uploadId: string, index: number): string {
  return `${uploadId}:${index}`;
}

export function normalizeIngestScanInput(input: IngestScanInput): IngestScanInput {
  return {
    ...input,
    source: input.source ?? "obd_scan",
    dtcReadings: input.dtcReadings.map((reading) => ({
      ...reading,
      dtcCode: reading.dtcCode.trim().toUpperCase(),
      severity: reading.severity?.trim() || "unknown",
    })),
  };
}
