import "server-only";
import { and, desc, eq, notInArray } from "drizzle-orm";
import webpush, { WebPushError } from "web-push";
import { z } from "zod";
import { getDb } from "../../db/client";
import { pushSubscriptions, type PushSubscriptionRow } from "../../db/schema";
import { E, fail } from "../api/errors";
import type { InputOf, ResultOf } from "../api/route-spec";
import type * as R from "../api/routes";
import { FALLBACK_LOCALE } from "../i18n";
import { pushPayload, type PushNotice } from "../push/content";
import { allowedPushOrigins, isAllowedPushEndpoint } from "../push/endpoint";

// Web Push (VAPID). Unset keys turn push off: subscriptions are still stored, nothing is sent.
const PushEnv = z.object({
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().regex(/^(mailto:|https:\/\/)/),
});

type PushConfig = z.infer<typeof PushEnv>;

// Per user, so one person cannot fan a single event out to an unbounded list of endpoints. Saving counts as newest.
const MAX_DEVICES = 10;
const SEND_TIMEOUT_MS = 3000;
// An alert about a scan is useless after the event night; let the push service drop it after an hour.
const TTL_SECONDS = 60 * 60;
// The push service says the subscription is gone for good.
const GONE = new Set([404, 410]);

function pushConfig(): PushConfig | null {
  const parsed = PushEnv.safeParse(process.env);
  return parsed.success ? parsed.data : null;
}

const extraOrigins = () => allowedPushOrigins(process.env.PUSH_ALLOWED_ORIGINS);

export async function savePushSubscription({ user, body }: InputOf<typeof R.savePushSubscription>): ResultOf<typeof R.savePushSubscription> {
  if (!isAllowedPushEndpoint(body.endpoint, extraOrigins())) fail(E.invalidInput, "This push endpoint is not a browser push service.");
  const db = getDb();
  const values = { userId: user.id, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, locale: body.locale ?? FALLBACK_LOCALE };
  await db
    .insert(pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: values.userId, p256dh: values.p256dh, auth: values.auth, locale: values.locale, createdAt: new Date() } });
  const keep = db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id)).orderBy(desc(pushSubscriptions.createdAt)).limit(MAX_DEVICES);
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, user.id), notInArray(pushSubscriptions.id, keep)));
  return { status: 204 };
}

export async function deletePushSubscription({ user, body }: InputOf<typeof R.deletePushSubscription>): ResultOf<typeof R.deletePushSubscription> {
  await getDb().delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, body.endpoint)));
  return { status: 204 };
}

async function sendOne(subscription: PushSubscriptionRow, notice: PushNotice, config: PushConfig): Promise<void> {
  if (!isAllowedPushEndpoint(subscription.endpoint, extraOrigins())) return;
  const locale = subscription.locale === "es" ? "es" : "en";
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(pushPayload(notice, locale)),
      {
        vapidDetails: { subject: config.VAPID_SUBJECT, publicKey: config.NEXT_PUBLIC_VAPID_PUBLIC_KEY, privateKey: config.VAPID_PRIVATE_KEY },
        TTL: TTL_SECONDS,
        urgency: "high",
        timeout: SEND_TIMEOUT_MS,
      },
    );
  } catch (error) {
    if (error instanceof WebPushError && GONE.has(error.statusCode)) {
      await getDb().delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
      return;
    }
    console.error("web push failed", error instanceof WebPushError ? error.statusCode : error);
  }
}

// Sends to every browser the person turned alerts on in. Never throws: a failed push must not fail the request.
export async function pushTo(userId: string, notice: PushNotice): Promise<void> {
  const config = pushConfig();
  if (!config) return;
  try {
    const subscriptions = await getDb().select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    await Promise.all(subscriptions.map((subscription) => sendOne(subscription, notice, config)));
  } catch (error) {
    console.error("web push failed", error);
  }
}
