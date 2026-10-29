import "server-only";
import { and, count, desc, eq, lt, ne, or } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { bonusPoints, connections, events, lifetimeScores, type ConnectionRow, type EventRow, type UserRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import { CAPS } from "../api/rate-limits";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import type { CardT } from "../api/schemas";
import { hasEnded, isRunning, statusForViewer } from "../connection-status";
import { decideKind, pointsFor, topicsPointsFor } from "../points";
import { broadcast, liveTopic, userTopic } from "../realtime";
import { awardBadges } from "./badges";
import { ensureCheckedIn, isCheckedIn } from "./events";
import { awardInvite } from "./invites";
import { requireUnderCap } from "./rate-limit";
import { cardFor, cardsFor, findCurrentEvent, findUserByHandle, pairCondition, usersByIds } from "./people";

const eventRef = (event: EventRow) => ({ slug: event.slug, name: event.name });

// ---- POST /api/connections (API spec §7.1) ----

async function requireTarget(user: UserRow, toHandle: string): Promise<UserRow> {
  const target = (await findUserByHandle(toHandle)) ?? fail(E.userNotFound);
  return target.id === user.id ? fail(E.selfConnection) : target;
}

async function checkInScanner(user: UserRow, event: EventRow, screenConsent: boolean): Promise<void> {
  if (await isCheckedIn(user.id, event.id)) return;
  if (!screenConsent) fail(E.consentRequired);
  await ensureCheckedIn(user, event, true);
}

async function insertRequest(event: EventRow, requester: UserRow, addressee: UserRow, knew: boolean | undefined, topics: string[]) {
  const [row] = await getDb()
    .insert(connections)
    .values({ eventId: event.id, requesterId: requester.id, addresseeId: addressee.id, requesterKnew: knew ?? null, topics })
    .onConflictDoNothing()
    .returning();
  return row;
}

async function findPairAt(eventId: string, a: string, b: string): Promise<ConnectionRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(connections)
    .where(and(eq(connections.eventId, eventId), pairCondition(a, b)))
    .limit(1);
  return row;
}

async function countSentAt(eventId: string, requesterId: string): Promise<number> {
  const [row] = await getDb()
    .select({ sent: count() })
    .from(connections)
    .where(and(eq(connections.eventId, eventId), eq(connections.requesterId, requesterId)));
  return row?.sent ?? 0;
}

// A repeat scan of someone already requested stays idempotent even at the cap.
async function requireUnderEventCap(event: EventRow, user: UserRow, target: UserRow): Promise<void> {
  const sent = await countSentAt(event.id, user.id);
  if (sent < CAPS.requestsPerEvent) return;
  if (await findPairAt(event.id, user.id, target.id)) return;
  requireUnderCap(sent, CAPS.requestsPerEvent);
}

export async function createConnection({ user, body }: InputOf<typeof R.createConnection>): ResultOf<typeof R.createConnection> {
  const target = await requireTarget(user, body.toHandle);
  const now = new Date();
  const event = (await findCurrentEvent(target.id, now)) ?? fail(E.notAtEvent);
  await requireUnderEventCap(event, user, target);
  await checkInScanner(user, event, body.screenConsent === true);
  const inserted = await insertRequest(event, user, target, body.knew, body.topics ?? []);
  const row = inserted ?? (await findPairAt(event.id, user.id, target.id)) ?? fail(E.internal);
  const to = await cardFor(user.id, target);
  const status = statusForViewer({ ...row, viewerId: user.id, eventEnded: hasEnded(event, now) });
  if (inserted) await announceRequest(inserted, user, event);
  return { status: inserted ? 201 : 200, body: { connectionId: row.id, status, event: eventRef(event), to } };
}

async function announceRequest(row: ConnectionRow, requester: UserRow, event: EventRow): Promise<void> {
  const from = await cardFor(null, requester);
  await broadcast({
    topic: userTopic(row.addresseeId),
    event: "request.received",
    payload: { connectionId: row.id, from, event: eventRef(event) },
  });
}

// ---- Shared guards for knew / accept / decline ----

type Loaded = { row: ConnectionRow; event: EventRow };

async function findConnection(id: string, db: Executor = getDb(), lock = false): Promise<Loaded | undefined> {
  const query = db
    .select({ row: connections, event: events })
    .from(connections)
    .innerJoin(events, eq(events.id, connections.eventId))
    .where(eq(connections.id, id));
  const [found] = await (lock ? query.for("update", { of: connections }) : query);
  return found;
}

async function loadConnection(id: string, db: Executor = getDb(), lock = false): Promise<Loaded> {
  return (await findConnection(id, db, lock)) ?? fail(E.connectionNotFound);
}

function requireMember(row: ConnectionRow, userId: string): void {
  if (row.requesterId !== userId && row.addresseeId !== userId) fail(E.connectionNotFound);
}

