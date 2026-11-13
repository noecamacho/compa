// D2: the demo visitor. Everything they do lives in one cookie, validated on every read; the server stores nothing,
// so every browser gets its own evening on top of the shared clock-driven room (lib/demo/scenario.ts).
import { z } from "zod";
import { Avatar, AvatarMode, type ConnectionKindT } from "../api/schemas";
import { cookieValue } from "../api/mock-cookie";
import { DEFAULT_BUILDER, lookFromBuilder } from "../monito/look";
import { CONNECTION_POINTS, SUMMARY_POINTS, topicsPointsFor } from "../points";
import { TOPICS } from "../topics";
import { DEMO_PEOPLE_COUNT, type DemoPerson } from "./cast";

export const DEMO_VISITOR_COOKIE = "compa-demo";
export const DEMO_VISITOR_ID = "de000002-0000-4000-8000-000000000000";
// A fictional person accepts this long after the visitor's request, so the pending screen shows before the points land.
export const DEMO_ACCEPT_MS = 4_000;
// Cast people (by check-in index) who ask the visitor to connect; each stays pending until accepted or declined.
export const DEMO_REQUESTERS = [12, 41] as const;
const MAX_LINKS = 24;
// Browsers drop a cookie over 4 KB; past this the oldest notes, then the oldest links, are shed.
const COOKIE_BUDGET = 3_800;
const COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60;

const castIndex = z.int().min(0).max(DEMO_PEOPLE_COUNT - 1);
const instant = z.int().nonnegative();

const Note = z.object({
  title: z.string().max(120),
  summary: z.string().max(1200),
  topics: z.array(z.enum(TOPICS)).max(4),
  nextSteps: z.array(z.string().max(200)).max(3),
  pendingAction: z.string().max(200).nullable(),
  at: instant,
});

// One connection of the visitor: `person` is the cast index, `at` when it was sent or accepted.
const Link = z.object({
  person: castIndex,
  at: instant,
  direction: z.enum(["sent", "received"]),
  knew: z.boolean(),
  topics: z.array(z.string().max(40)).max(3),
  note: Note.optional(),
});

const Profile = z
  .object({
    name: z.string().min(1).max(80),
    headline: z.string().max(120).nullable(),
    company: z.string().max(80).nullable(),
    city: z.string().max(80).nullable(),
    avatar: Avatar,
    avatarMode: AvatarMode,
  })
  .partial();

export const VisitorState = z.object({
  profile: Profile,
  links: z.array(Link).max(MAX_LINKS),
  declined: z.array(castIndex).max(DEMO_PEOPLE_COUNT),
  seenThrough: instant.optional(),
});
export type VisitorState = z.infer<typeof VisitorState>;
export type VisitorLink = z.infer<typeof Link>;
export type VisitorNote = z.infer<typeof Note>;
export type VisitorProfile = z.infer<typeof Profile>;

export const emptyVisitor = (): VisitorState => ({ profile: {}, links: [], declined: [] });

