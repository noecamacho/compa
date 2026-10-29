// Deterministic /live event simulator. Run: `bun docs/research/sim/generate.ts`.
// Writes scenarios/<name>.json (compact) and derive.js (derive.ts without types, as a classic script).
// Real rules and vocabulary:
// - points: wiki/points-rules.md (+50 new / +20 reconnection each, +5 scanner for marked topics, +15 note author)
// - topics: wiki/topics-vocabulary.md, imported from lib/topics.ts
// - badges: wiki/rounds-and-badges.md, ids imported from lib/badges/catalog.ts, rules in lib/badges/rules.ts
// - layout/data: wiki/live-dashboard.md, lib/server/live.ts (LiveSnapshot counters)
import { BADGE_IDS, type BadgeId } from "../../../lib/badges/catalog";
import { TOPICS } from "../../../lib/topics";
import {
  NEW_CONNECTION_POINTS,
  RECONNECTION_POINTS,
  SUMMARY_POINTS,
  type Attendee,
  type Scenario,
  type SimEvent,
} from "./derive";

type Rng = () => number;

// mulberry32: tiny, seedable, same output on every machine.
function rngFrom(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rng: Rng, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T;
const shuffle = <T>(rng: Rng, items: readonly T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
};

const badge = (id: BadgeId): BadgeId => {
  if (!BADGE_IDS.includes(id)) throw new Error(`unknown badge ${id}`);
  return id;
};
const BADGE = {
  first: badge("apreton"),
  early: badge("madrugador"),
  closing: badge("cierre"),
  magnet: badge("iman"),
  marathon: badge("maraton"),
};

const FIRST = ["Ana", "Luis", "Sofía", "Diego", "Valeria", "Mateo", "Camila", "Santiago", "Lucía", "Javier", "Fernanda", "Emilio",
  "Paula", "Andrés", "Regina", "Tomás", "Mariana", "Iker", "Daniela", "Rodrigo", "Ximena", "Pablo", "Renata", "Hugo", "Alex",
  "Sam", "Priya", "Kenji", "Olivia", "Noah", "Aisha", "Liam", "Mei", "Omar", "Elena", "Bruno", "Nadia", "Carlos", "Julia", "Leo"];
const LAST = ["García", "Martínez", "López", "Hernández", "González", "Pérez", "Rodríguez", "Sánchez", "Ramírez", "Torres",
  "Flores", "Rivera", "Gómez", "Díaz", "Cruz", "Morales", "Reyes", "Ortiz", "Castillo", "Vargas", "Smith", "Chen", "Patel",
  "Kim", "Nguyen", "Silva", "Rossi", "Müller", "Novak", "Haddad"];
const EDGE_NAMES = [
  "María José Fernández de la Peña Hernández-Villavicencio",
  "Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.",
  "Dr. Jean-Baptiste Emmanuel Zorg III",
  "محمد عبد الرحمن الهاشمي",
  "שרה כהן-לוי",
  "李小龙",
  "Nguyễn Thị Minh Khai",
  "Zoë Ångström 🚀",
  "Ñandú Pérez 🇲🇽",
  "Ólafur Þór Guðmundsson",
  "Łukasz Żółć",
  "Ğül Şahin",
  "O'Brien-McAllister",
  "🦄🦄🦄",
  "A",
  "José 👩🏽‍💻 Ramírez",
  "Ἀλέξανδρος Παπαδόπουλος",
  "Анастасия Константинопольская",
  "Siddharth Venkataraman Subramaniam",
  "  Spaces  Around  ",
];
const ROLES = ["Frontend Engineer", "Backend Engineer", "Full-stack Developer", "AI Engineer", "Product Designer", "DevRel",
  "Engineering Manager", "Founder", "CTO", "Data Scientist", "Student", "Mobile Developer", "SRE", "Product Manager"];
const COMPANIES = ["Acme", "Globex", "Initech", "Hooli", "Stark Labs", "Umbrella", "Vandelay", "Wayne Tech", "Pied Piper", "freelance"];
const LONG_HEADLINE =
  "Principal Staff Senior Lead Distinguished Software Engineering Architect for Developer Experience, Platform and AI Agents @ Very Long Company Name International";

// Popular topics come first; "Other" is rare. Weight ~ 1 / rank^0.8 gives a realistic long tail.
function topicPicker(rng: Rng): (count: number) => string[] {
  const order: string[] = [...shuffle(rng, TOPICS.filter((topic) => topic !== "Other")), "Other"];
  const weights = order.map((_, rank) => 1 / (rank + 1) ** 0.8);
  return (count) => {
    const chosen = new Set<string>();
    while (chosen.size < count) {
      let roll = rng() * weights.reduce((sum, w) => sum + w, 0);
      const index = weights.findIndex((w) => (roll -= w) <= 0);
      chosen.add(order[index === -1 ? order.length - 1 : index] as string);
    }
    return [...chosen];
  };
}

type PeopleOptions = { photoRate: number; anonymousRate: number; edgeNames: boolean };

function makeAttendees(rng: Rng, count: number, options: PeopleOptions): Attendee[] {
  const topics = topicPicker(rng);
  return Array.from({ length: count }, (_, i) => {
    const id = `u${String(i + 1).padStart(4, "0")}`;
    const edge = options.edgeNames && rng() < 0.6;
    return {
      id,
      name: edge ? pick(rng, EDGE_NAMES) : `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      headline: edge && rng() < 0.4 ? LONG_HEADLINE : `${pick(rng, ROLES)} @ ${pick(rng, COMPANIES)}`,
      photo: rng() < options.photoRate ? `https://i.pravatar.cc/240?u=${id}` : null,
      interests: topics(int(rng, 2, 5)),
      anonymous: rng() < options.anonymousRate,
    };
  });
}

type Plan = {
  name: string;
  description: string;
  seed: number;
  people: number;
  durationSec: number;
  eventStartsAtSec: number;
  eventEndsAtSec: number;
  checkinFrom: number;
  checkinTo: number;
  // Seconds at which a connection is accepted; built with the helpers below.
  acceptTimes: (rng: Rng) => number[];
  summaryRate?: number;
  reconnectionRate?: number;
  photoRate?: number;
  anonymousRate?: number;
  edgeNames?: boolean;
  checkins?: boolean;
  // Drop events after this second (default durationSec); after-event uses it to freeze the board.
  lastEventSec?: number;
};

const uniform = (count: number, from: number, to: number) => (rng: Rng) =>
  Array.from({ length: count }, () => int(rng, from, to));
const every = (stepSec: number, from: number, to: number) => () =>
  Array.from({ length: Math.floor((to - from) / stepSec) + 1 }, (_, i) => from + i * stepSec);
const perMinute = (rate: number, from: number, to: number) => uniform(Math.round((rate * (to - from)) / 60), from, to);
const both = (...parts: ((rng: Rng) => number[])[]) => (rng: Rng) => parts.flatMap((part) => part(rng));

type PersonState = { checkedInAt: number; connections: number; scannedBy: number; badges: Set<string> };

function build(plan: Plan): Scenario {
  const rng = rngFrom(plan.seed);
  const attendees = makeAttendees(rng, plan.people, {
    photoRate: plan.photoRate ?? 0.85,
    anonymousRate: plan.anonymousRate ?? 0.03,
    edgeNames: plan.edgeNames ?? false,
  });
  const events: SimEvent[] = [];
  const state = new Map<string, PersonState>();
  const checkedIn: Attendee[] = [];
  const checkinOrder = attendees
    .map((attendee) => ({ attendee, t: int(rng, plan.checkinFrom, plan.checkinTo) }))
    .sort((x, y) => x.t - y.t);
  for (const { attendee, t } of plan.checkins === false ? [] : checkinOrder) {
    events.push({ t, type: "checkin", a: attendee.id });
    state.set(attendee.id, { checkedInAt: t, connections: 0, scannedBy: 0, badges: new Set() });
  }
  const pairs = new Set<string>();
  const award = (id: string, t: number, badgeId: string) => {
    const person = state.get(id);
    if (!person || person.badges.has(badgeId)) return;
    person.badges.add(badgeId);
    events.push({ t: t + 1, type: "badge", a: id, badge: badgeId });
  };
  let cursor = 0;
  for (const t of plan.acceptTimes(rng).sort((x, y) => x - y)) {
    while (cursor < checkinOrder.length && (checkinOrder[cursor]?.t ?? Infinity) <= t - 10) {
      checkedIn.push((checkinOrder[cursor] as { attendee: Attendee }).attendee);
      cursor++;
    }
    const pair = choosePair(rng, checkedIn, pairs);
    if (!pair) continue;
    const [a, b] = pair;
    const sa = state.get(a.id) as PersonState;
    const sb = state.get(b.id) as PersonState;
    const requestedAt = Math.min(t, Math.max(sa.checkedInAt, sb.checkedInAt, t - int(rng, 5, 60)) + 1);
    const shared = a.interests.filter((topic) => b.interests.includes(topic)).slice(0, 3);
    const topics = shared.length ? shared : rng() < 0.5 ? [pick(rng, a.interests)] : [];
    const points = rng() < (plan.reconnectionRate ?? 0.15) ? RECONNECTION_POINTS : NEW_CONNECTION_POINTS;
    events.push({ t: requestedAt, type: "connection_requested", a: a.id, b: b.id });
    events.push({ t, type: "connection_accepted", a: a.id, b: b.id, points, ...(topics.length ? { topics } : {}) });
    sa.connections++;
    sb.connections++;
    sb.scannedBy++;
    for (const [person, s] of [[a, sa], [b, sb]] as const) {
      if (s.connections === 1) award(person.id, t, BADGE.first);
      if (s.connections === 1 && t - plan.eventStartsAtSec <= 3600) award(person.id, t, BADGE.early);
      if (s.connections === 15) award(person.id, t, BADGE.marathon);
      if (t <= plan.eventEndsAtSec && plan.eventEndsAtSec - t <= 1800) award(person.id, t, BADGE.closing);
    }
    if (sb.scannedBy === 10) award(b.id, t, BADGE.magnet);
    if (rng() >= (plan.summaryRate ?? 0.27)) continue;
    const author = rng() < 0.5 ? a : b;
    const pool = [...new Set([...a.interests, ...b.interests])];
    events.push({
      t: t + int(rng, 60, 900),
      type: "summary_approved",
      a: author.id,
      b: author === a ? b.id : a.id,
      points: SUMMARY_POINTS,
      topics: shuffle(rng, pool).slice(0, int(rng, 1, 3)),
    });
  }
  const kept = events
    .filter((event) => event.t <= (plan.lastEventSec ?? plan.durationSec))
    .map((event, index) => ({ event, index }))
    .sort((x, y) => x.event.t - y.event.t || x.index - y.index)
    .map(({ event }) => event);
  return { ...header(plan), attendees, events: kept };
}

const header = (plan: Plan) => ({
  name: plan.name,
  description: plan.description,
  durationSec: plan.durationSec,
  eventStartsAtSec: plan.eventStartsAtSec,
  eventEndsAtSec: plan.eventEndsAtSec,
});

// Early arrivals are more social (index skew), pairs never repeat within an event (unique index, data model M5).
function choosePair(rng: Rng, checkedIn: Attendee[], pairs: Set<string>): [Attendee, Attendee] | null {
  if (checkedIn.length < 2) return null;
  for (let attempt = 0; attempt < 30; attempt++) {
    const a = checkedIn[Math.floor(rng() ** 1.4 * checkedIn.length)] as Attendee;
    const b = pick(rng, checkedIn);
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    if (a === b || pairs.has(key)) continue;
    pairs.add(key);
    return [a, b];
  }
  return null;
}

// Hand-built: exact ties so the tie-break (points, connections, earliest check-in) is testable.
function tieHeavy(): Scenario {
  const rng = rngFrom(707);
  const attendees = makeAttendees(rng, 40, { photoRate: 0.8, anonymousRate: 0, edgeNames: false });
  const ids = attendees.map((attendee) => attendee.id);
  const checkinTimes = shuffle(rng, ids.map((_, i) => 10 + i * 5));
  const events: SimEvent[] = ids.map((id, i) => ({ t: checkinTimes[i] as number, type: "checkin", a: id }));
  let t = 400;
  const connect = (a: string, b: string, points: number) => {
    events.push({ t, type: "connection_requested", a, b });
    events.push({ t: t + 5, type: "connection_accepted", a, b, points });
    t += 7;
  };
  const roundRobin = (group: string[], rounds: number) => {
    for (let round = 0; round < rounds; round++) {
      const ring = group.slice(1);
      const rotated = [group[0] as string, ...ring.slice(round), ...ring.slice(0, round)];
      for (let i = 0; i < rotated.length / 2; i++) connect(rotated[i] as string, rotated[rotated.length - 1 - i] as string, NEW_CONNECTION_POINTS);
    }
  };
  roundRobin(ids.slice(0, 20), 3);
  roundRobin(ids.slice(20, 30), 2);
  const groupC = ids.slice(30, 36);
  groupC.forEach((a, i) => groupC.slice(i + 1).forEach((b) => connect(a, b, RECONNECTION_POINTS)));
  events.sort((x, y) => x.t - y.t);
  return {
    name: "tie-heavy",
    description:
      "40 people, no topics, no summaries. u0001-u0020: 150 pts / 3 connections each; u0031-u0036: 100 pts / 5 reconnections; " +
      "u0021-u0030: 100 pts / 2 connections; u0037-u0040: 0 pts. Inside each tie the earliest check-in ranks first.",
    durationSec: 1200,
    eventStartsAtSec: 0,
    eventEndsAtSec: 1200,
    attendees,
    events,
  };
}

// Post-processes a normal run into what a flaky client receives: skewed clocks, duplicate deliveries, a disconnect gap.
function clockSkew(): Scenario {
  const gapFrom = 900;
  const gapTo = 1200;
  const base = build({
    name: "clock-skew-and-reconnect",
    description:
      `100 people, 1800 s. Events array is in DELIVERY order, not time order. ~8% of events have t skewed 1-20 s early ` +
      `(an accept can precede its request), ~6% are delivered twice, bursts share one timestamp. ` +
      `GAP: the client is disconnected from t=${gapFrom} to t=${gapTo}; events with t in that window are delivered together right after ` +
      `the gap (replay them as one catch-up at t=${gapTo}). Use derive.ts helpers: they sort and dedupe.`,
    seed: 1313,
    people: 100,
    durationSec: 1800,
    eventStartsAtSec: 0,
    eventEndsAtSec: 1800,
    checkinFrom: 0,
    checkinTo: 600,
    acceptTimes: both(uniform(220, 60, 1800), every(1, 1500, 1520)),
  });
  const rng = rngFrom(1314);
  const delivered = base.events.flatMap((event) => {
    const skewed = rng() < 0.08 ? { ...event, t: Math.max(0, event.t - int(rng, 1, 20)) } : event;
    const at = event.t >= gapFrom && event.t < gapTo ? gapTo + rng() : event.t + rng();
    const copies = [{ event: skewed, at }];
    if (rng() < 0.06) copies.push({ event: { ...skewed }, at: at + int(rng, 0, 30) });
    return copies;
  });
  // A batch insert: 25 consecutive events share one timestamp.
  const batchStart = delivered.findIndex(({ event }) => event.t >= 600);
  delivered.slice(batchStart, batchStart + 25).forEach((item) => (item.event = { ...item.event, t: 600 }));
  delivered.sort((x, y) => x.at - y.at);
  return { ...base, events: delivered.map(({ event }) => event) };
}

const MIN = 60;

export function buildAll(): Scenario[] {
  return [
    build({
      name: "zero-activity",
      description: "Event is open, one attendee is registered but not checked in, zero events. Every widget shows its empty state.",
      seed: 1, people: 1, durationSec: 600, eventStartsAtSec: 0, eventEndsAtSec: 7200, checkinFrom: 0, checkinTo: 0,
      acceptTimes: () => [], checkins: false,
    }),
    build({
      name: "one-attendee",
      description: "A single person checks in at t=30 and nobody else comes: podium of one, no connections, no topics.",
      seed: 2, people: 1, durationSec: 600, eventStartsAtSec: 0, eventEndsAtSec: 7200, checkinFrom: 30, checkinTo: 30,
      acceptTimes: () => [],
    }),
    build({
      name: "trickle",
      description: "60 people, one connection every 20 s for 30 min. Slow, readable motion; tests that animations do not feel dead.",
      seed: 3, people: 60, durationSec: 30 * MIN, eventStartsAtSec: 0, eventEndsAtSec: 2 * 3600, checkinFrom: 0, checkinTo: 10 * MIN,
      acceptTimes: every(20, 60, 30 * MIN),
    }),
    build({
      name: "steady",
      description: "The seed shape (wiki/live-dashboard.md): 150 people, 300 connections and ~80 summaries over a 2 h event.",
      seed: 4, people: 150, durationSec: 2 * 3600, eventStartsAtSec: 0, eventEndsAtSec: 2 * 3600, checkinFrom: 0, checkinTo: 45 * MIN,
      acceptTimes: uniform(300, 5 * MIN, 2 * 3600 - 60),
    }),
    build({
      name: "rush",
      description: "300 people, light background, then a burst of 40 connections/min from t=600 to t=780 (break after a talk).",
      seed: 5, people: 300, durationSec: 30 * MIN, eventStartsAtSec: 0, eventEndsAtSec: 2 * 3600, checkinFrom: 0, checkinTo: 8 * MIN,
      acceptTimes: both(perMinute(3, 2 * MIN, 30 * MIN), perMinute(40, 600, 780)),
    }),
    build({
      name: "huge",
      description: "Stress: 3000 attendees, ~10k events over 3 h. Not a realistic event; checks layout and replay performance.",
      seed: 6, people: 3000, durationSec: 3 * 3600, eventStartsAtSec: 0, eventEndsAtSec: 3 * 3600, checkinFrom: 0, checkinTo: 90 * MIN,
      acceptTimes: uniform(1900, 5 * MIN, 3 * 3600), photoRate: 0.7,
    }),
    build({
      name: "end-of-event",
      description:
        "Window = the last 10 min of a 2 h event plus 5 min after it. Events with t<0 are history (the initial snapshot). " +
        "Finale burst of 30 connections/min from t=420 to t=600; the event ends at t=600; a few summaries are approved after the end.",
      seed: 7, people: 150, durationSec: 15 * MIN, eventStartsAtSec: -110 * MIN, eventEndsAtSec: 10 * MIN,
      checkinFrom: -110 * MIN, checkinTo: -60 * MIN,
      acceptTimes: both(uniform(250, -105 * MIN, 420), perMinute(30, 420, 600)),
    }),
    build({
      name: "after-event",
      description: "The event ended at t=-60. All events are history (t<0); nothing happens in the window: a frozen final leaderboard.",
      seed: 8, people: 150, durationSec: 10 * MIN, eventStartsAtSec: -121 * MIN, eventEndsAtSec: -MIN,
      checkinFrom: -121 * MIN, checkinTo: -70 * MIN, acceptTimes: uniform(300, -115 * MIN, -20 * MIN), lastEventSec: -MIN,
    }),
    tieHeavy(),
    build({
      name: "long-names-and-missing-photos",
      description:
        "80 people: ~60% have very long, RTL, CJK, emoji, accented or whitespace-padded names, some long headlines, " +
        "~40% have no photo, ~15% opted out (render as Anonymous, no photo).",
      seed: 10, people: 80, durationSec: 30 * MIN, eventStartsAtSec: 0, eventEndsAtSec: 2 * 3600, checkinFrom: 0, checkinTo: 10 * MIN,
      acceptTimes: uniform(160, 2 * MIN, 30 * MIN), photoRate: 0.6, anonymousRate: 0.15, edgeNames: true,
    }),
    clockSkew(),
  ];
}

if (import.meta.main) {
  const dir = new URL(".", import.meta.url).pathname;
  for (const scenario of buildAll()) {
    await Bun.write(`${dir}scenarios/${scenario.name}.json`, JSON.stringify(scenario));
    console.log(`${scenario.name}: ${scenario.attendees.length} attendees, ${scenario.events.length} events`);
  }
  const js = new Bun.Transpiler({ loader: "ts" }).transformSync(await Bun.file(`${dir}derive.ts`).text());
  const names = [...js.matchAll(/^export (?:const|function) (\w+)/gm)].map((match) => match[1]);
  const body = js.replace(/^export /gm, "");
  await Bun.write(
    `${dir}derive.js`,
    `// GENERATED from derive.ts by generate.ts; do not edit. Classic script: exposes window.CompaSim.\n` +
      `(function (root) {\n${body}\nroot.CompaSim = { ${names.join(", ")} };\n})(typeof window !== "undefined" ? window : globalThis);\n`,
  );
  console.log(`derive.js: ${names.length} exports`);
}
