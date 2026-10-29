// When sign-in may refresh the picture from LinkedIn (owner decision, 2026-10-29): only while the person still shows
// their LinkedIn photo, and only when that photo changed. Pure, so it is tested without a database or LinkedIn.
import type { AvatarMode } from "./avatar-mode";

type PhotoState = { photoEdited: boolean; avatarMode: AvatarMode; linkedinPhotoKey: string | null };

// LinkedIn signs its picture URLs and the signature changes on every sign-in; the path names the image itself.
export function linkedInPhotoKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

// `mirrored` says whether we already hold our own copy; without one (a failed earlier copy) we try again.
export function shouldSyncPhoto(user: PhotoState, linkedinUrl: string | null, mirrored: boolean): boolean {
  if (!linkedinUrl) return false;
  // A monito or an own photo is a permanent choice; sign-in never overwrites it.
  if (user.photoEdited || user.avatarMode !== "photo") return false;
  return !mirrored || user.linkedinPhotoKey !== linkedInPhotoKey(linkedinUrl);
}
