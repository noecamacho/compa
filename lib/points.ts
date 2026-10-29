// Points rules from the V2 design handoff (design/compa-v2/README.md "Puntos"); supersedes data model M3 and M18.
import type { ConnectionKindT } from "./api/schemas";

// To both people when the request is accepted.
export const CONNECTION_POINTS: Record<ConnectionKindT, number> = { new: 50, reconnection: 20 };
// To the scanner when at least one topic is marked while registering.
export const TOPICS_POINTS = 5;
// To the author of a voice note when its summary is approved.
export const SUMMARY_POINTS = 15;
// When an invited friend's first connection is accepted.
export const INVITE_POINTS = { inviter: 100, invitee: 50 } as const;
// Golden cap for the monito after this many invited friends connect.
export const GOLDEN_CAP_INVITES = 3;

export type KindFacts = {
  // The pair has an accepted connection at another event that started earlier.
  metAtEarlierEvent: boolean;
  requesterKnew: boolean | null;
  addresseeKnew: boolean | null;
};

// History or either "we already knew each other" makes it a reconnection; nobody can force `new` alone.
export function decideKind({ metAtEarlierEvent, requesterKnew, addresseeKnew }: KindFacts): ConnectionKindT {
  if (metAtEarlierEvent) return "reconnection";
  return requesterKnew === true || addresseeKnew === true ? "reconnection" : "new";
}

export const pointsFor = (kind: ConnectionKindT): number => CONNECTION_POINTS[kind];

export const topicsPointsFor = (topics: readonly string[]): number => (topics.length > 0 ? TOPICS_POINTS : 0);
