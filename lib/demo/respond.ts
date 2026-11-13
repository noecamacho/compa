// D2: demo mode (API_MODE=demo). Every route answers from the clock-driven room (lib/demo/scenario.ts) plus the visitor's
// cookie (lib/demo/visitor.ts): no session, database, Supabase or OpenAI. A route without a demo answer serves its
// documented example, as in mock mode. lib/api/define-route.ts runs these handlers as public routes.
import type { z } from "zod";
import { E, fail } from "../api/errors";
import { mockResponse } from "../api/mock";
import type { AnyRouteSpec, Auth, Handler, HandlerResult, ObjectSchema, RouteSpec } from "../api/route-spec";
import type * as R from "../api/routes";
import type * as S from "../api/schemas";
import { BADGE_LIST } from "../badges/catalog";
import { earnedBadges, progressFor, type BadgeFacts } from "../badges/rules";
import { copyFor, type Dictionary } from "../copy";
import { FALLBACK_LOCALE, localeFromAcceptLanguage, type Locale } from "../i18n";
import { CONNECTION_POINTS, GOLDEN_CAP_INVITES, SUMMARY_POINTS } from "../points";
import { DEFAULT_VISIBILITY } from "../profile-fields";
import { safeNext } from "../safe-next";
import { slugify } from "../slug";
import { TOPICS, type Topic } from "../topics";
import { adminEventOf, adminEventsOf, adminStatsOf, adminUserOf, attendeesOf, usersOf } from "./admin";
import type { DemoPerson } from "./cast";
import { DEMO_EVENT_SLUG } from "./scenario";
import { demoSnapshot, demoView, standingOf, type DemoView } from "./view";
import {
  acceptedAt, addLink, clearedVisitorCookie, DEMO_REQUESTERS, demoConnectionId, demoInteractionId, isAccepted, kindOf,
  linkPoints, linkWith, pendingRequesters, personOfConnection, personOfInteraction, readVisitor, updateLink, visitorCookie,
  type VisitorLink, type VisitorProfile, type VisitorState,
} from "./visitor";

export const isDemoMode = (apiMode = process.env.API_MODE): boolean => apiMode === "demo";

type Ctx = { req: Request; view: DemoView; copy: Dictionary; origin: string };
type Parts<T> = T extends RouteSpec<infer P, infer Q, infer B, z.ZodType, Auth> ? { params: z.output<P>; query: z.output<Q>; body: z.output<B> } : never;
// `visitor` is the cookie to write back: the new state, or null to forget the visitor.
type Answer<T> =
  T extends RouteSpec<ObjectSchema, ObjectSchema, z.ZodType, infer Res, Auth> ? Response | { status?: number; body?: z.input<Res>; visitor?: VisitorState | null } : never;
type DemoFn<T> = (input: Parts<T>, ctx: Ctx) => Answer<T>;
type RouteName = Exclude<keyof typeof R, "ROUTES">;

const iso = (ms: number): string => new Date(ms).toISOString();
const firstName = (person: DemoPerson): string => person.name.split(" ")[0] ?? person.name;
const NO_POINTS = { kind: 0, topics: 0, note: 0, total: 0 };
const READ_ONLY = "The demo is read-only.";

// ---- The room, the visitor and the people in it ----

const eventRef = (view: DemoView) => ({ slug: view.room.event.slug, name: view.room.event.name });
const currentEvent = (view: DemoView) => ({ code: view.room.event.code, name: view.room.event.name });
const acceptedLinks = (view: DemoView): VisitorLink[] => view.visitor.links.filter((link) => isAccepted(link, view.now));
const statusOf = (view: DemoView, link: VisitorLink) => (isAccepted(link, view.now) ? ("accepted" as const) : ("pending" as const));
const earnedPoints = (view: DemoView, link: VisitorLink) => (isAccepted(link, view.now) ? linkPoints(link) : NO_POINTS);

function requireRoom(view: DemoView, code: string): void {
  if (code !== view.room.event.code) fail(E.eventNotFound);
}

const castIndexOf = (view: DemoView, handle: string): number => view.room.cast.findIndex((person) => person.handle === handle);

function castAt(view: DemoView, index: number): DemoPerson {
  return view.room.cast[index] ?? fail(E.notFound);
}

