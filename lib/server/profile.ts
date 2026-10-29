import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db/client";
import { connections, interests, userInterests, users, type UserRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import type { MeT } from "../api/schemas";
import { hasEnded, statusForViewer } from "../connection-status";
import { mergeLinks } from "../links";
import { toCard } from "../visibility";
import { cardFor, findCurrentEvent, findUserByHandle, interestNamesFor, pairCondition } from "./people";

async function buildMe(user: UserRow): Promise<MeT> {
  const now = new Date();
  const [names, current] = await Promise.all([interestNamesFor([user.id]), findCurrentEvent(user.id, now)]);
  const card = toCard({ ...user, interests: names.get(user.id) ?? [] }, "self");
  return {
    ...card,
    email: user.email,
    visibility: user.visibility,
    nameEdited: user.nameEdited,
    photoEdited: user.photoEdited,
    isAdmin: user.isAdmin,
    currentEvent: current ? { slug: current.slug, name: current.name } : null,
  };
}

export async function getMe({ user }: InputOf<typeof R.getMe>): ResultOf<typeof R.getMe> {
  return { body: await buildMe(user) };
}

type PatchMe = InputOf<typeof R.patchMe>["body"];

function profileChanges(user: UserRow, body: PatchMe): Partial<typeof users.$inferInsert> {
  const changes: Partial<typeof users.$inferInsert> = {};
  if (body.name !== undefined) Object.assign(changes, { name: body.name, nameEdited: true });
  if (body.photoUrl !== undefined) Object.assign(changes, { photoUrl: body.photoUrl, photoEdited: true });
  if (body.headline !== undefined) changes.headline = body.headline || null;
  if (body.company !== undefined) changes.company = body.company || null;
  if (body.links) changes.links = mergeLinks(user.links, body.links);
  return changes;
}

async function existingInterestIds(ids: number[]): Promise<number[]> {
  if (ids.length === 0) return [];
  const rows = await getDb().select({ id: interests.id }).from(interests).where(inArray(interests.id, ids));
  if (rows.length !== new Set(ids).size) fail(E.invalidInput, "Unknown interest id.");
  return rows.map((row) => row.id);
}

export async function patchMe({ user, body }: InputOf<typeof R.patchMe>): ResultOf<typeof R.patchMe> {
  const interestIds = body.interestIds ? await existingInterestIds(body.interestIds) : undefined;
  const changes = profileChanges(user, body);
  const updated = await getDb().transaction(async (tx) => {
    const [row] = Object.keys(changes).length
      ? await tx.update(users).set(changes).where(eq(users.id, user.id)).returning()
      : [user];
    if (!interestIds) return row ?? user;
    await tx.delete(userInterests).where(eq(userInterests.userId, user.id));
    if (interestIds.length) await tx.insert(userInterests).values(interestIds.map((interestId) => ({ userId: user.id, interestId })));
    return row ?? user;
  });
  return { body: await buildMe(updated) };
}

export async function patchVisibility({ user, body }: InputOf<typeof R.patchVisibility>): ResultOf<typeof R.patchVisibility> {
  const current = user.visibility;
  const visibility = {
    headline: body.headline ?? current.headline,
    company: body.company ?? current.company,
    interests: body.interests ?? current.interests,
    links: { ...current.links, ...body.links },
  };
  await getDb().update(users).set({ visibility }).where(eq(users.id, user.id));
  return { body: visibility };
}

export async function listInterests(): ResultOf<typeof R.listInterests> {
  const rows = await getDb().select().from(interests).orderBy(interests.id);
  return { body: rows };
}

async function relationAtCurrentEvent(viewer: UserRow, owner: UserRow) {
  const now = new Date();
  const event = await findCurrentEvent(owner.id, now);
  if (!event) return undefined;
  const [row] = await getDb()
    .select()
    .from(connections)
    .where(and(eq(connections.eventId, event.id), pairCondition(viewer.id, owner.id)))
    .limit(1);
  if (!row) return undefined;
  const status = statusForViewer({ ...row, viewerId: viewer.id, eventEnded: hasEnded(event, now) });
  return { status, eventSlug: event.slug, ...(row.kind ? { kind: row.kind } : {}) };
}

export async function getUser({ user, params }: InputOf<typeof R.getUser>): ResultOf<typeof R.getUser> {
  const owner = (await findUserByHandle(params.handle)) ?? fail(E.userNotFound);
  const [card, connection] = await Promise.all([cardFor(user.id, owner), relationAtCurrentEvent(user, owner)]);
  return { body: connection ? { card, connection } : { card } };
}
