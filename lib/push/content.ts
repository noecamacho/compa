// What a push alert says and where tapping it goes. Same text as the /notifications list (lib/copy), so an alert
// and the list never disagree; the tag matches the list item id, so a repeated alert replaces the old one.
import { copyFor } from "../copy";
import { badgeLabel } from "../notifications/present";
import type { Locale } from "../i18n";

export type PushNotice =
  | { kind: "request"; connectionId: string; personName: string; eventName: string }
  | { kind: "accepted"; connectionId: string; personName: string; eventName: string }
  | { kind: "invitee_connected"; personId: string; personName: string }
  | { kind: "badge_earned"; badgeId: string; badgeName: string };

export type PushPayload = { title: string; body: string; url: string; tag: string };

const TITLE = "COMPA";

export function pushPayload(notice: PushNotice, locale: Locale): PushPayload {
  const { notifications: copy, badgeNames } = copyFor(locale);
  if (notice.kind === "request") {
    return { title: TITLE, body: copy.request(notice.personName, notice.eventName), url: `/requests/${notice.connectionId}`, tag: `request:${notice.connectionId}` };
  }
  if (notice.kind === "accepted") {
    return { title: TITLE, body: copy.accepted(notice.personName, notice.eventName), url: `/connections/${notice.connectionId}/done`, tag: `accepted:${notice.connectionId}` };
  }
  if (notice.kind === "invitee_connected") {
    return { title: TITLE, body: copy.inviteeConnected(notice.personName), url: "/invite", tag: `invitee:${notice.personId}` };
  }
  return { title: TITLE, body: copy.badgeEarned(badgeLabel(badgeNames, notice.badgeId, notice.badgeName)), url: "/me/badges", tag: `badge:${notice.badgeId}` };
}