function requestedAt(view: DemoView, person: number): number {
  // A few minutes into the current replay, so the request always reads as recent.
  const order = (DEMO_REQUESTERS as readonly number[]).indexOf(person) + 1;
  return view.now - view.room.elapsedMs - order * 60_000;
}

function neighbors(view: DemoView, id: string): Set<string> {
  const ends = view.links.filter((link) => link.a === id || link.b === id).map((link) => (link.a === id ? link.b : link.a));
  return new Set(ends);
}

function statsOf(view: DemoView, id: string) {
  const own = view.links.filter((link) => link.a === id || link.b === id);
  const reconnections = own.filter((link) => link.kind === "reconnection").length;
  return { newConnections: own.length - reconnections, reconnections, events: 1 };
}

function visitorFacts(view: DemoView): BadgeFacts {
  const accepted = acceptedLinks(view);
  const times = accepted.map(acceptedAt);
  const met = accepted.map((link) => view.room.cast[link.person]?.city);
  const topics = accepted.flatMap((link) => [...link.topics, ...(link.note?.topics ?? [])]);
  const { startsAt, endsAt } = view.room.event;
  return {
    totalConnections: accepted.length, connectionsTonight: accepted.length,
    scannedBy: accepted.filter((link) => link.direction === "received").length,
    eventsAttended: 1, consecutiveEvents: 1,
    cities: new Set([view.me.city, ...met].filter(Boolean)).size,
    distinctTopics: new Set(topics).size,
    notesApproved: accepted.filter((link) => link.note).length,
    maxReconnectionsWithOne: accepted.some((link) => link.knew) ? 1 : 0,
    maxEventsWithOne: accepted.length ? 1 : 0,
    firstConnectionMinute: times.length ? Math.max(0, Math.floor((Math.min(...times) - Date.parse(startsAt)) / 60_000)) : null,
    minutesBeforeEnd: times.length ? Math.floor((Date.parse(endsAt) - Math.max(...times)) / 60_000) : null,
    eventConnections: view.links.length,
    signupIndex: 1000,
    attendedFoundersFest2026: false,
  };
}

function me(view: DemoView): z.input<typeof S.Me> {
  const standing = standingOf(view, view.me.id);
  return {
    ...view.me, email: null, visibility: DEFAULT_VISIBILITY,
    nameEdited: view.visitor.profile.name !== undefined, photoEdited: false,
    isAdmin: true, role: "super_admin", isTest: false, showAccessories: false,
    currentEvent: currentEvent(view), stats: statsOf(view, view.me.id),
    scores: { event: standing, lifetime: standing }, badges: earnedBadges(visitorFacts(view)),
  };
}

function connectionWith(view: DemoView, index: number) {
  const link = linkWith(view.visitor, index);
  const eventSlug = DEMO_EVENT_SLUG;
  if (link) return { status: statusOf(view, link), kind: kindOf(link), eventSlug };
  if (view.visitor.declined.includes(index)) return { status: "declined" as const, eventSlug };
  return pendingRequesters(view.visitor).includes(index) ? { status: "pending" as const, eventSlug } : undefined;
}

function profileOf(view: DemoView, index: number): z.input<typeof S.UserProfile> {
  const person = castAt(view, index);
  const link = linkWith(view.visitor, index);
  const standing = standingOf(view, person.id);
  const mine = neighbors(view, view.me.id);
  const mutual = [...neighbors(view, person.id)].filter((id) => mine.has(id)).flatMap((id) => view.byId.get(id) ?? []);
  // Like the API, `relationship` comes only with people already connected; the register screen reads it as "we knew".
  const connected = link && isAccepted(link, view.now);
  const note = link?.note;
  return {
    card: person, connection: connectionWith(view, index), atEvent: true,
    scores: { event: standing, lifetime: standing }, stats: statsOf(view, person.id), badges: [],
    ...(connected ? { relationship: { reconnections: link.knew ? 1 : 0, eventsTogether: 1, mutual: mutual.slice(0, 6) } } : {}),
    lastInteraction: note ? { connectionId: demoConnectionId(index), title: note.title, topics: note.topics, at: iso(note.at) } : null,
  };
}