function requireAnswerable({ row, event }: Loaded, userId: string): void {
  requireMember(row, userId);
  if (row.addresseeId !== userId) fail(E.forbidden, "Only the person who was scanned can answer.");
  if (row.status !== "pending") fail(E.notPending);
  if (hasEnded(event, new Date())) fail(E.eventEnded);
}

// ---- PATCH /api/connections/:id/knew ----

export async function setKnew({ user, params, body }: InputOf<typeof R.setKnew>): ResultOf<typeof R.setKnew> {
  const { row, event } = await loadConnection(params.id);
  requireMember(row, user.id);
  if (row.requesterId !== user.id) fail(E.forbidden, "Only the person who scanned can set this.");
  if (row.status !== "pending" || hasEnded(event, new Date())) fail(E.notPending);
  const updated = await getDb()
    .update(connections)
    .set({ requesterKnew: body.knew })
    .where(and(eq(connections.id, row.id), eq(connections.status, "pending")))
    .returning({ id: connections.id });
  if (updated.length === 0) fail(E.notPending);
  return { body: { connectionId: row.id, knew: body.knew } };
}

// ---- POST /api/connections/:id/accept (API spec §7.2) ----

async function metAtEarlierEvent(tx: Executor, row: ConnectionRow, event: EventRow): Promise<boolean> {
  const [earlier] = await tx
    .select({ id: connections.id })
    .from(connections)
    .innerJoin(events, eq(events.id, connections.eventId))
    .where(
      and(
        eq(connections.status, "accepted"),
        ne(connections.eventId, row.eventId),
        lt(events.startsAt, event.startsAt),
        pairCondition(row.requesterId, row.addresseeId),
      ),
    )
    .limit(1);
  return Boolean(earlier);
}

async function acceptInTransaction(id: string, userId: string, knew: boolean | undefined) {
  return getDb().transaction(async (tx) => {
    const loaded = await loadConnection(id, tx, true);
    requireAnswerable(loaded, userId);
    const addresseeKnew = knew ?? null;
    const facts = { metAtEarlierEvent: await metAtEarlierEvent(tx, loaded.row, loaded.event), requesterKnew: loaded.row.requesterKnew, addresseeKnew };
    const kind = decideKind(facts);
    const [accepted] = await tx
      .update(connections)
      .set({ status: "accepted", kind, points: pointsFor(kind), addresseeKnew, respondedAt: new Date() })
      .where(and(eq(connections.id, id), eq(connections.status, "pending")))
      .returning();
    return { row: accepted ?? fail(E.notPending), event: loaded.event };
  });
}

async function announceAcceptance(row: ConnectionRow, event: EventRow, requester: UserRow, addressee: UserRow): Promise<void> {
  const kind = row.kind ?? "new";
  const points = row.points ?? pointsFor(kind);
  const to = await cardFor(requester.id, addressee);
  const person = (u: UserRow) => ({ id: u.id, name: u.name, photoUrl: u.photoUrl });
  await broadcast(
    { topic: userTopic(requester.id), event: "request.accepted", payload: { connectionId: row.id, kind, points, to } },
    {
      topic: liveTopic(event.accessCode),
      event: "connection.accepted",
      payload: { id: row.id, a: person(requester), b: person(addressee), kind, at: (row.respondedAt ?? new Date()).toISOString() },
    },
  );
}

// Topics marked by the scanner pay +5 once; invites and badges are checked for both people (V2 points table).
async function awardExtras(row: ConnectionRow, event: EventRow, requester: UserRow, addressee: UserRow): Promise<void> {
  const db = getDb();
  const topics = topicsPointsFor(row.topics);
  if (topics > 0) {
    await db
      .insert(bonusPoints)
      .values({ userId: requester.id, eventId: event.id, reason: "topics", refId: row.id, points: topics })
      .onConflictDoNothing();
  }
  await Promise.all([awardInvite(requester, event, row.id, db), awardInvite(addressee, event, row.id, db)]);
  await Promise.all([awardBadges(requester, event, row.id, db), awardBadges(addressee, event, row.id, db)]);
}

export async function acceptConnection({ user, params, body }: InputOf<typeof R.acceptConnection>): ResultOf<typeof R.acceptConnection> {
  const { row, event } = await acceptInTransaction(params.id, user.id, body.knew);
  const [requester] = await usersByIds([row.requesterId]);
  if (!requester) return fail(E.internal);
  const from = await cardFor(user.id, requester);
  await awardExtras(row, event, requester, user).catch((error: unknown) => console.error("awards failed", error));
  await announceAcceptance(row, event, requester, user);
  const kind = row.kind ?? "new";
  return { body: { connectionId: row.id, kind, points: row.points ?? pointsFor(kind), from } };
}

// ---- POST /api/connections/:id/decline (silent, §7.4) ----

