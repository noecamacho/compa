// How a connection's status looks to one of its two people (API spec §7.3, §7.4).
import type { ConnectionStatusForMeT } from "./api/schemas";

type StoredStatus = "pending" | "accepted" | "declined" | "expired";

export type StatusFacts = {
  status: StoredStatus;
  requesterId: string;
  viewerId: string;
  eventEnded: boolean;
};

// Expiry is evaluated on read; a decline is silent, so the requester sees pending, then expired.
export function statusForViewer({ status, requesterId, viewerId, eventEnded }: StatusFacts): ConnectionStatusForMeT {
  if (status === "accepted" || status === "expired") return status;
  if (status === "declined" && viewerId !== requesterId) return "declined";
  return eventEnded ? "expired" : "pending";
}

type Lifecycle = { status?: "draft" | "live" | "ended" | "archived" };

// Only a `live` event runs inside its window; draft, ended and archived never do (M20).
export const isRunning = (event: { startsAt: Date; endsAt: Date } & Lifecycle, now: Date): boolean =>
  (event.status ?? "live") === "live" && event.startsAt <= now && now < event.endsAt;

// An invite can be claimed for an event that is live and not over yet, even before its window opens.
export const isJoinable = (event: { endsAt: Date } & Lifecycle, now: Date): boolean => (event.status ?? "live") === "live" && !hasEnded(event, now);

// Ended or archived events are over even before their window closes, so pending requests expire.
export const hasEnded = (event: { endsAt: Date } & Lifecycle, now: Date): boolean =>
  now >= event.endsAt || event.status === "ended" || event.status === "archived";
