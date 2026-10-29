// Which badges a person has earned and how far the rest are, from counted facts (README "Insignias").
// Secret badges have no rule yet: they stay locked and show no hint.
import { BADGE_IDS, isSecret, type BadgeId } from "./catalog";

export type BadgeFacts = {
  // Accepted connections, all events.
  totalConnections: number;
  // Accepted connections at the current event.
  connectionsTonight: number;
  // Times someone scanned the person and the connection was accepted, all events.
  scannedBy: number;
  eventsAttended: number;
  consecutiveEvents: number;
  cities: number;
  distinctTopics: number;
  notesApproved: number;
  // Reconnections / events together with the single person met most often.
  maxReconnectionsWithOne: number;
  maxEventsWithOne: number;
  // Minutes between the event start and the person's first accepted connection tonight; null when none.
  firstConnectionMinute: number | null;
  // Minutes between the person's last accepted connection tonight and the event end; null when none.
  minutesBeforeEnd: number | null;
  eventConnections: number;
  // Position among all users by sign-up order, 1-based.
  signupIndex: number;
  attendedFoundersFest2026: boolean;
};

export type Progress = { current: number; total: number };

type Rule = (facts: BadgeFacts) => Progress | null;

const count = (current: number, total: number): Progress => ({ current: Math.min(current, total), total });
const flag = (done: boolean): Progress => count(done ? 1 : 0, 1);

const RULES: Partial<Record<BadgeId, Rule>> = {
  apreton: (f) => flag(f.totalConnections >= 1),
  madrugador: (f) => flag(f.firstConnectionMinute !== null && f.firstConnectionMinute <= 60),
  cierre: (f) => flag(f.minutesBeforeEnd !== null && f.minutesBeforeEnd <= 30),
  iman: (f) => count(f.scannedBy, 10),
  maraton: (f) => count(f.connectionsTonight, 15),
  tresdetres: (f) => count(f.maxReconnectionsWithOne, 3),
  // "Puente" needs introductions, which the model does not record yet.
  puente: () => count(0, 3),
  duo: (f) => count(f.maxEventsWithOne, 3),
  ff2026: (f) => flag(f.attendedFoundersFest2026),
  og: (f) => flag(f.signupIndex <= 100),
  conector100: (f) => count(f.totalConnections, 100),
  trotamundos: (f) => count(f.cities, 4),
  curioso: (f) => count(f.distinctTopics, 10),
  memoria: (f) => count(f.notesApproved, 20),
  quinientos: (f) => count(f.eventConnections, 500),
  cuatro: (f) => count(f.consecutiveEvents, 4),
};

export function progressFor(id: BadgeId, facts: BadgeFacts): Progress | null {
  if (isSecret(id)) return null;
  return RULES[id]?.(facts) ?? null;
}

export const isEarned = (progress: Progress | null): boolean => progress !== null && progress.current >= progress.total;

// Badges whose rule is complete, in catalog order.
export const earnedBadges = (facts: BadgeFacts): BadgeId[] => BADGE_IDS.filter((id) => isEarned(progressFor(id, facts)));
