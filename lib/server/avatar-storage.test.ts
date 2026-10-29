import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
const { mirrorPhoto, photoToStore } = await import("./avatar-storage");
import type { AvatarStorage, MirrorDeps } from "./avatar-storage";

const LINKEDIN = "https://media.licdn.com/dms/image/abc?e=1&t=signed";
const PUBLIC = "https://project.supabase.co/storage/v1/object/public/avatars/u1.jpg";

const imageResponse = () => new Response(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }));

function fakeStorage(uploadErrors: (string | null)[]) {
  const calls = { uploads: [] as string[], buckets: [] as string[] };
  const storage: AvatarStorage = {
    createBucket: async (id) => {
      calls.buckets.push(id);
      return { error: null };
    },
    from: () => ({
      upload: async (path) => {
        calls.uploads.push(path);
        const message = uploadErrors.shift() ?? null;
        return { error: message ? { message } : null };
      },
      getPublicUrl: () => ({ data: { publicUrl: PUBLIC } }),
    }),
  };
  return { storage, calls };
}

const deps = (storage: AvatarStorage | null, fetchFn: typeof fetch = (async () => imageResponse()) as unknown as typeof fetch): MirrorDeps => ({
  fetch: fetchFn,
  storage,
  now: () => 42,
});

describe("mirrorPhoto", () => {
  test("uploads to <userId>.jpg and returns the versioned public URL", async () => {
    const { storage, calls } = fakeStorage([null]);
    expect(await mirrorPhoto("u1", LINKEDIN, deps(storage))).toBe(`${PUBLIC}?v=42`);
    expect(calls.uploads).toEqual(["u1.jpg"]);
  });

  test("creates the public bucket when it is missing, then retries", async () => {
    const { storage, calls } = fakeStorage(["Bucket not found", null]);
    expect(await mirrorPhoto("u1", LINKEDIN, deps(storage))).toBe(`${PUBLIC}?v=42`);
    expect(calls.buckets).toEqual(["avatars"]);
    expect(calls.uploads).toHaveLength(2);
  });

  test("returns null when the upload fails", async () => {
    const { storage } = fakeStorage(["permission denied"]);
    expect(await mirrorPhoto("u1", LINKEDIN, deps(storage))).toBeNull();
  });

  test("returns null for an oversized or unsupported image", async () => {
    const { storage } = fakeStorage([null]);
    const big = (async () => new Response(new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: "image/jpeg" }))) as unknown as typeof fetch;
    const gif = (async () => new Response(new Blob([new Uint8Array([1])], { type: "image/gif" }))) as unknown as typeof fetch;
    expect(await mirrorPhoto("u1", LINKEDIN, deps(storage, big))).toBeNull();
    expect(await mirrorPhoto("u1", LINKEDIN, deps(storage, gif))).toBeNull();
  });

  test("returns null when the download fails or is not an image", async () => {
    const { storage } = fakeStorage([null]);
    const notFound = (async () => new Response("no", { status: 403 })) as unknown as typeof fetch;
    const html = (async () => new Response("<html>", { headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
    expect(await mirrorPhoto("u1", LINKEDIN, deps(storage, notFound))).toBeNull();
    expect(await mirrorPhoto("u1", LINKEDIN, deps(storage, html))).toBeNull();
  });

  test("without Storage configured it does nothing", async () => {
    expect(await mirrorPhoto("u1", LINKEDIN, deps(null))).toBeNull();
  });
});

describe("photoToStore (upload fallback)", () => {
  test("a fresh copy wins", () => {
    expect(photoToStore(`${PUBLIC}?v=2`, `${PUBLIC}?v=1`, LINKEDIN)).toBe(`${PUBLIC}?v=2`);
  });
  test("a failed upload keeps the copy we already have", () => {
    expect(photoToStore(null, `${PUBLIC}?v=1`, LINKEDIN)).toBe(`${PUBLIC}?v=1`);
  });
  test("a failed upload with no copy keeps the LinkedIn URL", () => {
    expect(photoToStore(null, LINKEDIN, LINKEDIN)).toBe(LINKEDIN);
    expect(photoToStore(null, null, LINKEDIN)).toBe(LINKEDIN);
  });
});
