import { describe, expect, mock, test } from "bun:test";
import type { TranscriptionClient } from "./transcribe";

mock.module("server-only", () => ({}));
const { AudioValidationError, MAX_AUDIO_BYTES, transcribe } = await import("./transcribe");

const fakeClient = (text: string) => {
  const calls: unknown[] = [];
  const client: TranscriptionClient = {
    audio: {
      transcriptions: {
        create: async (body) => {
          calls.push(body);
          return { text };
        },
      },
    },
  };
  return { client, calls };
};

const audio = (type: string, bytes = 10) => new File([new Uint8Array(bytes)], "note", { type });

function wav(): File {
  const sampleRate = 8000;
  const dataBytes = sampleRate;
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

describe("transcribe", () => {
  test("rejects an unsupported type", async () => {
    const { client } = fakeClient("x");
    await expect(transcribe(audio("text/plain"), client)).rejects.toBeInstanceOf(AudioValidationError);
  });

  test("rejects oversize audio", async () => {
    const { client } = fakeClient("x");
    const big = audio("audio/webm", MAX_AUDIO_BYTES + 1);
    await expect(transcribe(big, client)).rejects.toMatchObject({ reason: "size" });
  });

  test("returns the text and lets the model detect the spoken language", async () => {
    const { client, calls } = fakeClient("hola");
    expect(await transcribe(wav(), client)).toBe("hola");
    expect(calls[0]).not.toHaveProperty("language");
  });
});
