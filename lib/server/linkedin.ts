import "server-only";
import type { User } from "@supabase/supabase-js";
import { eq, like } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db/client";
import { users, type UserRow } from "../../db/schema";
import { handleBase, pickHandle } from "../handle";
import { findUserByAuthId } from "./auth";
import { isUniqueViolation } from "./people";

// Claims Supabase stores for `linkedin_oidc` in user_metadata (untrusted input, so parsed).
const LinkedInClaims = z.looseObject({
  sub: z.string().optional(),
  provider_id: z.string().optional(),
  name: z.string().optional(),
  full_name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  picture: z.string().optional(),
  avatar_url: z.string().optional(),
  email: z.string().optional(),
});

type Profile = { linkedinSub: string; name: string; photoUrl: string | null; email: string | null; raw: unknown };

function profileFrom(authUser: User): Profile {
  const claims = LinkedInClaims.parse(authUser.user_metadata ?? {});
  const identity = authUser.identities?.find((item) => item.provider === "linkedin_oidc");
  const joined = [claims.given_name, claims.family_name].filter(Boolean).join(" ");
  return {
    linkedinSub: identity?.id ?? claims.sub ?? claims.provider_id ?? authUser.id,
    name: claims.name ?? claims.full_name ?? (joined || "COMPA"),
    photoUrl: claims.picture ?? claims.avatar_url ?? null,
    email: authUser.email ?? claims.email ?? null,
    raw: claims,
  };
}

async function takenHandles(base: string): Promise<Set<string>> {
  const rows = await getDb().select({ handle: users.handle }).from(users).where(like(users.handle, `${base}%`));
  return new Set(rows.map((row) => row.handle));
}

async function insertUser(authUserId: string, profile: Profile, attempt = 0): Promise<UserRow> {
  const base = handleBase(profile.name);
  const handle = attempt === 0 ? pickHandle(base, await takenHandles(base)) : `${base}-${crypto.randomUUID().slice(0, 4)}`;
  try {
    const [row] = await getDb()
      .insert(users)
      .values({
        authUserId,
        linkedinSub: profile.linkedinSub,
        handle,
        name: profile.name,
        photoUrl: profile.photoUrl,
        email: profile.email,
        linkedinRaw: profile.raw,
        linkedinSyncedAt: new Date(),
      })
      .returning();
    if (!row) throw new Error("user insert returned nothing");
    return row;
  } catch (error) {
    if (!isUniqueViolation(error) || attempt >= 3) throw error;
    return insertUser(authUserId, profile, attempt + 1);
  }
}

// M14: every sign-in refreshes the LinkedIn claims; name and photo only when the person never edited them.
async function syncUser(existing: UserRow, profile: Profile): Promise<UserRow> {
  const [row] = await getDb()
    .update(users)
    .set({
      linkedinRaw: profile.raw,
      linkedinSyncedAt: new Date(),
      email: profile.email ?? existing.email,
      ...(existing.nameEdited ? {} : { name: profile.name }),
      ...(existing.photoEdited ? {} : { photoUrl: profile.photoUrl }),
    })
    .where(eq(users.id, existing.id))
    .returning();
  return row ?? existing;
}

export async function upsertLinkedInUser(authUser: User): Promise<UserRow> {
  const profile = profileFrom(authUser);
  const existing = await findUserByAuthId(authUser.id);
  return existing ? syncUser(existing, profile) : insertUser(authUser.id, profile);
}