function detailOf(view: DemoView, link: VisitorLink): z.input<typeof S.ConnectionDetail> {
  const { note } = link;
  return {
    connectionId: demoConnectionId(link.person), status: statusOf(view, link), kind: kindOf(link), direction: link.direction,
    event: eventRef(view), other: castAt(view, link.person), topics: link.topics, points: earnedPoints(view, link),
    interaction: note
      ? { id: demoInteractionId(link.person), title: note.title, summary: note.summary, bullets: note.nextSteps, topics: note.topics, pendingAction: note.pendingAction, durationSec: null, approvedAt: iso(note.at) }
      : null,
    at: iso(link.at),
  };
}

function requestDetailOf(view: DemoView, index: number): z.input<typeof S.ConnectionDetail> {
  return {
    connectionId: demoConnectionId(index), status: "pending", direction: "received", event: eventRef(view),
    other: castAt(view, index), topics: [], points: NO_POINTS, interaction: null, at: iso(requestedAt(view, index)),
  };
}

function historyOf(view: DemoView, link: VisitorLink): z.input<typeof S.PersonHistory> {
  const points = earnedPoints(view, link).total;
  const meeting = { connectionId: demoConnectionId(link.person), event: eventRef(view), status: statusOf(view, link), direction: link.direction, kind: kindOf(link), points, at: iso(link.at) };
  const topics = [...new Set([...link.topics, ...(link.note?.topics ?? [])])];
  return { person: castAt(view, link.person), meetings: [meeting], lastMetAt: iso(link.at), totalPoints: points, type: kindOf(link), topics };
}

// The person a connection id names, as long as the visitor has a link or a pending request with them.
function requirePending(view: DemoView, id: string): number {
  const index = personOfConnection(id) ?? fail(E.connectionNotFound);
  if (linkWith(view.visitor, index) || view.visitor.declined.includes(index)) fail(E.notPending);
  if (!pendingRequesters(view.visitor).includes(index)) fail(E.connectionNotFound);
  return index;
}

function requireLink(view: DemoView, id: string, missing = E.connectionNotFound): VisitorLink {
  const index = personOfConnection(id);
  return (index === null ? undefined : linkWith(view.visitor, index)) ?? fail(missing);
}

function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>;
}

const isTopic = (value: string): value is Topic => (TOPICS as readonly string[]).includes(value);

// ---- Live board and rankings ----

const pairPersonOf = (view: DemoView, id: string) => {
  const person = view.byId.get(id) ?? view.me;
  return { id, name: person.name, photoUrl: person.photoUrl };
};

function rowsOf(view: DemoView) {
  return view.people
    .filter((person) => person.points > 0)
    .map((person, index) => ({ ...person, rank: index + 1, userId: person.id, handle: view.byId.get(person.id)?.handle ?? view.me.handle }));
}

function myStanding(view: DemoView, copy: Dictionary): z.input<typeof S.LeaderboardMe> {
  const rows = rowsOf(view);
  const index = rows.findIndex((row) => row.userId === view.me.id);
  const mine = rows[index];
  if (!mine) return { rank: null, points: 0, above: null, gap: 0, tip: copy.rankingTips.first };
  const above = rows[index - 1] ?? null;
  const gap = above ? above.points - mine.points + 1 : 0;
  return { rank: mine.rank, points: mine.points, above, gap, tip: above ? copy.rankingTips.gap(gap) : null };
}

function badgesOf(view: DemoView, copy: Dictionary): z.input<typeof S.BadgeList> {
  const facts = visitorFacts(view);
  const earned = new Set(earnedBadges(facts));
  // shortcut: every earned badge carries the latest connection's time; keep per-badge times in the cookie if a screen needs them.
  const latest = Math.max(0, ...acceptedLinks(view).map(acceptedAt));
  const badges = BADGE_LIST.map((badge) => {
    const progress = progressFor(badge.id, facts);
    const at = earned.has(badge.id) ? new Date(latest) : null;
    return {
      id: badge.id, earnedAt: at?.toISOString() ?? null, earnedNote: at ? copy.badgeProgress.earnedOn(at) : null,
      progress: at || !progress ? null : { ...progress, label: copy.badgeProgress.labels[badge.id] ?? "" },
    };
  });
  return { badges, earned: earned.size, total: badges.length };
}

// ---- Handlers, by route id ----

const readOnly = (): never => fail(E.forbidden, READ_ONLY);
const redirectTo = (next: string | undefined, req: Request) => Response.redirect(new URL(safeNext(next, "/home"), req.url), 302);

