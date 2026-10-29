import { describe, expect, test } from "bun:test";
import { linkedInPhotoKey, shouldSyncPhoto } from "./linkedin-photo";

const PHOTO = "https://media.licdn.com/dms/image/v2/D4E03AQ/profile-displayphoto-shrink_100_100/0/1690000000000?e=1&v=beta&t=first";
const SAME_PHOTO_NEW_SIGNATURE = "https://media.licdn.com/dms/image/v2/D4E03AQ/profile-displayphoto-shrink_100_100/0/1690000000000?e=2&v=beta&t=second";
const NEW_PHOTO = "https://media.licdn.com/dms/image/v2/E5F14BR/profile-displayphoto-shrink_100_100/0/1730000000000?e=2&v=beta&t=third";

const linkedInUser = { photoEdited: false, avatarMode: "photo" as const, linkedinPhotoKey: linkedInPhotoKey(PHOTO) };

describe("shouldSyncPhoto", () => {
  test("first sign-in copies the photo", () => {
    expect(shouldSyncPhoto({ ...linkedInUser, linkedinPhotoKey: null }, PHOTO, false)).toBe(true);
  });

  test("re-login with the same photo does nothing, even with a new signature", () => {
    expect(shouldSyncPhoto(linkedInUser, SAME_PHOTO_NEW_SIGNATURE, true)).toBe(false);
  });

  test("re-login with a changed LinkedIn photo refreshes it", () => {
    expect(shouldSyncPhoto(linkedInUser, NEW_PHOTO, true)).toBe(true);
  });

  test("a chosen monito is never overwritten, even when LinkedIn changed", () => {
    expect(shouldSyncPhoto({ ...linkedInUser, avatarMode: "monito" }, NEW_PHOTO, true)).toBe(false);
  });

  test("an own photo is never overwritten", () => {
    expect(shouldSyncPhoto({ ...linkedInUser, photoEdited: true }, NEW_PHOTO, false)).toBe(false);
  });

  test("retries when the earlier copy failed and we only hold the expiring LinkedIn URL", () => {
    expect(shouldSyncPhoto(linkedInUser, SAME_PHOTO_NEW_SIGNATURE, false)).toBe(true);
  });

  test("no LinkedIn photo keeps whatever we have", () => {
    expect(shouldSyncPhoto(linkedInUser, null, false)).toBe(false);
  });
});

test("linkedInPhotoKey drops the signature but keeps the image path", () => {
  expect(linkedInPhotoKey(PHOTO)).toBe(linkedInPhotoKey(SAME_PHOTO_NEW_SIGNATURE));
  expect(linkedInPhotoKey(PHOTO)).not.toBe(linkedInPhotoKey(NEW_PHOTO));
  expect(linkedInPhotoKey("not a url")).toBe("not a url");
});
