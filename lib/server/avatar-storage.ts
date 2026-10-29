import "server-only";
import { createClient } from "@supabase/supabase-js";

// LinkedIn photo URLs are signed and expire, so sign-in copies the picture to a public Storage bucket.
export const AVATAR_BUCKET = "avatars";
// The production bucket accepts up to 2 MB of jpeg, png or webp.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const FETCH_TIMEOUT_MS = 4000;

type StorageError = { message: string } | null;

// The slice of the supabase-js Storage client this module uses, so tests can pass a fake.
export type AvatarStorage = {
  createBucket(id: string, options: { public: boolean }): Promise<{ error: StorageError }>;
  from(bucket: string): {
    upload(path: string, body: Blob, options: { contentType: string; upsert: boolean }): Promise<{ error: StorageError }>;
    getPublicUrl(path: string): { data: { publicUrl: string } };
  };
};

export type MirrorDeps = { fetch: typeof fetch; storage: AvatarStorage | null; now: () => number };

function serviceStorage(): AvatarStorage | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage;
}

const defaultDeps = (): MirrorDeps => ({ fetch, storage: serviceStorage(), now: Date.now });

async function download(source: string, fetchFn: typeof fetch): Promise<Blob> {
  const response = await fetchFn(source, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`photo download failed: ${response.status}`);
  const blob = await response.blob();
  if (!PHOTO_TYPES.has(blob.type) || blob.size === 0 || blob.size > MAX_PHOTO_BYTES) throw new Error("photo is not a usable image");
  return blob;
}

const isMissingBucket = (error: StorageError) => Boolean(error && /bucket not found|not found/i.test(error.message));

async function upload(storage: AvatarStorage, path: string, photo: Blob): Promise<void> {
  const put = () => storage.from(AVATAR_BUCKET).upload(path, photo, { contentType: photo.type, upsert: true });
  const first = await put();
  if (!first.error) return;
  if (!isMissingBucket(first.error)) throw new Error(first.error.message);
  // Created lazily if missing (production already has it); a concurrent creation is fine because the retry tells.
  await storage.createBucket(AVATAR_BUCKET, { public: true });
  const retry = await put();
  if (retry.error) throw new Error(retry.error.message);
}

export const isMirroredPhoto = (url: string | null): boolean => Boolean(url?.includes(`/storage/v1/object/public/${AVATAR_BUCKET}/`));

// Returns the public Storage URL (versioned so caches refresh), or null when anything fails.
export async function mirrorPhoto(userId: string, source: string, deps: MirrorDeps = defaultDeps()): Promise<string | null> {
  if (!deps.storage) return null;
  const path = `${userId}.jpg`;
  try {
    await upload(deps.storage, path, await download(source, deps.fetch));
    const { publicUrl } = deps.storage.from(AVATAR_BUCKET).getPublicUrl(path).data;
    return `${publicUrl}?v=${deps.now()}`;
  } catch (error) {
    console.error("avatar mirror failed", error);
    return null;
  }
}

// Which URL to store: the fresh copy; else the copy we already have; else the (expiring) LinkedIn URL.
export const photoToStore = (mirrored: string | null, stored: string | null, linkedin: string): string =>
  mirrored ?? (isMirroredPhoto(stored) && stored ? stored : linkedin);
