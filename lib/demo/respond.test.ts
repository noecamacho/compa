import { afterAll, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
import { defineRoute } from "../api/define-route";
import { matchPath } from "../api/match-path";
import type { AnyRouteSpec } from "../api/route-spec";
import * as routes from "../api/routes";
import { demoCast } from "./cast";
import { DEMO_EVENT_CODE, DEMO_EVENT_SLUG } from "./scenario";
import { DEMO_ACCEPT_MS, DEMO_REQUESTERS, DEMO_VISITOR_COOKIE, DEMO_VISITOR_ID, demoConnectionId, demoInteractionId } from "./visitor";

const NOW = Date.UTC(2026, 10, 12, 18, 0, 0);
const cast = demoCast();
const target = cast[0]!;
const requester = cast[DEMO_REQUESTERS[0]]!;
let apiMode: string | undefined;

beforeAll(() => {
  apiMode = process.env.API_MODE;
  process.env.API_MODE = "demo";
  setSystemTime(new Date(NOW));
});

afterAll(() => {
  process.env.API_MODE = apiMode;
  setSystemTime();
});

type Call = { status: number; body: unknown; cookie: string | null; headers: Headers };

// Calls the route the way Next.js does, through defineRoute with no real handler, and returns the cookie to send next.
async function call(spec: AnyRouteSpec, path: string, options: { body?: unknown; cookie?: string | null } = {}): Promise<Call> {
  const url = new URL(path, "https://demo.test");
  const params = matchPath(spec.path, url.pathname) ?? {};
  const headers = new Headers({ "accept-language": "es-MX" });
  if (options.cookie) headers.set("cookie", options.cookie);
  const hasBody = options.body !== undefined;
  if (hasBody) headers.set("content-type", "application/json");
  const req = new Request(url, { method: spec.method.toUpperCase(), headers, body: hasBody ? JSON.stringify(options.body) : undefined, redirect: "manual" });
  const res = await defineRoute(spec)(req, { params: Promise.resolve(params) });
  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : undefined;
  expectDocumentedShape(spec, res.status, body);
  const setCookie = res.headers.get("set-cookie");
  return { status: res.status, body, cookie: setCookie?.split(";")[0] ?? null, headers: res.headers };
}

// Every success body matches the route's response schema, so screens parse demo answers like real ones.
function expectDocumentedShape(spec: AnyRouteSpec, status: number, body: unknown): void {
  const { schema, alsoStatus } = spec.success;
  const success = status === spec.success.status || status === alsoStatus?.status;
  if (!success || !schema || body === undefined) return;
  expect(schema.safeParse(body).error).toBeUndefined();
}

const at = (ms: number) => setSystemTime(new Date(ms));

describe("demo mode routes", () => {
  test("the visitor is a signed-in super admin checked in to the demo room", async () => {
    const me = routes.getMe.success.schema!.parse((await call(routes.getMe, "/api/me")).body);
    expect(me).toMatchObject({ id: DEMO_VISITOR_ID, role: "super_admin", currentEvent: { code: DEMO_EVENT_CODE } });
  });

  test("answers are private to the visitor and other codes open nothing", async () => {
    const live = await call(routes.liveSnapshot, `/api/e/${DEMO_EVENT_CODE}/live`);
    expect(live.headers.get("cache-control")).toBe("private, no-store");
    expect((await call(routes.liveSnapshot, "/api/e/k7m2p9xq4t/live")).status).toBe(404);
  });

  test("a scan is pending, then accepted: points, the board and the ranking follow, and a repeat changes nothing", async () => {
    at(NOW);
    const sent = await call(routes.createConnection, "/api/connections", { body: { toHandle: target.handle, topics: ["Agents"], screenConsent: true } });
    expect(sent).toMatchObject({ status: 201, body: { connectionId: demoConnectionId(0), status: "pending" } });
    expect(sent.cookie).toStartWith(`${DEMO_VISITOR_COOKIE}=`);
    const cookie = sent.cookie;
    const pending = await call(routes.getConnection, `/api/connections/${demoConnectionId(0)}`, { cookie });
    expect(pending.body).toMatchObject({ status: "pending", points: { total: 0 } });

    at(NOW + DEMO_ACCEPT_MS);
    const detail = await call(routes.getConnection, `/api/connections/${demoConnectionId(0)}`, { cookie });
    expect(detail.body).toMatchObject({ status: "accepted", kind: "new", points: { kind: 50, topics: 5, total: 55 } });
    const live = routes.liveSnapshot.success.schema!.parse((await call(routes.liveSnapshot, `/api/e/${DEMO_EVENT_CODE}/live`, { cookie })).body);
    expect(live.connections.at(-1)).toMatchObject({ a: DEMO_VISITOR_ID, b: target.id });
    expect(live.people.find((person) => person.id === DEMO_VISITOR_ID)?.points).toBe(55);
    expect(live.people.filter((person) => person.avatar)).toHaveLength(8);
    const board = await call(routes.leaderboard, `/api/e/${DEMO_EVENT_CODE}/leaderboard`, { cookie });
    expect(board.body).toMatchObject({ me: { points: 55 } });
    const again = await call(routes.createConnection, "/api/connections", { body: { toHandle: target.handle }, cookie });
    expect(again).toMatchObject({ status: 200, cookie: null, body: { status: "accepted" } });
    const knew = await call(routes.setKnew, `/api/connections/${demoConnectionId(0)}/knew`, { body: { knew: true }, cookie });
    const reconnection = await call(routes.getConnection, `/api/connections/${demoConnectionId(0)}`, { cookie: knew.cookie });
    expect(reconnection.body).toMatchObject({ kind: "reconnection", points: { kind: 20, total: 25 } });
    at(NOW);
  });

  test("incoming requests are accepted or declined once", async () => {
    const list = await call(routes.listConnections, "/api/connections");
    expect(list.body).toMatchObject({ incoming: DEMO_REQUESTERS.map((index) => ({ connectionId: demoConnectionId(index) })) });
    const accepted = await call(routes.acceptConnection, `/api/connections/${demoConnectionId(DEMO_REQUESTERS[0])}/accept`, { body: { knew: true } });
    expect(accepted.body).toMatchObject({ kind: "reconnection", points: 20, from: { id: requester.id } });
    const cookie = accepted.cookie;
    const twice = await call(routes.acceptConnection, `/api/connections/${demoConnectionId(DEMO_REQUESTERS[0])}/accept`, { body: {}, cookie });
    expect(twice.status).toBe(409);
    const declined = await call(routes.declineConnection, `/api/connections/${demoConnectionId(DEMO_REQUESTERS[1])}/decline`, { cookie });
    expect(declined.status).toBe(204);
    const after = await call(routes.listConnections, "/api/connections", { cookie: declined.cookie });
    expect(after.body).toMatchObject({ incoming: [], totals: { connections: 1, points: 20 } });
    const bell = await call(routes.listNotifications, "/api/notifications", { cookie: declined.cookie });
    expect(bell.body).toMatchObject({ notifications: [], unseenCount: 0 });
  });

  test("a voice note is drafted without AI only once the connection is accepted, and approved once (+15)", async () => {
    at(NOW);
    const sent = await call(routes.createConnection, "/api/connections", { body: { toHandle: target.handle } });
    const early = await call(routes.draftSummary, "/api/interactions/draft", { body: { connectionId: demoConnectionId(0), text: "Hola" }, cookie: sent.cookie });
    expect(early.status).toBe(409);
    at(NOW + DEMO_ACCEPT_MS);
    const transcript = await call(routes.transcribe, "/api/transcribe", { cookie: sent.cookie });
    expect(transcript.body).toMatchObject({ text: expect.stringContaining("agentes") });
    const draft = await call(routes.draftSummary, "/api/interactions/draft", { body: { connectionId: demoConnectionId(0), text: "Hablamos de diseño." }, cookie: sent.cookie });
    expect(draft).toMatchObject({ status: 201, body: { interactionId: demoInteractionId(0), summary: "Hablamos de diseño.", title: "Plática con Alina" } });
    const approve = { summary: "Hablamos de diseño.", topics: ["Design"], nextSteps: [] };
    const approved = await call(routes.approveSummary, `/api/interactions/${demoInteractionId(0)}/approve`, { body: approve, cookie: sent.cookie });
    expect(approved.body).toMatchObject({ pointsAwarded: 15 });
    const replay = await call(routes.approveSummary, `/api/interactions/${demoInteractionId(0)}/approve`, { body: approve, cookie: approved.cookie });
    expect(replay.status).toBe(409);
    const detail = await call(routes.getConnection, `/api/connections/${demoConnectionId(0)}`, { cookie: approved.cookie });
    expect(detail.body).toMatchObject({ points: { note: 15, total: 65 }, interaction: { summary: "Hablamos de diseño." } });
    at(NOW);
  });

  test("a tampered cookie is a fresh visitor, and signing out forgets the visitor", async () => {
    const tampered = await call(routes.listConnections, "/api/connections", { cookie: `${DEMO_VISITOR_COOKIE}=e30` });
    expect(tampered.body).toMatchObject({ people: [], totals: { connections: 0 } });
    const out = await call(routes.signOut, "/api/auth/signout");
    expect(out.status).toBe(204);
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  test("the organizer console reads the room and refuses every write", async () => {
    const attendees = await call(routes.listAttendees, `/api/admin/events/${DEMO_EVENT_SLUG}/attendees?sort=points&pageSize=5`);
    expect(attendees.body).toMatchObject({ total: cast.length + 1, counts: { attendees: cast.length + 1 } });
    const ended = await call(routes.endAdminEvent, `/api/admin/events/${DEMO_EVENT_SLUG}/end`);
    expect(ended).toMatchObject({ status: 403, body: { error: { code: "forbidden" } } });
  });
});

// Sample path values that open the demo room, by parameter name.
const SAMPLE: Record<string, string> = {
  code: DEMO_EVENT_CODE, slug: DEMO_EVENT_SLUG, handle: target.handle, userId: target.id,
  id: demoConnectionId(DEMO_REQUESTERS[0]),
};
const pathOf = (spec: AnyRouteSpec) => spec.path.replace(/\{(\w+)\}/g, (_, name: string) => SAMPLE[name] ?? name);
// Paths and bodies that reach each route's success answer; routes that need an earlier action are covered above.
const SAMPLE_PATH: Partial<Record<string, string>> = {
  searchPeople: "/api/users?q=alina",
  claimInvite: `/api/invites/${target.handle}/claim`,
  approveSummary: `/api/interactions/${demoInteractionId(0)}/approve`,
};
const SAMPLE_BODY: Partial<Record<string, unknown>> = { createConnection: { toHandle: target.handle } };

describe("every route in demo mode", () => {
  for (const spec of routes.ROUTES) {
    test(`${spec.id} answers without a server error, in its documented shape`, async () => {
      const body = spec.bodyKind === "json" ? (SAMPLE_BODY[spec.id] ?? spec.bodyExample ?? {}) : undefined;
      const result = await call(spec, SAMPLE_PATH[spec.id] ?? pathOf(spec), { body });
      expect(result.status).toBeLessThan(500);
    });
  }
});
