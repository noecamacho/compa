// Points rules (data model M3, M4, M18).
import type { ConnectionKindT } from "./api/schemas";

export const CONNECTION_POINTS: Record<ConnectionKindT, number> = { new: 20, reconnection: 10 };
// Value from docs/contracts/ai-summaries-api.md via data model M18; the captain still has to confirm it.
export const SUMMARY_POINTS = 25;

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
