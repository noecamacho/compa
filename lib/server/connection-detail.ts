import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb, type Executor } from "../../db/client";
import { connections, events, interactions, type ConnectionRow, type EventRow, type InteractionRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { hasEnded, statusForViewer } from "../connection-status";
import { SUMMARY_POINTS, topicsPointsFor } from "../points";
import { cardFor, usersByIds } from "./people";

// The latest draft or the approved note of a connection, approved first.
export async function latestInteraction(connectionId: string, db: Executor = getDb()): Promise<InteractionRow | undefined> {
  const [approved] = await db
    .select()
    .from(interactions)
    .where(and(eq(interactions.connectionId, connectionId), eq(interactions.substantive, true)))
    .orderBy(desc(interactions.approvedAt), desc(interactions.createdAt))
    .limit(1);
  return approved;
}

export const toInteractionSummary = (row: InteractionRow) => ({
  id: row.id,
  title: row.title ?? row.summary.split(".")[0] ?? row.summary,
  summary: row.summary,
  bullets: row.nextSteps,
  topics: row.topics,
  pendingAction: row.pendingAction,
  durationSec: null,
  approvedAt: row.approvedAt?.toISOString() ?? null,
});

function pointsBreakdown(row: ConnectionRow, viewerId: string, note: InteractionRow | undefined) {
  const accepted = row.status === "accepted";
  const kind = accepted ? (row.points ?? 0) : 0;
  const topics = accepted && row.requesterId === viewerId ? topicsPointsFor(row.topics) : 0;
  const noteAward = note?.approvedAt && note.authorId === viewerId ? SUMMARY_POINTS : 0;
  return { kind, topics, note: noteAward, total: kind + topics + noteAward };
}

export async function getConnection({ user, params }: InputOf<typeof R.getConnection>): ResultOf<typeof R.getConnection> {
  const db = getDb();
  const [found] = await db
    .select({ row: connections, event: events })
    .from(connections)
    .innerJoin(events, eq(events.id, connections.eventId))
    .where(eq(connections.id, params.id));
  const loaded = found ?? fail(E.connectionNotFound);
  const { row, event }: { row: ConnectionRow; event: EventRow } = loaded;
  if (row.requesterId !== user.id && row.addresseeId !== user.id) return fail(E.connectionNotFound);
  const otherId = row.requesterId === user.id ? row.addresseeId : row.requesterId;
  const [other] = await usersByIds([otherId], db);
  if (!other) return fail(E.internal);
  const [card, note] = await Promise.all([cardFor(user.id, other, db), latestInteraction(row.id, db)]);
  const status = statusForViewer({ ...row, viewerId: user.id, eventEnded: hasEnded(event, new Date()) });
  return {
    body: {
      connectionId: row.id,
      status,
      ...(row.kind ? { kind: row.kind } : {}),
      direction: row.requesterId === user.id ? "sent" : "received",
      event: { slug: event.slug, name: event.name },
      other: card,
      topics: row.topics,
      points: pointsBreakdown(row, user.id, note),
      interaction: note ? toInteractionSummary(note) : null,
      at: (row.respondedAt ?? row.createdAt).toISOString(),
    },
  };
}
