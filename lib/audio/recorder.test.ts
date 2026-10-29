import { describe, expect, test } from "bun:test";
import {
  ApiError,
  pickMimeType,
  RecorderError,
  startRecording,
  uploadForTranscript,
  type Interval,
  type RecorderDeps,
} from "./recorder";

class FakeTrack {
  stopped = false;
  stop() {
    this.stopped = true;
  }
}

class FakeStream {
  readonly tracks = [new FakeTrack()];
  getTracks() {
    return this.tracks;
  }
}

class FakeBlobEvent extends Event {
  readonly timecode = 0;
  constructor(readonly data: Blob) {
    super("dataavailable");
  }
}

const supporting = (...types: string[]) => (type: string) => types.includes(type);

function fakeDeps(supported: string[] = ["audio/webm;codecs=opus"]) {
  const stream = new FakeStream();
  const ticks: (() => void)[] = [];
  class FakeRecorder {
    static isTypeSupported = supporting(...supported);
    state: RecordingState = "inactive";
    readonly mimeType: string;
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: ((event: Event) => void) | null = null;
    constructor(_stream: FakeStream, options?: MediaRecorderOptions) {
      this.mimeType = options?.mimeType ?? "";
    }
    start() {
      this.state = "recording";
    }
    stop() {
      if (this.state === "inactive") return;
      this.state = "inactive";
      this.ondataavailable?.(new FakeBlobEvent(new Blob(["sound"])));
      this.onstop?.(new Event("stop"));
    }
  }
  const interval: Interval = (fn) => {
    ticks.push(fn);
    return () => ticks.splice(0);
  };
  const deps: RecorderDeps<FakeStream> = {
    getUserMedia: async () => stream,
    Recorder: FakeRecorder,
    interval,
  };
  return { deps, stream, tick: () => ticks.forEach((fn) => fn()) };
}

describe("pickMimeType", () => {
  test("prefers webm with opus", () => {
    expect(pickMimeType(supporting("audio/mp4", "audio/webm", "audio/webm;codecs=opus"))).toBe(
      "audio/webm;codecs=opus",
    );
  });

  test("falls back to plain webm", () => {
    expect(pickMimeType(supporting("audio/webm", "audio/mp4"))).toBe("audio/webm");
  });

  test("uses mp4 on iOS Safari", () => {
    expect(pickMimeType(supporting("audio/mp4"))).toBe("audio/mp4");
  });

  test("returns an empty string so the browser chooses", () => {
    expect(pickMimeType(() => false)).toBe("");
  });
});

describe("startRecording", () => {
  test("stops by itself at maxMs and hands over a webm file", async () => {
    const { deps, stream, tick } = fakeDeps();
    const files: File[] = [];
    const elapsed: number[] = [];
    await startRecording({ maxMs: 3000, onTick: (ms) => elapsed.push(ms), onStop: (f) => files.push(f) }, deps);
    tick();
    tick();
    expect(files).toHaveLength(0);
    tick();
    expect(elapsed).toEqual([1000, 2000, 3000]);
    expect(files[0]?.name).toBe("audio.webm");
    expect(files[0]?.type).toBe("audio/webm;codecs=opus");
    expect(stream.tracks[0]?.stopped).toBe(true);
  });

  test("names an iOS recording audio.m4a", async () => {
    const { deps } = fakeDeps(["audio/mp4"]);
    const files: File[] = [];
    const recording = await startRecording({ onStop: (f) => files.push(f) }, deps);
    recording.stop();
    expect(files[0]?.name).toBe("audio.m4a");
  });

  test("stop releases the microphone", async () => {
    const { deps, stream } = fakeDeps();
    const recording = await startRecording({ onStop: () => {} }, deps);
    expect(stream.tracks[0]?.stopped).toBe(false);
    recording.stop();
    expect(stream.tracks[0]?.stopped).toBe(true);
  });

  test("cancel releases the microphone and delivers no file", async () => {
    const { deps, stream } = fakeDeps();
    const files: File[] = [];
    const recording = await startRecording({ onStop: (f) => files.push(f) }, deps);
    recording.cancel();
    expect(stream.tracks[0]?.stopped).toBe(true);
    expect(files).toHaveLength(0);
  });

  test("permission denied rejects with a typed error", async () => {
    const { deps } = fakeDeps();
    const denied = {
      ...deps,
      getUserMedia: () => Promise.reject(new DOMException("denied", "NotAllowedError")),
    };
    const result = startRecording({ onStop: () => {} }, denied);
    await expect(result).rejects.toBeInstanceOf(RecorderError);
    await expect(result).rejects.toMatchObject({ reason: "permission_denied" });
  });

  test("a recorder that fails to start releases the microphone", async () => {
    const { deps, stream } = fakeDeps();
    class BrokenRecorder extends deps.Recorder {
      start(): void {
        throw new DOMException("bad type", "NotSupportedError");
      }
    }
    const result = startRecording({ onStop: () => {} }, { ...deps, Recorder: BrokenRecorder });
    await expect(result).rejects.toMatchObject({ reason: "failed" });
    expect(stream.tracks[0]?.stopped).toBe(true);
  });

  test("no MediaRecorder in this runtime rejects as unsupported", async () => {
    await expect(startRecording({ onStop: () => {} })).rejects.toMatchObject({ reason: "unsupported" });
  });
});

describe("uploadForTranscript", () => {
  const file = new File(["sound"], "audio.webm", { type: "audio/webm" });

  test("posts multipart audio and returns the text", async () => {
    const calls: [string, RequestInit][] = [];
    const fakeFetch = async (input: string, init: RequestInit) => {
      calls.push([input, init]);
      return Response.json({ text: "Hablamos de React." });
    };
    expect(await uploadForTranscript(file, fakeFetch)).toEqual({ text: "Hablamos de React." });
    const [url, init] = calls[0] ?? [];
    expect(url).toBe("/api/transcribe");
    expect(init?.method).toBe("POST");
    expect(init?.body instanceof FormData && init.body.get("audio")).toBeInstanceOf(File);
  });

  test("surfaces a 502 as a typed error with the server code", async () => {
    const body = { error: { code: "transcription_failed", message: "STT failed" } };
    const fakeFetch = async () => Response.json(body, { status: 502 });
    const result = uploadForTranscript(file, fakeFetch);
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({ status: 502, code: "transcription_failed" });
  });
});
