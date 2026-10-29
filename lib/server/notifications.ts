import "server-only";
import { and, desc, eq, gt, isNotNull, lte, sql } from "drizzle-orm";
import { getDb } from "../../db/client";
import { connections, events, invites, userBadges, users } from "../../db/schema";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import type { NotificationT } from "../api/schemas";
import { BADGES, BADGE_IDS, type BadgeId } from "../badges/catalog";
import { broadcast, userTopic } from "../realtime";
import { cardsFor } from "./people";

function isBadgeId(value: string): value is BadgeId {
  return (BADGE_IDS as readonly string[]).includes(value);
}

function toIso(date: Date): string {
  return date.toISOString();
}

function isUnseen(createdAt: Date, seenAt: Date | null): boolean {
  return seenAt === null || createdAt > seenAt;
}

export async function listNotifications({ user }: InputOf<typeof R.listNotifications>): ResultOf<typeof R.listNotifications> {
  const db = getDb();
  const now = new Date();
  const [requests, accepted, invitees, earnedBadges] = await Promise.all([
    db
      .select({ connection: connections, eventName: events.name, person: users })
      .from(connections)
      .innerJoin(events, eq(events.id, connections.eventId))
      .innerJoin(users, eq(users.id, connections.requesterId))
      .where(and(eq(connections.addresseeId, user.id), eq(connections.status, "pending"), lte(events.startsAt, now), gt(events.endsAt, now)))
      .orderBy(desc(connections.createdAt)),
    db
      .select({ connection: connections, eventName: events.name, person: users })
      .from(connections)
      .innerJoin(events, eq(events.id, connections.eventId))
      .innerJoin(users, eq(users.id, connections.addresseeId))
      .where(and(eq(connections.requesterId, user.id), eq(connections.status, "accepted")))
      .orderBy(desc(connections.respondedAt)),
    db
      .select({ invite: invites, person: users })
      .from(invites)
      .innerJoin(users, eq(users.id, invites.inviteeId))
      .where(and(eq(invites.inviterId, user.id), isNotNull(invites.firstConnectionAt)))
      .orderBy(desc(invites.firstConnectionAt)),
    db.select().from(userBadges).where(eq(userBadges.userId, user.id)).orderBy(desc(userBadges.earnedAt)),
  ]);

  const [requestCards, acceptedCards, inviteeCards] = await Promise.all([
    cardsFor(user.id, requests.map((item) => item.person), db),
    cardsFor(user.id, accepted.map((item) => item.person), db),
    cardsFor(user.id, invitees.map((item) => item.person), db),
  ]);
  const seenAt = user.notificationsSeenAt;
  const notifications: NotificationT[] = [
    ...requests.flatMap(({ connection, eventName }) => {
      const person = requestCards.get(connection.requesterId);
      if (!person) return [];
      return [{ id: `request:${connection.id}`, kind: "request" as const, connectionId: connection.id, person, eventName, createdAt: toIso(connection.createdAt), unseen: isUnseen(connection.createdAt, seenAt) }];
    }),
    ...accepted.flatMap(({ connection, eventName }) => {
      const person = acceptedCards.get(connection.addresseeId);
      if (!person || !connection.respondedAt) return [];
      return [{ id: `accepted:${connection.id}`, kind: "accepted" as const, connectionId: connection.id, person, eventName, createdAt: toIso(connection.respondedAt), unseen: isUnseen(connection.respondedAt, seenAt) }];
    }),
    ...invitees.flatMap(({ invite, person: owner }) => {
      const person = inviteeCards.get(owner.id);
      const createdAt = invite.firstConnectionAt;
      if (!person || !createdAt) return [];
      return [{ id: `invitee:${invite.id}`, kind: "invitee_connected" as const, person, createdAt: toIso(createdAt), unseen: isUnseen(createdAt, seenAt) }];
    }),
    ...earnedBadges.flatMap((badge) => {
      if (!isBadgeId(badge.badgeId)) return [];
      return [{ id: `badge:${badge.badgeId}`, kind: "badge_earned" as const, badgeId: badge.badgeId, badgeName: BADGES[badge.badgeId].name, createdAt: toIso(badge.earnedAt), unseen: isUnseen(badge.earnedAt, seenAt) }];
    }),
  ];

  notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { body: { notifications, unseenCount: notifications.filter((item) => item.unseen).length } };
}

// Never moves backwards (a stale tab) nor past now (a future timestamp would hide alerts that have not happened yet).
export const nextSeenAt = (current: Date | null, seenThrough: Date, now: Date): Date => {
  const clamped = seenThrough > now ? now : seenThrough;
  return current && current > clamped ? current : clamped;
};

export async function markNotificationsSeen({ user, body }: InputOf<typeof R.markNotificationsSeen>): ResultOf<typeof R.markNotificationsSeen> {
  const seenAt = nextSeenAt(user.notificationsSeenAt, new Date(body.seenThrough), new Date());
  // greatest() in the same statement, so two tabs posting at once cannot store the older mark.
  await getDb()
    .update(users)
    .set({ notificationsSeenAt: sql`greatest(coalesce(${users.notificationsSeenAt}, ${seenAt}), ${seenAt})` })
    .where(eq(users.id, user.id));
  // Other open tabs and devices clear their bell at once.
  await broadcast({ topic: userTopic(user.id), event: "notifications.seen", payload: { seenThrough: seenAt.toISOString() } });
  return { status: 204 };
}
