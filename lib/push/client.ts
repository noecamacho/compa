"use client";

// Browser side of Web Push: support detection, subscribe, unsubscribe and re-sync (T-080).
import { NoBody } from "../api/route-spec";
import { apiCall } from "../api/client";
import type { Locale } from "../i18n";

export type PushState = "unsupported" | "install" | "denied" | "off" | "on";

const SW_PATH = "/sw.js";
const vapidKey = (): string | undefined => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined;

// iPhone and iPad allow Web Push only from a Home Screen app (iOS 16.4+), never from a Safari tab.
function isIosBrowserTab(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true);
  return ios && !standalone;
}

const supportsPush = (): boolean => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function existingSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function pushState(): Promise<PushState> {
  if (!vapidKey()) return "unsupported";
  if (!supportsPush()) return isIosBrowserTab() ? "install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  return (await existingSubscription()) ? "on" : "off";
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

async function save(subscription: PushSubscription, locale: Locale): Promise<void> {
  await apiCall("POST", "/api/push/subscriptions", NoBody, { ...subscription.toJSON(), locale });
}

// Must run inside a tap: browsers ask for permission only from a user gesture.
export async function enablePush(locale: Locale): Promise<PushState> {
  const key = vapidKey();
  if (!key || !supportsPush()) return pushState();
  if ((await Notification.requestPermission()) !== "granted") return pushState();
  const registration = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  await navigator.serviceWorker.ready;
  const applicationServerKey = base64UrlToBytes(key);
  const current = await registration.pushManager.getSubscription();
  if (current && sameKey(current, applicationServerKey)) {
    await save(current, locale);
    return "on";
  }
  // A subscription made with an older VAPID key cannot receive our pushes; replace it.
  if (current) await forget(current);
  await save(await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }), locale);
  return "on";
}

function sameKey(subscription: PushSubscription, key: Uint8Array): boolean {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const bytes = new Uint8Array(current);
  return bytes.length === key.length && bytes.every((byte, index) => byte === key[index]);
}

async function forget(subscription: PushSubscription): Promise<void> {
  await apiCall("DELETE", "/api/push/subscriptions", NoBody, { endpoint: subscription.endpoint }).catch(() => undefined);
  await subscription.unsubscribe();
}

export async function disablePush(): Promise<PushState> {
  const subscription = supportsPush() ? await existingSubscription() : null;
  if (subscription) await forget(subscription);
  return pushState();
}

// On every app load: hands this browser's subscription to whoever is signed in now (shared device, new session), and
// moves it to the current VAPID key after a rotation (permission is already granted, so no tap is needed).
export async function syncPush(locale: Locale): Promise<void> {
  const key = vapidKey();
  if (!key || !supportsPush() || Notification.permission !== "granted") return;
  const subscription = await existingSubscription();
  if (!subscription) return;
  const applicationServerKey = base64UrlToBytes(key);
  if (sameKey(subscription, applicationServerKey)) return save(subscription, locale);
  const registration = await navigator.serviceWorker.ready;
  await forget(subscription);
  await save(await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }), locale);
}
