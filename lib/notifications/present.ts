// How one notification reads and where it leads; shared by the /notifications list and the in-app toast.
import type { NotificationT } from "../api/schemas";
import type { Dictionary } from "../copy";

type Copy = Dictionary["notifications"];

// Badge names come from the dictionary by id, so the text follows the locale; the API name is only a fallback.
export const badgeLabel = (badgeNames: Dictionary["badgeNames"], badgeId: string, fallback: string): string => badgeNames[badgeId as keyof Dictionary["badgeNames"]]?.name ?? fallback;

export function notificationText(item: NotificationT, copy: Copy, badgeNames: Dictionary["badgeNames"]): string {
  if (item.kind === "request") return copy.request(item.person.name, item.eventName);
  if (item.kind === "accepted") return copy.accepted(item.person.name, item.eventName);
  if (item.kind === "invitee_connected") return copy.inviteeConnected(item.person.name);
  return copy.badgeEarned(badgeLabel(badgeNames, item.badgeId, item.badgeName));
}

export function notificationHref(item: NotificationT): string {
  if (item.kind === "request") return `/requests/${item.connectionId}`;
  if (item.kind === "accepted") return `/connections/${item.connectionId}/done`;
  if (item.kind === "invitee_connected") return "/invite";
  return "/me/badges";
}

// What matters most comes first when several land at once: an accept usually brings a badge with it.
const PRIORITY: Record<NotificationT["kind"], number> = { request: 0, accepted: 1, invitee_connected: 2, badge_earned: 3 };

// Unseen items the client has not shown before, most important first, newest first within a kind; the first load
// (`known` null) announces nothing.
export function freshNotifications(items: readonly NotificationT[], known: ReadonlySet<string> | null): NotificationT[] {
  if (!known) return [];
  return items.filter((item) => item.unseen && !known.has(item.id)).sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || b.createdAt.localeCompare(a.createdAt));
}
