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

export const isRunning = (event: { startsAt: Date; endsAt: Date }, now: Date): boolean =>
  event.startsAt <= now && now < event.endsAt;

export const hasEnded = (event: { endsAt: Date }, now: Date): boolean => now >= event.endsAt;
