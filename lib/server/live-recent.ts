import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { connections } from "../../db/schema";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { connectionsOfRealPeople, requireEventByCode } from "./events";
import { usersByIds } from "./people";

const RECENT_PAIRS = 3;
// Same 1 s shared cache as the big screen (A6).
const LIVE_CACHE = { "Cache-Control": "public, s-maxage=1, stale-while-revalidate=1" };

// Two small queries instead of the full snapshot, which ranks every attendee and lists every edge.
export async function liveRecent({ params }: InputOf<typeof R.liveRecent>): ResultOf<typeof R.liveRecent> {
  const event = await requireEventByCode(params.code);
  const rows = await getDb()
    .select()
    .from(connections)
    .where(and(eq(connections.eventId, event.id), eq(connections.status, "accepted"), connectionsOfRealPeople(event)))
    .orderBy(desc(connections.respondedAt))
    .limit(RECENT_PAIRS);
  const people = new Map((await usersByIds(rows.flatMap((row) => [row.requesterId, row.addresseeId]))).map((user) => [user.id, user]));
  const person = (id: string) => {
    const user = people.get(id);
    return user ? { id, name: user.name, photoUrl: user.photoUrl } : null;
  };
  const pairs = rows.flatMap((row) => {
    const a = person(row.requesterId);
    const b = person(row.addresseeId);
    return a && b ? [{ id: row.id, a, b, kind: row.kind ?? "new", at: (row.respondedAt ?? row.createdAt).toISOString() }] : [];
  });
  return { body: { pairs }, headers: LIVE_CACHE };
}
