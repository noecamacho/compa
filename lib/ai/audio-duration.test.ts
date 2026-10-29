import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
const { AudioValidationError, validateAudio } = await import("./transcribe");

function wav(seconds: number): File {
  const sampleRate = 8000;
  const dataBytes = sampleRate * seconds;
  const bytes = new Uint8Array(44 + dataBytes);
  const view = new DataView(bytes.buffer);
  const tag = (offset: number, value: string) => bytes.set(new TextEncoder().encode(value), offset);
  tag(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  tag(36, "data");
  view.setUint32(40, dataBytes, true);
  return new File([bytes], "note.wav", { type: "audio/wav" });
}

describe("validateAudio duration", () => {
  test("accepts exactly two minutes", async () => {
    await expect(validateAudio(wav(120))).resolves.toBeUndefined();
  });

  test("rejects audio longer than two minutes", async () => {
    await expect(validateAudio(wav(121))).rejects.toBeInstanceOf(AudioValidationError);
    await expect(validateAudio(wav(121))).rejects.toMatchObject({ reason: "duration" });
  });
});
