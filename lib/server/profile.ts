import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { connections, events, interests, userInterests, users, type EventRow, type UserRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import type { MeT } from "../api/schemas";
import { hasEnded, statusForViewer } from "../connection-status";
import { mergeLinks } from "../links";
import { withDefaultVisibility } from "../profile-fields";
import { toCard } from "../visibility";
import { earnedBadgeIds } from "./badges";
import { latestInteraction } from "./connection-detail";
import { cardFor, cardsFor, connectedPeers, findCurrentEvent, findUserByHandle, interestNamesFor, pairCondition, usersByIds } from "./people";
import { scoresFor, statsFor } from "./scores";

async function buildMe(user: UserRow): Promise<MeT> {
  const db = getDb();
  const now = new Date();
  const current = await findCurrentEvent(user.id, now, db);
  const [names, scores, stats, badges] = await Promise.all([
    interestNamesFor([user.id], db),
    scoresFor(user.id, current, db),
    statsFor(user.id, db),
    earnedBadgeIds(user.id, db),
  ]);
  const card = toCard({ ...user, interests: names.get(user.id) ?? [] }, "self");
  return {
    ...card,
    email: user.email,
    visibility: withDefaultVisibility(user.visibility),
    nameEdited: user.nameEdited,
    photoEdited: user.photoEdited,
    isAdmin: user.isAdmin,
    currentEvent: current ? { code: current.accessCode, name: current.name } : null,
    stats,
    scores,
    badges,
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
  if (body.city !== undefined) changes.city = body.city || null;
  if (body.avatar !== undefined) changes.avatar = body.avatar;
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
  const current = withDefaultVisibility(user.visibility);
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

async function relationAtCurrentEvent(viewer: UserRow, owner: UserRow, event: EventRow | undefined, db: Executor) {
  if (!event) return undefined;
  const now = new Date();
  const [row] = await db
    .select()
    .from(connections)
    .where(and(eq(connections.eventId, event.id), pairCondition(viewer.id, owner.id)))
    .limit(1);
  if (!row) return undefined;
  const status = statusForViewer({ ...row, viewerId: viewer.id, eventEnded: hasEnded(event, now) });
  return { status, eventSlug: event.slug, ...(row.kind ? { kind: row.kind } : {}) };
}

// Accepted connections between the two, newest first, with their events.
async function pairHistory(viewer: UserRow, owner: UserRow, db: Executor) {
  return db
    .select({ row: connections, event: events })
    .from(connections)
    .innerJoin(events, eq(events.id, connections.eventId))
    .where(and(eq(connections.status, "accepted"), pairCondition(viewer.id, owner.id)))
    .orderBy(connections.respondedAt);
}

async function mutualConnections(viewer: UserRow, owner: UserRow, db: Executor) {
  const ids = async (userId: string) =>
    (
      await db
        .select({ requesterId: connections.requesterId, addresseeId: connections.addresseeId })
        .from(connections)
        .where(and(eq(connections.status, "accepted"), or(eq(connections.requesterId, userId), eq(connections.addresseeId, userId))))
    ).map((row) => (row.requesterId === userId ? row.addresseeId : row.requesterId));
  const [mine, theirs] = await Promise.all([ids(viewer.id), ids(owner.id)]);
  const shared = mine.filter((id) => theirs.includes(id) && id !== viewer.id && id !== owner.id);
  const people = await usersByIds([...new Set(shared)], db);
  return [...(await cardsFor(viewer.id, people, db)).values()];
}

// Everything the "other person" screen shows once the two are connected (V2PerfilOtro).
async function connectedExtras(viewer: UserRow, owner: UserRow, db: Executor) {
  const history = await pairHistory(viewer, owner, db);
  const latest = history.at(-1);
  const [mutual, note] = await Promise.all([mutualConnections(viewer, owner, db), latest ? latestInteraction(latest.row.id, db) : undefined]);
  return {
    relationship: {
      reconnections: history.filter(({ row }) => row.kind === "reconnection").length,
      eventsTogether: new Set(history.map(({ event }) => event.id)).size,
      mutual,
    },
    lastInteraction:
      note && latest
        ? { connectionId: latest.row.id, title: note.title ?? note.summary.split(".")[0] ?? note.summary, topics: note.topics, at: (note.approvedAt ?? note.createdAt).toISOString() }
        : null,
  };
}

export async function getUser({ user, params }: InputOf<typeof R.getUser>): ResultOf<typeof R.getUser> {
  const db = getDb();
  const owner = (await findUserByHandle(params.handle)) ?? fail(E.userNotFound);
  const now = new Date();
  const event = await findCurrentEvent(owner.id, now, db);
  const [card, connection, scores, stats, badges, connected] = await Promise.all([
    cardFor(user.id, owner, db),
    relationAtCurrentEvent(user, owner, event, db),
    scoresFor(owner.id, event, db),
    statsFor(owner.id, db),
    earnedBadgeIds(owner.id, db),
    connectedPeers(user.id, [owner.id], db),
  ]);
  const extras = connected.has(owner.id) ? await connectedExtras(user, owner, db) : {};
  return { body: { card, ...(connection ? { connection } : {}), scores, stats, badges, ...extras } };
}
