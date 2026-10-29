import { MAX_AUDIO_BYTES } from "../ai/transcribe";

export const MAX_AUDIO_BODY_BYTES = MAX_AUDIO_BYTES + 64 * 1024;

export class AudioUploadError extends Error {
  constructor() {
    super("invalid audio upload");
    this.name = "AudioUploadError";
  }
}

async function readBoundedBody(req: Request): Promise<Blob> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_AUDIO_BODY_BYTES) throw new AudioUploadError();
  const reader = req.body?.getReader();
  if (!reader) throw new AudioUploadError();
  const chunks: ArrayBuffer[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_AUDIO_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        throw new AudioUploadError();
      }
      const buffer = new ArrayBuffer(value.byteLength);
      new Uint8Array(buffer).set(value);
      chunks.push(buffer);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (error instanceof AudioUploadError) throw error;
    throw new AudioUploadError();
  }
  return new Blob(chunks);
}

export async function readAudioFile(req: Request): Promise<File> {
  const headers = new Headers(req.headers);
  headers.delete("content-length");
  const body = await readBoundedBody(req);
  const form = await new Request(req.url, { method: req.method, headers, body }).formData().catch(() => {
    throw new AudioUploadError();
  });
  const audio = form.get("audio");
  if (!(audio instanceof File)) throw new AudioUploadError();
  return audio;
}
