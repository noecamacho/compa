import { parseBlob } from "music-metadata";
import type { TranscriptionCreateParamsNonStreaming } from "openai/resources/audio/transcriptions";
import { getOpenAI } from "./openai";

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
export const MAX_AUDIO_DURATION_SECONDS = 120;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

export class AudioValidationError extends Error {
  constructor(readonly reason: "type" | "size" | "empty" | "duration") {
    super(`invalid audio: ${reason}`);
    this.name = "AudioValidationError";
  }
}

export type TranscriptionClient = {
  audio: {
    transcriptions: {
      create(body: TranscriptionCreateParamsNonStreaming<"json">): Promise<{ text: string }>;
    };
  };
};

// Browsers send codec params ("audio/webm;codecs=opus"); compare the base type only.
const baseType = (type: string) => type.split(";")[0]?.trim().toLowerCase() ?? "";

export async function validateAudio(file: File): Promise<void> {
  if (!ALLOWED_AUDIO_TYPES.has(baseType(file.type))) throw new AudioValidationError("type");
  if (file.size === 0) throw new AudioValidationError("empty");
  if (file.size > MAX_AUDIO_BYTES) throw new AudioValidationError("size");
  let duration: number | undefined;
  try {
    duration = (await parseBlob(file, { duration: true })).format.duration;
  } catch {
    throw new AudioValidationError("duration");
  }
  if (duration === undefined || !Number.isFinite(duration) || duration > MAX_AUDIO_DURATION_SECONDS) {
    throw new AudioValidationError("duration");
  }
}

// The File stays in memory and goes straight to OpenAI; it is never written to disk (plan p. 12).
export async function transcribe(
  file: File,
  client: TranscriptionClient = getOpenAI(),
): Promise<string> {
  await validateAudio(file);
  const result = await client.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_STT_MODEL || "gpt-4o-mini-transcribe",
    language: "es",
    response_format: "json",
  });
  return result.text;
}