function decode(raw: string): unknown {
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

// A missing, tampered or outdated cookie is a fresh visitor, never an error.
export function readVisitor(cookieHeader: string | null): VisitorState {
  const raw = cookieValue(cookieHeader ?? "", DEMO_VISITOR_COOKIE);
  if (!raw) return emptyVisitor();
  const parsed = VisitorState.safeParse(decode(raw));
  return parsed.success ? parsed.data : emptyVisitor();
}

const withoutNote = (link: VisitorLink): VisitorLink => ({ ...link, note: undefined });

// The newest actions are the ones on screen, so the oldest note goes first (never the latest link's), then the oldest link.
function shed(state: VisitorState): VisitorState {
  const noted = state.links.findIndex((link, index) => link.note && index < state.links.length - 1);
  if (noted >= 0) return { ...state, links: state.links.map((link, index) => (index === noted ? withoutNote(link) : link)) };
  return { ...state, links: state.links.slice(1) };
}

export function encodeVisitor(state: VisitorState): string {
  const value = Buffer.from(JSON.stringify(state)).toString("base64url");
  if (value.length <= COOKIE_BUDGET || state.links.length === 0) return value;
  return encodeVisitor(shed(state));
}

const cookieFlags = (secure: boolean) => `Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;

export const visitorCookie = (state: VisitorState, secure: boolean): string =>
  `${DEMO_VISITOR_COOKIE}=${encodeVisitor(state)}; Max-Age=${COOKIE_MAX_AGE_S}; ${cookieFlags(secure)}`;

export const clearedVisitorCookie = (secure: boolean): string => `${DEMO_VISITOR_COOKIE}=; Max-Age=0; ${cookieFlags(secure)}`;

// ---- Identity ----

const VISITOR_LOOK = lookFromBuilder({ ...DEFAULT_BUILDER, hair: "curly", shirt: "#FF6B4A", extras: { cap: false, glasses: true, beard: false } });

export function visitorCard(state: VisitorState): DemoPerson {
  const { profile } = state;
  return {
    id: DEMO_VISITOR_ID,
    handle: "ari-solano",
    name: profile.name ?? "Ari Solano",
    photoUrl: null,
    avatar: profile.avatar ?? VISITOR_LOOK,
    avatarMode: profile.avatarMode ?? "monito",
    headline: profile.headline ?? "Product engineer",
    company: profile.company ?? "COMPA",
    city: profile.city ?? "Guadalajara",
    interests: ["Product", "AI Products", "Community"],
    links: {},
  };
}

// ---- Connections ----

const hex12 = (value: number) => value.toString(16).padStart(12, "0");
const CONNECTION_ID = /^de000004-0000-4000-8000-([0-9a-f]{12})$/;
const INTERACTION_ID = /^de000005-0000-4000-8000-([0-9a-f]{12})$/;

// The visitor meets each person once, so the cast index names the connection and its note.
export const demoConnectionId = (person: number): string => `de000004-0000-4000-8000-${hex12(person)}`;
export const demoInteractionId = (person: number): string => `de000005-0000-4000-8000-${hex12(person)}`;

function personIn(pattern: RegExp, id: string): number | null {
  const match = pattern.exec(id);
  const person = match?.[1] ? Number.parseInt(match[1], 16) : -1;
  return castIndex.safeParse(person).success ? person : null;
}

export const personOfConnection = (id: string): number | null => personIn(CONNECTION_ID, id);
export const personOfInteraction = (id: string): number | null => personIn(INTERACTION_ID, id);

export const linkWith = (state: VisitorState, person: number): VisitorLink | undefined => state.links.find((link) => link.person === person);

export const kindOf = (link: VisitorLink): ConnectionKindT => (link.knew ? "reconnection" : "new");

export const acceptedAt = (link: VisitorLink): number => (link.direction === "sent" ? link.at + DEMO_ACCEPT_MS : link.at);

export const isAccepted = (link: VisitorLink, now: number): boolean => acceptedAt(link) <= now;

// What the visitor earns for one connection: the kind for both, topics for the scanner, a note for its author.
export function linkPoints(link: VisitorLink): { kind: number; topics: number; note: number; total: number } {
  const kind = CONNECTION_POINTS[kindOf(link)];
  const topics = link.direction === "sent" ? topicsPointsFor(link.topics) : 0;
  const note = link.note ? SUMMARY_POINTS : 0;
  return { kind, topics, note, total: kind + topics + note };
}

// Requests still waiting for the visitor's answer.
export const pendingRequesters = (state: VisitorState): number[] =>
  DEMO_REQUESTERS.filter((person) => !linkWith(state, person) && !state.declined.includes(person));

// D4's simulated scan "finds" the first person the visitor has not met yet; null once they met everyone.
export function nextScanTarget(state: VisitorState, cast: readonly DemoPerson[]): DemoPerson | null {
  const taken = (index: number) => Boolean(linkWith(state, index)) || (DEMO_REQUESTERS as readonly number[]).includes(index);
  return cast.find((_, index) => !taken(index)) ?? null;
}

export const addLink = (state: VisitorState, link: VisitorLink): VisitorState => ({
  ...state,
  links: [...state.links.filter((other) => other.person !== link.person), link].slice(-MAX_LINKS),
  declined: state.declined.filter((person) => person !== link.person),
});

export const updateLink = (state: VisitorState, person: number, change: Partial<VisitorLink>): VisitorState => ({
  ...state,
  links: state.links.map((link) => (link.person === person ? { ...link, ...change } : link)),
});
