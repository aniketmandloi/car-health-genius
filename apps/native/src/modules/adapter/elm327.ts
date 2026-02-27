function toHexNibble(value: number): string {
  return value.toString(16).toUpperCase();
}

function decodeTypePrefix(byte1: number): "P" | "C" | "B" | "U" {
  const prefixBits = (byte1 & 0xc0) >> 6;
  if (prefixBits === 0) {
    return "P";
  }
  if (prefixBits === 1) {
    return "C";
  }
  if (prefixBits === 2) {
    return "B";
  }
  return "U";
}

function parseHexPairs(compactHex: string): number[] {
  const bytes: number[] = [];
  for (let index = 0; index + 1 < compactHex.length; index += 2) {
    const segment = compactHex.slice(index, index + 2);
    const parsed = Number.parseInt(segment, 16);
    if (!Number.isFinite(parsed)) {
      continue;
    }
    bytes.push(parsed);
  }
  return bytes;
}

function parseMode03Bytes(line: string): number[] {
  const compact = line.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
  if (!compact.startsWith("43")) {
    return [];
  }
  return parseHexPairs(compact.slice(2));
}

function decodeDtcCode(byte1: number, byte2: number): string {
  const prefix = decodeTypePrefix(byte1);
  const digit1 = toHexNibble((byte1 & 0x30) >> 4);
  const digit2 = toHexNibble(byte1 & 0x0f);
  const digit3 = toHexNibble((byte2 & 0xf0) >> 4);
  const digit4 = toHexNibble(byte2 & 0x0f);
  return `${prefix}${digit1}${digit2}${digit3}${digit4}`;
}

export function normalizeElm327Response(rawResponse: string): string {
  return rawResponse.replace(/\r/g, "\n").replace(/>/g, "").trim();
}

export function parseDtcCodesFromMode03(rawResponse: string): string[] {
  const normalized = normalizeElm327Response(rawResponse);
  const lines = normalized.split("\n").map((line) => line.trim());

  const codes = new Set<string>();
  for (const line of lines) {
    const bytes = parseMode03Bytes(line);
    for (let index = 0; index + 1 < bytes.length; index += 2) {
      const byte1 = bytes[index];
      const byte2 = bytes[index + 1];
      if (byte1 === undefined || byte2 === undefined) {
        continue;
      }

      if (byte1 === 0x00 && byte2 === 0x00) {
        continue;
      }

      const decoded = decodeDtcCode(byte1, byte2);
      if (decoded !== "P0000") {
        codes.add(decoded);
      }
    }
  }

  return [...codes];
}

export function isMode04Success(rawResponse: string): boolean {
  const normalized = normalizeElm327Response(rawResponse);
  const compact = normalized.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
  return compact.includes("44");
}

function textEncoderAvailable(): boolean {
  return typeof globalThis.btoa === "function" && typeof globalThis.atob === "function";
}

export function encodeCommandToBase64(command: string): string {
  if (!textEncoderAvailable()) {
    throw new Error("Base64 encoder is unavailable in this runtime");
  }
  return globalThis.btoa(command);
}

export function decodeBase64Response(encoded: string): string {
  if (!textEncoderAvailable()) {
    throw new Error("Base64 decoder is unavailable in this runtime");
  }
  return globalThis.atob(encoded);
}