export async function declineConnection({ user, params }: InputOf<typeof R.declineConnection>): ResultOf<typeof R.declineConnection> {
  requireAnswerable(await loadConnection(params.id), user.id);
  const updated = await getDb()
    .update(connections)
    .set({ status: "declined", respondedAt: new Date() })
    .where(and(eq(connections.id, params.id), eq(connections.status, "pending")))
    .returning({ id: connections.id });
  if (updated.length === 0) fail(E.notPending);
  return { status: 204 };
}

// ---- GET /api/connections (A7, §7.5) ----

type MyConnection = { row: ConnectionRow; event: EventRow };

async function myConnections(userId: string): Promise<MyConnection[]> {
  return getDb()
    .select({ row: connections, event: events })
    .from(connections)
    .innerJoin(events, eq(events.id, connections.eventId))
    .where(or(eq(connections.requesterId, userId), eq(connections.addresseeId, userId)))
    .orderBy(desc(connections.createdAt));
}

const otherPerson = (row: ConnectionRow, userId: string) => (row.requesterId === userId ? row.addresseeId : row.requesterId);

function toMeeting({ row, event }: MyConnection, userId: string, now: Date) {
  const status = statusForViewer({ ...row, viewerId: userId, eventEnded: hasEnded(event, now) });
  const award = status === "accepted" && row.kind && row.points !== null ? { kind: row.kind, points: row.points } : {};
  return {
    connectionId: row.id,
    event: eventRef(event),
    status,
    direction: row.requesterId === userId ? ("sent" as const) : ("received" as const),
    ...award,
    at: (row.respondedAt && status === "accepted" ? row.respondedAt : row.createdAt).toISOString(),
  };
}

const isIncoming = ({ row, event }: MyConnection, userId: string, now: Date) =>
  row.addresseeId === userId && row.status === "pending" && isRunning(event, now);

function groupByPerson(list: MyConnection[], userId: string): Map<string, MyConnection[]> {
  const groups = new Map<string, MyConnection[]>();
  for (const item of list) {
    const other = otherPerson(item.row, userId);
    groups.set(other, [...(groups.get(other) ?? []), item]);
  }
  return groups;
}

const FRIEND_RECONNECTIONS = 3;

// "friend" after three reconnections with the same person; otherwise the latest accepted kind (V2Conexiones).
function personType(items: MyConnection[]): "new" | "reconnection" | "friend" {
  const accepted = items.filter(({ row }) => row.status === "accepted");
  const reconnections = accepted.filter(({ row }) => row.kind === "reconnection").length;
  if (reconnections >= FRIEND_RECONNECTIONS) return "friend";
  return accepted[0]?.row.kind === "reconnection" ? "reconnection" : "new";
}

function personHistory(person: CardT, items: MyConnection[], userId: string, now: Date) {
  const meetings = items.map((item) => toMeeting(item, userId, now));
  const totalPoints = meetings.reduce((sum, meeting) => sum + (meeting.points ?? 0), 0);
  const topics = [...new Set(items.flatMap(({ row }) => row.topics))];
  return { person, meetings, lastMetAt: meetings[0]?.at ?? now.toISOString(), totalPoints, type: personType(items), topics };
}

async function lifetimePoints(userId: string): Promise<number> {
  const [row] = await getDb().select({ points: lifetimeScores.points }).from(lifetimeScores).where(eq(lifetimeScores.userId, userId));
  return row?.points ?? 0;
}

export async function listConnections({ user }: InputOf<typeof R.listConnections>): ResultOf<typeof R.listConnections> {
  const now = new Date();
  const list = await myConnections(user.id);
  const groups = groupByPerson(list, user.id);
  const cards = await cardsFor(user.id, await usersByIds([...groups.keys()]));
  const people = [...groups].flatMap(([id, items]) => {
    const card = cards.get(id);
    return card ? [personHistory(card, items, user.id, now)] : [];
  });
  const incoming = list
    .filter((item) => isIncoming(item, user.id, now))
    .flatMap(({ row, event }) => {
      const from = cards.get(row.requesterId);
      return from ? [{ connectionId: row.id, from, event: eventRef(event), createdAt: row.createdAt.toISOString() }] : [];
    });
  const accepted = list.filter(({ row }) => row.status === "accepted");
  const totals = {
    points: await lifetimePoints(user.id),
    connections: accepted.length,
    people: new Set(accepted.map(({ row }) => otherPerson(row, user.id))).size,
  };
  return { body: { incoming, people, totals } };
}

// Exported for the summaries module: an accepted connection the user belongs to.
export async function requireAcceptedMembership(connectionId: string, userId: string) {
  const loaded = (await findConnection(connectionId)) ?? fail(E.notFound);
  if (loaded.row.requesterId !== userId && loaded.row.addresseeId !== userId) fail(E.notFound);
  if (loaded.row.status !== "accepted") fail(E.connectionNotAccepted);
  return loaded;
}
