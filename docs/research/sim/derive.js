// GENERATED from derive.ts by generate.ts; do not edit. Classic script: exposes window.CompaSim.
(function (root) {
const NEW_CONNECTION_POINTS = 50;
const RECONNECTION_POINTS = 20;
const TOPICS_BONUS_POINTS = 5;
const SUMMARY_POINTS = 15;
const CONNECTION_TOPIC_WEIGHT = 1;
const SUMMARY_TOPIC_WEIGHT = 3;
const ACTIVE_WINDOW_SEC = 600;
const ANONYMOUS_NAME = "Anonymous";
const pairKey = (a, b) => {
  const other = b ?? "";
  return a < other ? `${a}|${other}` : `${other}|${a}`;
};
function dedupeKey(event) {
  if (event.type === "checkin")
    return `checkin|${event.a}`;
  if (event.type === "badge")
    return `badge|${event.a}|${event.badge ?? ""}`;
  return `${event.type}|${pairKey(event.a, event.b)}`;
}
const sortedCache = new WeakMap;
function sortedEvents(scenario) {
  const cached = sortedCache.get(scenario);
  if (cached)
    return cached;
  const seen = new Set;
  const sorted = scenario.events.map((event, index) => ({ event, index })).sort((x, y) => x.event.t - y.event.t || x.index - y.index).map(({ event }) => event).filter((event) => {
    const key = dedupeKey(event);
    if (seen.has(key))
      return false;
    seen.add(key);
    return true;
  });
  sortedCache.set(scenario, sorted);
  return sorted;
}
function eventsUntil(scenario, t) {
  const sorted = sortedEvents(scenario);
  let end = 0;
  while (end < sorted.length && (sorted[end]?.t ?? 1 / 0) <= t)
    end++;
  return sorted.slice(0, end);
}
const attendeeIndex = new WeakMap;
function attendeeById(scenario) {
  const cached = attendeeIndex.get(scenario);
  if (cached)
    return cached;
  const map = new Map(scenario.attendees.map((attendee) => [attendee.id, attendee]));
  attendeeIndex.set(scenario, map);
  return map;
}
function displayName(scenario, id) {
  const attendee = attendeeById(scenario).get(id);
  if (!attendee)
    return id;
  return attendee.anonymous ? ANONYMOUS_NAME : attendee.name;
}
function tally(scenario, t) {
  const scores = new Map;
  const get = (id) => {
    const existing = scores.get(id);
    if (existing)
      return existing;
    const fresh = { points: 0, connections: 0, checkedInAt: 1 / 0 };
    scores.set(id, fresh);
    return fresh;
  };
  for (const event of eventsUntil(scenario, t))
    applyToTally(event, get);
  return scores;
}
function applyToTally(event, get) {
  if (event.type === "checkin") {
    get(event.a).checkedInAt = event.t;
    return;
  }
  if (event.type === "summary_approved") {
    get(event.a).points += event.points ?? SUMMARY_POINTS;
    return;
  }
  if (event.type !== "connection_accepted" || !event.b)
    return;
  const each = event.points ?? NEW_CONNECTION_POINTS;
  const scanner = get(event.a);
  const scanned = get(event.b);
  scanner.points += each + (event.topics?.length ? TOPICS_BONUS_POINTS : 0);
  scanned.points += each;
  scanner.connections++;
  scanned.connections++;
}
function leaderboardAt(scenario, t) {
  const scores = tally(scenario, t);
  const rows = scenario.attendees.filter((attendee) => (scores.get(attendee.id)?.checkedInAt ?? 1 / 0) <= t).map((attendee) => {
    const score = scores.get(attendee.id) ?? { points: 0, connections: 0, checkedInAt: 1 / 0 };
    return {
      rank: 0,
      id: attendee.id,
      name: attendee.anonymous ? ANONYMOUS_NAME : attendee.name,
      photo: attendee.anonymous ? null : attendee.photo,
      anonymous: attendee.anonymous,
      ...score
    };
  }).sort((x, y) => y.points - x.points || y.connections - x.connections || x.checkedInAt - y.checkedInAt || (x.id < y.id ? -1 : 1));
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}
function topicsAt(scenario, t) {
  const scores = new Map;
  const add = (topics, weight) => {
    for (const topic of topics ?? [])
      scores.set(topic, (scores.get(topic) ?? 0) + weight);
  };
  for (const event of eventsUntil(scenario, t)) {
    if (event.type === "connection_accepted")
      add(event.topics, CONNECTION_TOPIC_WEIGHT);
    if (event.type === "summary_approved")
      add(event.topics, SUMMARY_TOPIC_WEIGHT);
  }
  return [...scores].map(([topic, score]) => ({ topic, score })).sort((x, y) => y.score - x.score || (x.topic < y.topic ? -1 : 1));
}
function eventState(scenario, t) {
  if (t < scenario.eventStartsAtSec)
    return "before";
  return t < scenario.eventEndsAtSec ? "running" : "ended";
}
function countersAt(scenario, t) {
  const counters = {
    checkedIn: 0,
    connections: 0,
    newCount: 0,
    reconnections: 0,
    summaries: 0,
    pendingRequests: 0,
    activePeople: 0,
    eventState: eventState(scenario, t)
  };
  const active = new Set;
  for (const event of eventsUntil(scenario, t)) {
    if (event.type === "checkin")
      counters.checkedIn++;
    if (event.type === "summary_approved")
      counters.summaries++;
    if (event.type === "connection_requested")
      counters.pendingRequests++;
    if (event.type !== "connection_accepted")
      continue;
    counters.connections++;
    counters.pendingRequests = Math.max(0, counters.pendingRequests - 1);
    if (event.points === RECONNECTION_POINTS)
      counters.reconnections++;
    if (t - event.t > ACTIVE_WINDOW_SEC)
      continue;
    active.add(event.a);
    if (event.b)
      active.add(event.b);
  }
  counters.newCount = counters.connections - counters.reconnections;
  counters.activePeople = active.size;
  return counters;
}
function feedAt(scenario, t, n) {
  const shown = eventsUntil(scenario, t).filter((event) => event.type !== "connection_requested");
  return shown.slice(Math.max(0, shown.length - n)).reverse().map((event) => ({
    t: event.t,
    type: event.type,
    a: event.a,
    aName: displayName(scenario, event.a),
    ...event.b ? { b: event.b, bName: displayName(scenario, event.b) } : {},
    ...event.topics ? { topics: event.topics } : {},
    ...event.badge ? { badge: event.badge } : {}
  }));
}

root.CompaSim = { NEW_CONNECTION_POINTS, RECONNECTION_POINTS, TOPICS_BONUS_POINTS, SUMMARY_POINTS, CONNECTION_TOPIC_WEIGHT, SUMMARY_TOPIC_WEIGHT, ACTIVE_WINDOW_SEC, ANONYMOUS_NAME, eventsUntil, displayName, leaderboardAt, topicsAt, countersAt, feedAt };
})(typeof window !== "undefined" ? window : globalThis);
