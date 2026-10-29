// Event access codes (data model M19): the unguessable part of the event QR, compa.lol/e/<code>.
// Lowercase letters and digits without look-alikes (0/o, 1/l/i), so a code survives being read aloud or retyped.
export const ACCESS_CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const ACCESS_CODE_LENGTH = 10;

// Accepts generated codes and the 12-hex-character codes the migration backfilled for existing events.
const ACCESS_CODE_PATTERN = /^[a-z0-9]{8,32}$/;

// Largest multiple of the alphabet size below 256: bytes at or above it are dropped so every symbol is equally likely.
const UNBIASED_LIMIT = 256 - (256 % ACCESS_CODE_ALPHABET.length);

type RandomBytes = (size: number) => Uint8Array;

const cryptoBytes: RandomBytes = (size) => crypto.getRandomValues(new Uint8Array(size));

export function generateAccessCode(randomBytes: RandomBytes = cryptoBytes): string {
  let code = "";
  while (code.length < ACCESS_CODE_LENGTH) {
    for (const byte of randomBytes(ACCESS_CODE_LENGTH * 2)) {
      if (byte >= UNBIASED_LIMIT || code.length === ACCESS_CODE_LENGTH) continue;
      code += ACCESS_CODE_ALPHABET[byte % ACCESS_CODE_ALPHABET.length];
    }
  }
  return code;
}

// Normalizes what a person or a QR scanner sends (case, spaces); null when it cannot be a code at all.
export function parseAccessCode(input: string | null | undefined): string | null {
  const code = (input ?? "").trim().toLowerCase();
  return ACCESS_CODE_PATTERN.test(code) ? code : null;
}

// Next.js hands the /e/[code] segment over still percent-encoded (`/e/%20code` arrives as "%20code"), so the pages
// decode it once before re-encoding it for the API; a malformed escape stays as is and fails like any unknown code.
export function codeFromSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export const eventPath = (code: string): string => `/e/${code}`;

export const joinUrl = (origin: string, code: string): string => `${origin.replace(/\/$/, "")}${eventPath(code)}`;
