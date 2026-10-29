import { describe, expect, test } from "bun:test";
import { AudioValidationError, MAX_AUDIO_BYTES, transcribe, type TranscriptionClient } from "./transcribe";

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

  test("returns the text from the client and asks for Spanish", async () => {
    const { client, calls } = fakeClient("hola");
    expect(await transcribe(audio("audio/webm;codecs=opus"), client)).toBe("hola");
    expect(calls[0]).toMatchObject({ language: "es" });
  });
});
