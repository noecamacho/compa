import "server-only";
import { after } from "next/server";
import type { UserRow } from "../../db/schema";
import { BADGES, type BadgeId } from "../badges/catalog";
import type { PushNotice } from "../push/content";
import { broadcast, userTopic, type UserMessage } from "../realtime";
import { cardFor } from "./people";
import { pushTo } from "./push";

// One notification for one person: the Realtime poke to their private channel and the Web Push alert (T-080, T-081).
export type Notice = { userId: string; message: UserMessage; push: PushNotice };

// Realtime is awaited, so an open app hears about it before the actor's response returns; Web Push goes out after the
// response, so a slow push service never delays the tap that caused it.
export async function notify(...notices: Notice[]): Promise<void> {
  if (notices.length === 0) return;
  after(() => Promise.all(notices.map((notice) => pushTo(notice.userId, notice.push))));
  await broadcast(...notices.map((notice) => notice.message));
}

export function badgeNotices(userId: string, badgeIds: readonly BadgeId[]): Notice[] {
  return badgeIds.map((badgeId) => {
    const badgeName = BADGES[badgeId].name;
    return { userId, message: { topic: userTopic(userId), event: "badge.earned", payload: { badgeId, badgeName } }, push: { kind: "badge_earned", badgeId, badgeName } };
  });
}

export async function inviteeNotice(inviterId: string, invitee: UserRow): Promise<Notice> {
  const card = await cardFor(inviterId, invitee);
  return {
    userId: inviterId,
    message: { topic: userTopic(inviterId), event: "invitee.connected", payload: { invitee: card } },
    push: { kind: "invitee_connected", personId: invitee.id, personName: card.name },
  };
}
