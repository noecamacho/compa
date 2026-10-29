import { expect, mock, test } from "bun:test";
import type { UserRow } from "../../db/schema";

mock.module("server-only", () => ({}));
const { profileChanges } = await import("./profile");

const user = {
  name: "Lucía Fernández",
  photoUrl: "https://project.supabase.co/storage/v1/object/public/avatars/u1.jpg",
  links: { x: "https://x.com/lucia" },
} as UserRow;

test("saving the profile unchanged does not mark name or photo as edited, so LinkedIn can still refresh them", () => {
  expect(profileChanges(user, { name: user.name, photoUrl: user.photoUrl })).toEqual({});
});

test("a real edit marks the field so sign-in never overwrites it", () => {
  expect(profileChanges(user, { name: "Lucía F." })).toEqual({ name: "Lucía F.", nameEdited: true });
});

test("links merge: typed values are normalized, empty ones removed", () => {
  expect(profileChanges(user, { links: { whatsapp: "+52 33 1234 5678", x: "" } })).toEqual({ links: { whatsapp: "https://wa.me/523312345678" } });
});
