// Pure helpers that turn a simulator timeline into what /live shows at second t.
// No imports on purpose: generate.ts strips the types into derive.js for standalone HTML prototypes.
// Rules: wiki/points-rules.md (points, idempotency, leaderboard order), wiki/live-dashboard.md and
// wiki/topics-vocabulary.md (topic scoring x1 / x3, Anonymous opt-out), lib/server/live.ts (counters).

export type SimEventType = "checkin" | "connection_requested" | "connection_accepted" | "summary_approved" | "badge";

export type Attendee = {
  id: string;
  name: string;
  headline: string;
  photo: string | null;
  interests: string[];
  anonymous: boolean;
};

export type SimEvent = {
  t: number;
  type: SimEventType;
  a: string;
  b?: string;
  topics?: string[];
  points?: number;
  badge?: string;
};

export type Scenario = {
  name: string;
  description: string;
  durationSec: number;
  eventStartsAtSec: number;
  eventEndsAtSec: number;
  attendees: Attendee[];
  events: SimEvent[];
};

export type LeaderboardRow = {
  rank: number;
  id: string;
  name: string;
  photo: string | null;
  anonymous: boolean;
  points: number;
  connections: number;
  checkedInAt: number;
};

export type TopicScore = { topic: string; score: number };

export type Counters = {
  checkedIn: number;
  connections: number;
  newCount: number;
  reconnections: number;
  summaries: number;
  pendingRequests: number;
  activePeople: number;
  eventState: "before" | "running" | "ended";
};

export type FeedItem = {
  t: number;
  type: SimEventType;
  a: string;
  aName: string;
  b?: string;
  bName?: string;
  topics?: string[];
  badge?: string;
};

export const NEW_CONNECTION_POINTS = 50;
export const RECONNECTION_POINTS = 20;
export const TOPICS_BONUS_POINTS = 5;
export const SUMMARY_POINTS = 15;
export const CONNECTION_TOPIC_WEIGHT = 1;
export const SUMMARY_TOPIC_WEIGHT = 3;
export const ACTIVE_WINDOW_SEC = 600;
export const ANONYMOUS_NAME = "Anonymous";

const pairKey = (a: string, b: string | undefined): string => {
  const other = b ?? "";
  return a < other ? `${a}|${other}` : `${other}|${a}`;
};

// The keys mirror the database unique indexes, so a duplicate delivery never counts twice.
function dedupeKey(event: SimEvent): string {
  if (event.type === "checkin") return `checkin|${event.a}`;
  if (event.type === "badge") return `badge|${event.a}|${event.badge ?? ""}`;
  return `${event.type}|${pairKey(event.a, event.b)}`;
}

const sortedCache = new WeakMap<Scenario, SimEvent[]>();

