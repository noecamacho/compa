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

  test("accepts a MediaRecorder webm that has no duration in its header", async () => {
    await expect(validateAudio(chromeWebm())).resolves.toBeUndefined();
  });

  test("rejects bytes that are not audio", async () => {
    const junk = new File([new TextEncoder().encode("not audio at all")], "note.webm", { type: "audio/webm" });
    await expect(validateAudio(junk)).rejects.toMatchObject({ reason: "duration" });
  });
});

// EBML header, a Segment of unknown size and an Info with no Duration element, as Chrome writes it.
function chromeWebm(): File {
  const ascii = (text: string) => Array.from(new TextEncoder().encode(text));
  const bytes = new Uint8Array([
    0x1a, 0x45, 0xdf, 0xa3, 0x87, 0x42, 0x82, 0x84, ...ascii("webm"),
    0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0x15, 0x49, 0xa9, 0x66, 0x87, 0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40,
    0x16, 0x54, 0xae, 0x6b, 0x90, 0xae, 0x8e, 0xd7, 0x81, 0x01, 0x83, 0x81, 0x02, 0x86, 0x86, ...ascii("A_OPUS"),
  ]);
  return new File([bytes], "audio.webm", { type: "audio/webm;codecs=opus" });
}
