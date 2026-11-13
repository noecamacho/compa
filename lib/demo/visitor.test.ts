import { describe, expect, test } from "bun:test";
import { demoCast } from "./cast";
import {
  addLink, DEMO_ACCEPT_MS, DEMO_REQUESTERS, DEMO_VISITOR_COOKIE, demoConnectionId, demoInteractionId, emptyVisitor, encodeVisitor,
  isAccepted, linkPoints, nextScanTarget, pendingRequesters, personOfConnection, personOfInteraction, readVisitor, visitorCookie,
  type VisitorLink, type VisitorState,
} from "./visitor";

const link = (person: number, change: Partial<VisitorLink> = {}): VisitorLink => ({ person, at: 1_000, direction: "sent", knew: false, topics: [], ...change });
const cookieOf = (state: VisitorState) => `other=1; ${DEMO_VISITOR_COOKIE}=${encodeVisitor(state)}`;
const note = { title: "t", summary: "s".repeat(1200), topics: [], nextSteps: [], pendingAction: null, at: 2_000 };

describe("demo visitor cookie", () => {
  test("round-trips the state through the cookie header", () => {
    const state = addLink(emptyVisitor(), link(3, { topics: ["Agents"] }));
    expect(readVisitor(cookieOf(state))).toEqual(state);
  });

  test("a missing, tampered or out-of-range cookie is a fresh visitor", () => {
    expect(readVisitor(null)).toEqual(emptyVisitor());
    expect(readVisitor(`${DEMO_VISITOR_COOKIE}=not-base64!`)).toEqual(emptyVisitor());
    const forged = Buffer.from(JSON.stringify({ ...emptyVisitor(), links: [link(150)] })).toString("base64url");
    expect(readVisitor(`${DEMO_VISITOR_COOKIE}=${forged}`)).toEqual(emptyVisitor());
  });

  test("stays under the browser cookie limit by shedding the oldest notes, then the oldest links", () => {
    const full: VisitorState = { ...emptyVisitor(), links: Array.from({ length: 24 }, (_, index) => link(index, { note })) };
    const kept = readVisitor(cookieOf(full));
    expect(visitorCookie(full, true).length).toBeLessThan(4096);
    expect(kept.links.at(-1)).toEqual(full.links.at(-1));
    expect(kept.links.filter((item) => item.note)).toHaveLength(1);
    expect(kept.links.length).toBeLessThan(24);
  });

  test("keeps at most 24 links and drops a declined person once they connect", () => {
    const many = Array.from({ length: 30 }, (_, index) => index).reduce((state, index) => addLink(state, link(index)), emptyVisitor());
    expect(many.links).toHaveLength(24);
    expect(many.links[0]?.person).toBe(6);
    expect(addLink({ ...emptyVisitor(), declined: [12] }, link(12)).declined).toEqual([]);
  });
});

describe("demo visitor connections", () => {
  test("connection and note ids name the cast person and nothing else", () => {
    expect(personOfConnection(demoConnectionId(149))).toBe(149);
    expect(personOfInteraction(demoInteractionId(7))).toBe(7);
    expect(personOfConnection(demoInteractionId(7))).toBeNull();
    expect(personOfConnection("de000004-0000-4000-8000-000000000096")).toBeNull();
  });

  test("a sent request is accepted after the delay; points follow the plan's rules", () => {
    const sent = link(1, { topics: ["Agents"], note });
    expect(isAccepted(sent, 1_000 + DEMO_ACCEPT_MS - 1)).toBe(false);
    expect(isAccepted(sent, 1_000 + DEMO_ACCEPT_MS)).toBe(true);
    expect(linkPoints(sent)).toEqual({ kind: 50, topics: 5, note: 15, total: 70 });
    expect(linkPoints(link(1, { direction: "received", knew: true, topics: ["Agents"] }))).toEqual({ kind: 20, topics: 0, note: 0, total: 20 });
  });

  test("requests stay pending until answered, and the scan target skips people already met", () => {
    const [first, second] = DEMO_REQUESTERS;
    const answered = { ...addLink(emptyVisitor(), link(first, { direction: "received" })), declined: [second] };
    expect(pendingRequesters(emptyVisitor())).toEqual([...DEMO_REQUESTERS]);
    expect(pendingRequesters(answered)).toEqual([]);
    const cast = demoCast();
    expect(nextScanTarget(addLink(emptyVisitor(), link(0)), cast)?.id).toBe(cast[1]?.id);
  });
});