// Events in time order (array order breaks ties), duplicates dropped; never trusts the array order.
function sortedEvents(scenario: Scenario): SimEvent[] {
  const cached = sortedCache.get(scenario);
  if (cached) return cached;
  const seen = new Set<string>();
  const sorted = scenario.events
    .map((event, index) => ({ event, index }))
    .sort((x, y) => x.event.t - y.event.t || x.index - y.index)
    .map(({ event }) => event)
    .filter((event) => {
      const key = dedupeKey(event);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  sortedCache.set(scenario, sorted);
  return sorted;
}

export function eventsUntil(scenario: Scenario, t: number): SimEvent[] {
  const sorted = sortedEvents(scenario);
  let end = 0;
  while (end < sorted.length && (sorted[end]?.t ?? Infinity) <= t) end++;
  return sorted.slice(0, end);
}

const attendeeIndex = new WeakMap<Scenario, Map<string, Attendee>>();

function attendeeById(scenario: Scenario): Map<string, Attendee> {
  const cached = attendeeIndex.get(scenario);
  if (cached) return cached;
  const map = new Map(scenario.attendees.map((attendee) => [attendee.id, attendee]));
  attendeeIndex.set(scenario, map);
  return map;
}

export function displayName(scenario: Scenario, id: string): string {
  const attendee = attendeeById(scenario).get(id);
  if (!attendee) return id;
  return attendee.anonymous ? ANONYMOUS_NAME : attendee.name;
}

type Tally = { points: number; connections: number; checkedInAt: number };

function tally(scenario: Scenario, t: number): Map<string, Tally> {
  const scores = new Map<string, Tally>();
  const get = (id: string): Tally => {
    const existing = scores.get(id);
    if (existing) return existing;
    const fresh = { points: 0, connections: 0, checkedInAt: Infinity };
    scores.set(id, fresh);
    return fresh;
  };
  for (const event of eventsUntil(scenario, t)) applyToTally(event, get);
  return scores;
}

function applyToTally(event: SimEvent, get: (id: string) => Tally): void {
  if (event.type === "checkin") {
    get(event.a).checkedInAt = event.t;
    return;
  }
  if (event.type === "summary_approved") {
    get(event.a).points += event.points ?? SUMMARY_POINTS;
    return;
  }
  if (event.type !== "connection_accepted" || !event.b) return;
  const each = event.points ?? NEW_CONNECTION_POINTS;
  const scanner = get(event.a);
  const scanned = get(event.b);
  scanner.points += each + (event.topics?.length ? TOPICS_BONUS_POINTS : 0);
  scanned.points += each;
  scanner.connections++;
  scanned.connections++;
}

// Checked-in attendees ordered like the server: points, connections, earliest check-in (then id, for determinism).
export function leaderboardAt(scenario: Scenario, t: number): LeaderboardRow[] {
  const scores = tally(scenario, t);
  const rows = scenario.attendees
    .filter((attendee) => (scores.get(attendee.id)?.checkedInAt ?? Infinity) <= t)
    .map((attendee) => {
      const score = scores.get(attendee.id) ?? { points: 0, connections: 0, checkedInAt: Infinity };
      return {
        rank: 0,
        id: attendee.id,
        name: attendee.anonymous ? ANONYMOUS_NAME : attendee.name,
        photo: attendee.anonymous ? null : attendee.photo,
        anonymous: attendee.anonymous,
        ...score,
      };
    })
    .sort((x, y) => y.points - x.points || y.connections - x.connections || x.checkedInAt - y.checkedInAt || (x.id < y.id ? -1 : 1));
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

// Every topic with a score, best first: connection topics x1, approved-summary topics x3.
export function topicsAt(scenario: Scenario, t: number): TopicScore[] {
  const scores = new Map<string, number>();
  const add = (topics: string[] | undefined, weight: number) => {
    for (const topic of topics ?? []) scores.set(topic, (scores.get(topic) ?? 0) + weight);
  };
  for (const event of eventsUntil(scenario, t)) {
    if (event.type === "connection_accepted") add(event.topics, CONNECTION_TOPIC_WEIGHT);
    if (event.type === "summary_approved") add(event.topics, SUMMARY_TOPIC_WEIGHT);
  }
  return [...scores]
    .map(([topic, score]) => ({ topic, score }))
    .sort((x, y) => y.score - x.score || (x.topic < y.topic ? -1 : 1));
}

function eventState(scenario: Scenario, t: number): Counters["eventState"] {
  if (t < scenario.eventStartsAtSec) return "before";
  return t < scenario.eventEndsAtSec ? "running" : "ended";
}

// checkedIn / connections / newCount / reconnections match the LiveSnapshot counters; the rest are extras.
export function countersAt(scenario: Scenario, t: number): Counters {
  const counters: Counters = {
    checkedIn: 0,
    connections: 0,
    newCount: 0,
    reconnections: 0,
    summaries: 0,
    pendingRequests: 0,
    activePeople: 0,
    eventState: eventState(scenario, t),
  };
  const active = new Set<string>();
  for (const event of eventsUntil(scenario, t)) {
    if (event.type === "checkin") counters.checkedIn++;
    if (event.type === "summary_approved") counters.summaries++;
    if (event.type === "connection_requested") counters.pendingRequests++;
    if (event.type !== "connection_accepted") continue;
    counters.connections++;
    counters.pendingRequests = Math.max(0, counters.pendingRequests - 1);
    if (event.points === RECONNECTION_POINTS) counters.reconnections++;
    if (t - event.t > ACTIVE_WINDOW_SEC) continue;
    active.add(event.a);
    if (event.b) active.add(event.b);
  }
  counters.newCount = counters.connections - counters.reconnections;
  counters.activePeople = active.size;
  return counters;
}

// The n newest feed items, newest first. Requests are not shown; summaries show topics only, never text.
export function feedAt(scenario: Scenario, t: number, n: number): FeedItem[] {
  const shown = eventsUntil(scenario, t).filter((event) => event.type !== "connection_requested");
  return shown
    .slice(Math.max(0, shown.length - n))
    .reverse()
    .map((event) => ({
      t: event.t,
      type: event.type,
      a: event.a,
      aName: displayName(scenario, event.a),
      ...(event.b ? { b: event.b, bName: displayName(scenario, event.b) } : {}),
      ...(event.topics ? { topics: event.topics } : {}),
      ...(event.badge ? { badge: event.badge } : {}),
    }));
}