const HANDLERS: { [K in RouteName]?: DemoFn<(typeof R)[K]> } = {
  authLinkedin: ({ query }, { req }) => redirectTo(query.next, req),
  authCallback: ({ query }, { req }) => redirectTo(query.next, req),
  // Signing out forgets the visitor: the demo starts over.
  signOut: () => ({ visitor: null }),
  getMe: (_, { view }) => ({ body: me(view) }),
  patchMe: ({ body }, { view }) => {
    const { name, headline, company, city, avatar, avatarMode } = body;
    const profile: VisitorProfile = { ...view.visitor.profile, ...definedOnly({ name, headline, company, city, avatar, avatarMode }) };
    const visitor = { ...view.visitor, profile };
    return { body: me(demoView(visitor, view.now)), visitor };
  },
  // shortcut: visibility is not kept; store it in the cookie once a demo screen shows the change.
  patchVisibility: ({ body }) => {
    const { headline, company, interests } = body;
    return { body: { ...DEFAULT_VISIBILITY, ...definedOnly({ headline, company, interests }), links: { ...DEFAULT_VISIBILITY.links, ...definedOnly(body.links ?? {}) } } };
  },
  searchPeople: ({ query }, { view }) => ({ body: { people: view.room.cast.filter((person) => slugify(person.name).includes(slugify(query.q))).slice(0, 10) } }),
  getUser: ({ params }, { view }) => {
    if (params.handle === view.me.handle) return { body: { card: view.me, atEvent: true, stats: statsOf(view, view.me.id) } };
    const index = castIndexOf(view, params.handle);
    return { body: profileOf(view, index >= 0 ? index : fail(E.userNotFound)) };
  },

  getEvent: ({ params }, { view }) => {
    requireRoom(view, params.code);
    const { event } = view.room;
    const door = { code: event.code, name: event.name, startsAt: event.startsAt, endsAt: event.endsAt, timezone: event.timezone, isRunning: true };
    return { body: { ...door, phase: "running", counters: { checkedIn: view.people.length, connections: view.links.length } } };
  },
  checkIn: ({ params }, { view }) => {
    requireRoom(view, params.code);
    return { status: 200, body: { event: currentEvent(view), checkedInAt: view.room.event.startsAt, alreadyCheckedIn: true } };
  },

  createConnection: ({ body }, { view }) => {
    if (body.toHandle === view.me.handle) fail(E.selfConnection);
    const index = castIndexOf(view, body.toHandle);
    const existing = linkWith(view.visitor, index >= 0 ? index : fail(E.userNotFound));
    const visitor = existing ? view.visitor : addLink(view.visitor, { person: index, at: view.now, direction: "sent", knew: body.knew ?? false, topics: body.topics ?? [] });
    const link = linkWith(visitor, index) ?? fail(E.internal);
    const answer = { connectionId: demoConnectionId(index), status: statusOf(view, link), event: eventRef(view), to: castAt(view, index) };
    return existing ? { status: 200, body: answer } : { body: answer, visitor };
  },
  listConnections: (_, { view }) => {
    const incoming = pendingRequesters(view.visitor).map((index) => ({ connectionId: demoConnectionId(index), from: castAt(view, index), event: eventRef(view), createdAt: iso(requestedAt(view, index)) }));
    const people = [...view.visitor.links].sort((a, b) => b.at - a.at).map((link) => historyOf(view, link));
    const totals = { points: standingOf(view, view.me.id).points, connections: acceptedLinks(view).length, people: people.length };
    return { body: { incoming, people, totals } };
  },
  getConnection: ({ params }, { view }) => {
    const index = personOfConnection(params.id) ?? fail(E.connectionNotFound);
    const link = linkWith(view.visitor, index);
    if (link) return { body: detailOf(view, link) };
    if (pendingRequesters(view.visitor).includes(index)) return { body: requestDetailOf(view, index) };
    return fail(E.connectionNotFound);
  },
  setKnew: ({ params, body }, { view }) => {
    const link = requireLink(view, params.id);
    return { body: { connectionId: params.id, knew: body.knew }, visitor: updateLink(view.visitor, link.person, { knew: body.knew }) };
  },
  acceptConnection: ({ params, body }, { view }) => {
    const index = requirePending(view, params.id);
    const link: VisitorLink = { person: index, at: view.now, direction: "received", knew: body.knew ?? false, topics: [] };
    const answer = { connectionId: params.id, kind: kindOf(link), points: CONNECTION_POINTS[kindOf(link)], from: castAt(view, index) };
    return { body: answer, visitor: addLink(view.visitor, link) };
  },
  declineConnection: ({ params }, { view }) => {
    const index = requirePending(view, params.id);
    return { visitor: { ...view.visitor, declined: [...view.visitor.declined, index] } };
  },

  listNotifications: (_, { view }) => {
    const seen = view.visitor.seenThrough ?? 0;
    const eventName = view.room.event.name;
    const requests = pendingRequesters(view.visitor).map((index) => {
      const at = requestedAt(view, index);
      return { id: `request-${index}`, kind: "request" as const, createdAt: iso(at), unseen: at > seen, connectionId: demoConnectionId(index), person: castAt(view, index), eventName };
    });
    const accepted = acceptedLinks(view)
      .filter((link) => link.direction === "sent")
      .map((link) => ({ id: `accepted-${link.person}`, kind: "accepted" as const, createdAt: iso(acceptedAt(link)), unseen: acceptedAt(link) > seen, connectionId: demoConnectionId(link.person), person: castAt(view, link.person), eventName }));
    const notifications = [...requests, ...accepted].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return { body: { notifications, unseenCount: notifications.filter((item) => item.unseen).length } };
  },
  // shortcut: the notifications page marks them seen during its server render, where no cookie can be set, so only a
  // browser POST sticks; let that page post from the client if the bell must clear on open.
  markNotificationsSeen: ({ body }, { view }) => ({ visitor: { ...view.visitor, seenThrough: Math.max(view.visitor.seenThrough ?? 0, Date.parse(body.seenThrough)) } }),

  liveSnapshot: ({ params }, { view }) => {
    requireRoom(view, params.code);
    return { body: demoSnapshot(view) };
  },
  liveRecent: ({ params }, { view }) => {
    requireRoom(view, params.code);
    const newest = view.links.slice(-3).reverse();
    return { body: { pairs: newest.map((link) => ({ id: link.id, a: pairPersonOf(view, link.a), b: pairPersonOf(view, link.b), kind: link.kind, at: link.at })) } };
  },
  livePerson: ({ params }, { view }) => {
    requireRoom(view, params.code);
    const index = view.people.findIndex((person) => person.id === params.userId);
    const live = view.people[index] ?? fail(E.attendeeNotFound);
    const card = view.byId.get(live.id) ?? fail(E.attendeeNotFound);
    return { body: { card, points: live.points, connections: live.connections, rank: index + 1 } };
  },
  // One event, so the lifetime board is the event board.
  leaderboard: ({ params, query }, { view, copy }) => {
    requireRoom(view, params.code);
    return { body: { rows: rowsOf(view).slice(0, query.limit), me: myStanding(view, copy) } };
  },

  transcribe: (_, { copy }) => ({ body: { text: copy.demoApi.transcript } }),
  draftSummary: ({ body }, { view, copy }) => {
    const link = requireLink(view, body.connectionId, E.notFound);
    if (!isAccepted(link, view.now)) fail(E.connectionNotAccepted);
    const person = castAt(view, link.person);
    const draft = {
      interactionId: demoInteractionId(link.person), summary: body.text, topics: (person.interests ?? []).filter(isTopic).slice(0, 4),
      nextSteps: [copy.demoApi.nextStep(firstName(person))], substantive: true, fallback: false,
      title: copy.demoApi.noteTitle(firstName(person)), pendingAction: null,
    };
    return { body: draft };
  },
  approveSummary: ({ params, body }, { view, copy }) => {
    const index = personOfInteraction(params.id) ?? fail(E.notFound);
    const link = linkWith(view.visitor, index) ?? fail(E.notFound);
    if (link.note) fail(E.alreadyApproved);
    const title = body.title || copy.demoApi.noteTitle(firstName(castAt(view, index)));
    const note = { title, summary: body.summary, topics: body.topics, nextSteps: body.nextSteps, pendingAction: body.pendingAction ?? null, at: view.now };
    const interaction = { ...note, id: params.id, connectionId: demoConnectionId(index), points: SUMMARY_POINTS, approvedAt: iso(view.now) };
    return { body: { interaction, pointsAwarded: SUMMARY_POINTS }, visitor: updateLink(view.visitor, index, { note }) };
  },

  listBadges: (_, { view, copy }) => ({ body: badgesOf(view, copy) }),
  myInvites: (_, { view, origin }) => ({
    body: { link: { code: view.me.handle, url: `${origin}/i/${view.me.handle}`, event: currentEvent(view) }, invitees: [], target: GOLDEN_CAP_INVITES, goldenCap: false },
  }),
  claimInvite: ({ params }, { view }) => {
    const index = castIndexOf(view, params.code);
    return { body: { code: params.code, inviter: castAt(view, index >= 0 ? index : fail(E.notFound)), event: currentEvent(view) } };
  },

  listAdminEvents: ({ query }, { view, origin, copy }) => {
    const events = adminEventsOf(view, origin, copy, query);
    return { body: { events, total: events.length, page: query.page, pageSize: query.pageSize } };
  },
  adminStats: (_, { view }) => ({ body: adminStatsOf(view) }),
  getAdminEvent: ({ params }, { view, origin, copy }) => {
    if (params.slug !== DEMO_EVENT_SLUG) fail(E.eventNotFound);
    return { body: { event: adminEventOf(view, origin, copy) } };
  },
  listAttendees: ({ params, query }, { view, origin, copy }) => {
    if (params.slug !== DEMO_EVENT_SLUG) fail(E.eventNotFound);
    const { counts } = adminEventOf(view, origin, copy);
    return { body: { ...attendeesOf(view, query), counts: { ...counts, testUsers: 0 } } };
  },
  listOrganizers: ({ params }, { view }) => {
    if (params.slug !== DEMO_EVENT_SLUG) fail(E.eventNotFound);
    return { body: { organizers: [{ user: adminUserOf(view.me, view), role: "owner", createdAt: view.room.event.startsAt }] } };
  },
  searchUsers: ({ query }, { view }) => {
    const found = usersOf(view, query);
    return { body: { ...found, page: query.page, pageSize: query.limit } };
  },
  listTestUsers: () => ({ body: { users: [] } }),
  createEvent: readOnly,
  patchAdminEvent: readOnly,
  endAdminEvent: readOnly,
  archiveAdminEvent: readOnly,
  rotateEventCode: readOnly,
  addAttendee: readOnly,
  removeAttendee: readOnly,
  setOrganizer: readOnly,
  removeOrganizer: readOnly,
  createTestUsers: readOnly,
  deleteTestUser: readOnly,
  createTestSession: readOnly,
};

