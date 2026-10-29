import "server-only";
import { and, asc, eq, ilike, ne, or } from "drizzle-orm";
import { getDb } from "../../db/client";
import { eventAttendees, users } from "../../db/schema";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { slugify } from "../slug";
import { escapeLike } from "./admin-events";
import { realPeopleOnly } from "./events";
import { cardsFor, findCurrentEvent } from "./people";

const SEARCH_LIMIT = 8;

// Handles are accent-free slugs of names, so matching the slug of the query against the handle makes
// "lopez" find "López" without a database extension. A query with no letters or digits has no slug and matches by name only.
export function searchPatterns(text: string): { name: string; handle: string | null } {
  const slug = slugify(text);
  return { name: `%${escapeLike(text)}%`, handle: slug ? `%${slug}%` : null };
}

// Only people at the searcher's own event, never test people at a real one (M20).
export async function searchPeople({ user, query }: InputOf<typeof R.searchPeople>): ResultOf<typeof R.searchPeople> {
  const db = getDb();
  const event = await findCurrentEvent(user.id, new Date(), db);
  if (!event) return { body: { people: [] } };
  const pattern = searchPatterns(query.q);
  const rows = await db
    .select({ user: users })
    .from(eventAttendees)
    .innerJoin(users, eq(users.id, eventAttendees.userId))
    .where(
      and(
        eq(eventAttendees.eventId, event.id),
        ne(users.id, user.id),
        realPeopleOnly(event),
        or(ilike(users.name, pattern.name), pattern.handle ? ilike(users.handle, pattern.handle) : undefined),
      ),
    )
    .orderBy(asc(users.name))
    .limit(SEARCH_LIMIT);
  const cards = await cardsFor(user.id, rows.map((row) => row.user), db);
  return { body: { people: rows.flatMap((row) => cards.get(row.user.id) ?? []) } };
}
