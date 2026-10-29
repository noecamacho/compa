import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
const { MAX_AUDIO_BODY_BYTES, AudioUploadError, readAudioFile } = await import("./audio-upload");

const wav = (seconds: number) => {
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
};

const requestWithAudio = (file: File) => {
  const form = new FormData();
  form.append("audio", file);
  return new Request("http://localhost/api/transcribe", { method: "POST", body: form });
};

describe("readAudioFile", () => {
  test("reads a file from a bounded multipart request", async () => {
    const audio = await readAudioFile(requestWithAudio(wav(1)));
    expect(audio.type).toBe("audio/x-wav");
    expect(audio.size).toBeGreaterThan(44);
  });

  test("rejects multipart bodies over the request limit", async () => {
    const request = requestWithAudio(new File([new Uint8Array(MAX_AUDIO_BODY_BYTES)], "large.wav", { type: "audio/wav" }));
    await expect(readAudioFile(request)).rejects.toBeInstanceOf(AudioUploadError);
  });
});