// ---- Wiring ----

async function localeOf(req: Request): Promise<Locale> {
  const own = req.headers.get("accept-language");
  if (own) return localeFromAcceptLanguage(own);
  // A page's in-process call carries only its cookies; the page request's own headers hold the language.
  const { requestLocale } = await import("../server/locale");
  return requestLocale().catch(() => FALLBACK_LOCALE);
}

// Each answer depends on the visitor's cookie, so no shared cache may keep it.
function toResult(answer: Answer<AnyRouteSpec>, req: Request) {
  if (answer instanceof Response) return answer;
  const { visitor, ...rest } = answer;
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  const secure = new URL(req.url).protocol === "https:";
  if (visitor !== undefined) headers.append("Set-Cookie", visitor ? visitorCookie(visitor, secure) : clearedVisitorCookie(secure));
  return { ...rest, headers };
}

/** The demo handler of a route. Read the clock once per request: every part of one answer sees the same room. */
export function demoHandler<P extends ObjectSchema, Q extends ObjectSchema, B extends z.ZodType, Res extends z.ZodType, A extends Auth>(
  spec: RouteSpec<P, Q, B, Res, A>,
): Handler<P, Q, B, Res, A> {
  const answer = HANDLERS[spec.id as RouteName] as DemoFn<AnyRouteSpec> | undefined;
  return async ({ req, params, query, body }) => {
    if (!answer) return mockResponse(spec as unknown as AnyRouteSpec, req);
    const view = demoView(readVisitor(req.headers.get("cookie")), Date.now());
    const ctx = { req, view, copy: copyFor(await localeOf(req)), origin: new URL(req.url).origin };
    return toResult(answer({ params, query, body }, ctx), req) as HandlerResult<Res>;
  };
}
