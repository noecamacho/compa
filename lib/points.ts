// Points rules from the V2 design handoff (design/compa-v2/README.md "Puntos"); supersedes data model M3 and M18.
import type { ConnectionKindT } from "./api/schemas";

// To both people when the request is accepted.
export const CONNECTION_POINTS: Record<ConnectionKindT, number> = { new: 50, reconnection: 20 };
// To the scanner when at least one topic is marked while registering.
export const TOPICS_POINTS = 5;
// To the author of a voice note when its summary is approved.
export const SUMMARY_POINTS = 15;
// Referral code (captain decision, 2026-10-29): +100 to the inviter when a friend joins, on the event the inviter is
// checked in to at that moment; +50 to the friend at their first accepted connection.
export const INVITE_POINTS = { inviter: 100, invitee: 50 } as const;
// Golden cap after this many friends joined through the referral code, inside an event or not.
export const GOLDEN_CAP_INVITES = 3;

// Outside an event a referral still counts toward the golden cap, but pays nothing.
export const referralPointsFor = (inviterEvent: { id: string } | null | undefined): number => (inviterEvent ? INVITE_POINTS.inviter : 0);

// Unlocked once, the first time the count reaches the target; never again after that.
export const unlocksGoldenCap = (goldenCapAt: Date | null, referrals: number): boolean => goldenCapAt === null && referrals >= GOLDEN_CAP_INVITES;

export type KindFacts = {
  // The pair has an accepted connection outside an event, or at another event that started earlier.
  metAtEarlierEvent: boolean;
  requesterKnew: boolean | null;
  addresseeKnew: boolean | null;
};

// History or either "we already knew each other" makes it a reconnection; nobody can force `new` alone.
export function decideKind({ metAtEarlierEvent, requesterKnew, addresseeKnew }: KindFacts): ConnectionKindT {
  if (metAtEarlierEvent) return "reconnection";
  return requesterKnew === true || addresseeKnew === true ? "reconnection" : "new";
}

// A connection outside an event (null) never scores; only its kind is kept.
export const pointsFor = (kind: ConnectionKindT, event: { id: string } | null): number => (event ? CONNECTION_POINTS[kind] : 0);

export const topicsPointsFor = (topics: readonly string[]): number => (topics.length > 0 ? TOPICS_POINTS : 0);
