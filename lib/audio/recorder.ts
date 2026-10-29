import { z } from "zod";

// Browser-only microphone recorder for /api/transcribe. No React; dependencies are injectable for tests.

const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"] as const;
const TICK_MS = 1000;
const DEFAULT_MAX_MS = 120_000; // 2-minute limit (wiki/ai-jobs.md, plan p. 11); the server does not check duration.

export type RecorderErrorReason = "unsupported" | "permission_denied" | "no_microphone" | "failed";

export class RecorderError extends Error {
  constructor(readonly reason: RecorderErrorReason, options?: ErrorOptions) {
    super(`recorder: ${reason}`, options);
    this.name = "RecorderError";
  }
}

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export type StreamLike = { getTracks(): { stop(): void }[] };

type RecorderLike = {
  readonly mimeType: string;
  readonly state: RecordingState;
  ondataavailable: ((event: BlobEvent) => void) | null;
  onstop: ((event: Event) => void) | null;
  start(timeslice?: number): void;
  stop(): void;
};

export type RecorderConstructor<S extends StreamLike> = {
  new (stream: S, options?: MediaRecorderOptions): RecorderLike;
  isTypeSupported(type: string): boolean;
};

// Runs fn every ms and returns a function that cancels it.
export type Interval = (fn: () => void, ms: number) => () => void;

// Generic over the stream so tests can pass a fake stream while the real MediaRecorder still type-checks.
export type RecorderDeps<S extends StreamLike = MediaStream> = {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<S>;
  Recorder: RecorderConstructor<S>;
  interval: Interval;
};

export type RecordingOptions = {
  maxMs?: number;
  onTick?: (elapsedMs: number) => void;
  onStop: (file: File) => void;
};

export type Recording = { stop(): void; cancel(): void };

const realInterval: Interval = (fn, ms) => {
  const id = setInterval(fn, ms);
  return () => clearInterval(id);
};

function browserDeps(): RecorderDeps | null {
  if (typeof MediaRecorder === "undefined") return null;
  if (!globalThis.navigator?.mediaDevices?.getUserMedia) return null;
  return {
    getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
    Recorder: MediaRecorder,
    interval: realInterval,
  };
}

export function pickMimeType(
  isSupported: (type: string) => boolean = (type) => MediaRecorder.isTypeSupported(type),
): string {
  return PREFERRED_MIME_TYPES.find((type) => isSupported(type)) ?? "";
}

const errorName = (error: unknown): string =>
  typeof error === "object" && error !== null && "name" in error && typeof error.name === "string"
    ? error.name
    : "";

function reasonFor(error: unknown): RecorderErrorReason {
  const name = errorName(error);
  if (name === "NotAllowedError" || name === "SecurityError") return "permission_denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no_microphone";
  return "failed";
}

async function requestMicrophone<S extends StreamLike>(deps: RecorderDeps<S>): Promise<S> {
  try {
    return await deps.getUserMedia({ audio: true });
  } catch (error) {
    throw new RecorderError(reasonFor(error), { cause: error });
  }
}

const releaseMicrophone = (stream: StreamLike) => stream.getTracks().forEach((track) => track.stop());

// The server accepts audio/webm and audio/mp4 (lib/ai/transcribe.ts); name the file to match.
function toFile(chunks: Blob[], mimeType: string): File {
  const type = mimeType || "audio/webm";
  const name = type.startsWith("audio/mp4") ? "audio.m4a" : "audio.webm";
  return new File(chunks, name, { type });
}

/**
 * Asks for the microphone and starts recording. Rejects with RecorderError when
 * recording is impossible; the UI then shows the text field (plan p. 12).
 */
export async function startRecording<S extends StreamLike>(
  options: RecordingOptions,
  deps?: RecorderDeps<S>,
): Promise<Recording> {
  if (deps) return record(options, deps);
  const browser = browserDeps();
  if (!browser) throw new RecorderError("unsupported");
  return record(options, browser);
}

async function record<S extends StreamLike>(
  { maxMs = DEFAULT_MAX_MS, onTick, onStop }: RecordingOptions,
  deps: RecorderDeps<S>,
): Promise<Recording> {
  const stream = await requestMicrophone(deps);
  const mimeType = pickMimeType((type) => deps.Recorder.isTypeSupported(type));
  const recorder = new deps.Recorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  let cancelled = false;
  let elapsedMs = 0;

  const stop = () => {
    if (recorder.state !== "inactive") recorder.stop();
    releaseMicrophone(stream);
  };
  const cancel = () => {
    cancelled = true;
    stop();
  };
  const stopTicking = deps.interval(() => {
    elapsedMs += TICK_MS;
    onTick?.(elapsedMs);
    if (elapsedMs >= maxMs) stop();
  }, TICK_MS);

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.onstop = () => {
    stopTicking();
    releaseMicrophone(stream);
    if (!cancelled) onStop(toFile(chunks, recorder.mimeType || mimeType));
  };
  recorder.start(TICK_MS);
  return { stop, cancel };
}

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

const TranscribeResponse = z.object({ text: z.string() });
const ErrorBody = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

async function toApiError(response: Response): Promise<ApiError> {
  const parsed = ErrorBody.safeParse(await response.json().catch(() => null));
  if (!parsed.success) return new ApiError(response.status, "unknown", response.statusText);
  return new ApiError(response.status, parsed.data.error.code, parsed.data.error.message);
}

/** POSTs the recording to /api/transcribe. Any ApiError means: show the text field. */
export async function uploadForTranscript(
  file: File,
  fetchImpl: FetchLike = fetch,
): Promise<{ text: string }> {
  const body = new FormData();
  body.append("audio", file);
  const response = await fetchImpl("/api/transcribe", { method: "POST", body }).catch((error: unknown) => {
    throw new ApiError(0, "network_error", errorName(error) || "network error");
  });
  if (!response.ok) throw await toApiError(response);
  const parsed = TranscribeResponse.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new ApiError(response.status, "bad_response", "unexpected transcribe response");
  return parsed.data;
}
