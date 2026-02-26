import { env } from "@car-health-genius/env/server";
import { z } from "zod";

const vpICDecodeResponseSchema = z.object({
  Results: z.array(
    z.object({
      VIN: z.string().optional(),
      Make: z.string().optional(),
      Model: z.string().optional(),
      ModelYear: z.string().optional(),
      EngineModel: z.string().optional(),
      ErrorCode: z.string().optional(),
      ErrorText: z.string().optional(),
    }),
  ),
});

type VinDecodeErrorCode =
  | "VIN_DECODE_INVALID_INPUT"
  | "VIN_DECODE_TIMEOUT"
  | "VIN_DECODE_UNAVAILABLE"
  | "VIN_DECODE_NOT_FOUND";

export type VinDecodedVehicle = {
  make?: string;
  model?: string;
  modelYear?: number;
  engine?: string;
};

export type VinDecodeResult =
  | {
      ok: true;
      source: "nhtsa_vpic";
      retrievedAt: string;
      vin: string;
      decoded: VinDecodedVehicle;
      warning: string | null;
    }
  | {
      ok: false;
      source: "nhtsa_vpic";
      retrievedAt: string;
      vin: string;
      errorCode: VinDecodeErrorCode;
      message: string;
      manualFallback: true;
    };

function normalizeString(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  const lower = normalized.toLowerCase();
  if (lower === "0" || lower === "null" || lower === "not applicable" || lower === "not available") {
    return undefined;
  }

  return normalized;
}

function normalizeModelYear(value: string | undefined): number | undefined {
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || parsed < 1980 || parsed > new Date().getUTCFullYear() + 1) {
    return undefined;
  }

  return parsed;
}

function buildDecodeUrl(vin: string): URL {
  const baseUrl = new URL(env.NHTSA_VPIC_BASE_URL);
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, "")}/vehicles/DecodeVinValuesExtended/${vin}`;
  baseUrl.searchParams.set("format", "json");
  return baseUrl;
}

function isVinFormatValid(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
}

export async function decodeVin(vinInput: string): Promise<VinDecodeResult> {
  const vin = vinInput.trim().toUpperCase();
  const retrievedAt = new Date().toISOString();

  if (!isVinFormatValid(vin)) {
    return {
      ok: false,
      source: "nhtsa_vpic",
      retrievedAt,
      vin,
      errorCode: "VIN_DECODE_INVALID_INPUT",
      message: "VIN must be 17 characters and exclude invalid letters",
      manualFallback: true,
    };
  }

  const timeoutMs = env.NHTSA_VPIC_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildDecodeUrl(vin), {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        source: "nhtsa_vpic",
        retrievedAt,
        vin,
        errorCode: "VIN_DECODE_UNAVAILABLE",
        message: `VIN provider request failed with status ${response.status}`,
        manualFallback: true,
      };
    }

    const parsed = vpICDecodeResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return {
        ok: false,
        source: "nhtsa_vpic",
        retrievedAt,
        vin,
        errorCode: "VIN_DECODE_UNAVAILABLE",
        message: "VIN provider response format was invalid",
        manualFallback: true,
      };
    }

    const row = parsed.data.Results[0];
    if (!row) {
      return {
        ok: false,
        source: "nhtsa_vpic",
        retrievedAt,
        vin,
        errorCode: "VIN_DECODE_NOT_FOUND",
        message: "VIN decode did not return any records",
        manualFallback: true,
      };
    }

    const decoded: VinDecodedVehicle = {
      make: normalizeString(row.Make),
      model: normalizeString(row.Model),
      modelYear: normalizeModelYear(row.ModelYear),
      engine: normalizeString(row.EngineModel),
    };

    const hasCoreMetadata = Boolean(decoded.make && decoded.model && decoded.modelYear);

    if (!hasCoreMetadata) {
      return {
        ok: false,
        source: "nhtsa_vpic",
        retrievedAt,
        vin,
        errorCode: "VIN_DECODE_NOT_FOUND",
        message: "VIN decode returned incomplete metadata",
        manualFallback: true,
      };
    }

    const warningText = normalizeString(row.ErrorText);

    return {
      ok: true,
      source: "nhtsa_vpic",
      retrievedAt,
      vin,
      decoded,
      warning: warningText ?? null,
    };
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      source: "nhtsa_vpic",
      retrievedAt,
      vin,
      errorCode: isTimeout ? "VIN_DECODE_TIMEOUT" : "VIN_DECODE_UNAVAILABLE",
      message: isTimeout
        ? `VIN decode timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : "VIN decode failed",
      manualFallback: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}
