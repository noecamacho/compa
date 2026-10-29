// T-080 / T-081: two real people, live. A scans B; B hears it in under 2 s through the private Realtime channel and
// Web Push; B accepts; A hears that; both see the points. Plus: another person's channel is refused, polling still
// delivers when Realtime is blocked, and a decline never notifies. Real mode against a local stack, never production
// (docs/testing/real-mode.md §6). Each test sets its own viewports and locales (390/834/1440, es/en), so the file runs
// once, in one project, serially: the mock push service owns one port.
import { readFileSync } from "node:fs";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import { z } from "zod";
import type { BrowserContext, Page } from "@playwright/test";
import type { TestUserT } from "../../lib/api/admin-schemas";
import { CONNECTION_POINTS } from "../../lib/points";
import type { TestSessionCookies } from "../../lib/testing/real-mode";
import { expect, test } from "../fixtures";
import { startMockPushService, type MockPushService } from "../support/mock-push-service";

const LIVE_MS = 2000;
// Polling runs every 3 s while Realtime is down; one interval plus a request of slack.
const POLL_FALLBACK_MS = 4500;
const PUSH_PORT = Number(process.env.E2E_PUSH_PORT ?? 3199);
const TOURS = ["home", "connect", "me", "ranking", "register"];

const NEW_POINTS = `+${CONNECTION_POINTS.new} pts`;
const firstName = (user: TestUserT) => user.name.split(" ")[0] ?? user.name;

const TLS_CERT = process.env.E2E_PUSH_TLS_CERT;
const TLS_KEY = process.env.E2E_PUSH_TLS_KEY;
const ConnectionId = z.object({ connectionId: z.uuid() });

const ONLY_PROJECT = "desktop-1440-en";

let push: MockPushService;

// The harness project sends its own Accept-Language; each context here picks its language explicitly.
const inLocale = (locale: "es-MX" | "en-US") => ({ locale, extraHTTPHeaders: { "Accept-Language": locale } });

async function openAs(context: BrowserContext, path: string): Promise<Page> {
  await context.addInitScript((ids: string[]) => ids.forEach((id) => localStorage.setItem(`compa:tour:${id}`, "done")), TOURS);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

const liveMode = (page: Page) => page.getByTestId("live-notifications");
const ready = (page: Page) => expect(liveMode(page)).toHaveAttribute("data-ready", "true", { timeout: 10_000 });
const bell = (page: Page) => page.locator('a[href="/notifications"]').first();

async function subscribeToMockPush(page: Page, name: string): Promise<string> {
  const subscription = push.subscriptionFor(name);
  const response = await page.request.post("/api/push/subscriptions", { data: subscription });
  expect(response.status()).toBe(204);
  return new URL(subscription.endpoint).pathname;
}

async function waitForPush(path: string, since: number, timeout: number): Promise<number> {
  await expect.poll(() => push.received.some((item) => item.path === path && item.at >= since), { timeout, intervals: [50] }).toBe(true);
  const hit = push.received.find((item) => item.path === path && item.at >= since);
  if (!hit) throw new Error("push vanished");
  expect(hit.headers["content-encoding"]).toBe("aes128gcm");
  expect(String(hit.headers.authorization)).toMatch(/^vapid t=.+, k=.+/);
  return hit.at - since;
}

// The Supabase session cookie (possibly chunked, `base64-` prefixed) → its access token.
function accessTokenOf(session: TestSessionCookies): string {
  const chunks = session.cookies
    .filter((cookie) => /^sb-.+-auth-token(\.\d+)?$/.test(cookie.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }))
    .map((cookie) => decodeURIComponent(cookie.value))
    .join("");
  const json: unknown = JSON.parse(Buffer.from(chunks.replace(/^base64-/, ""), "base64url").toString("utf8"));
  if (typeof json !== "object" || json === null || !("access_token" in json) || typeof json.access_token !== "string") throw new Error("no access token");
  return json.access_token;
}

function joinStatus(channel: RealtimeChannel): Promise<string> {
  return new Promise((resolve) => {
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED" && status !== "CHANNEL_ERROR" && status !== "TIMED_OUT") return;
      resolve(status);
    });
  });
}

test.describe("live notifications @real", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!TLS_CERT || !TLS_KEY, "needs E2E_PUSH_TLS_CERT and E2E_PUSH_TLS_KEY (docs/testing/real-mode.md §6)");

  test.beforeAll(async ({}, testInfo) => {
    testInfo.skip(testInfo.project.name !== ONLY_PROJECT, `sets its own viewports and locales; runs only in ${ONLY_PROJECT}`);
    push = await startMockPushService(PUSH_PORT, { cert: readFileSync(TLS_CERT ?? ""), key: readFileSync(TLS_KEY ?? "") });
  });
  test.afterAll(async () => {
    await push?.close();
  });

  test("a request and its acceptance arrive in under 2 s, by Realtime and by push, with points on both sides", async ({ browser, testUsers, signIn }) => {
    const [ana, bruno] = await testUsers(2);
    if (!ana || !bruno) throw new Error("test users not created");
    const anaContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...inLocale("es-MX") });
    const brunoContext = await browser.newContext({ viewport: { width: 390, height: 844 }, ...inLocale("en-US"), isMobile: true, hasTouch: true });
    await signIn(anaContext, ana);
    await signIn(brunoContext, bruno);

    const brunoPage = await openAs(brunoContext, "/home");
    await expect(liveMode(brunoPage)).toHaveAttribute("data-mode", "realtime", { timeout: 10_000 });
    await ready(brunoPage);
    await expect(bell(brunoPage)).toHaveAttribute("aria-label", "Notifications");
    const brunoPush = await subscribeToMockPush(brunoPage, `bruno-${bruno.id}`);

    const anaPage = await openAs(anaContext, `/connect/${bruno.handle}`);
    await expect(liveMode(anaPage)).toHaveAttribute("data-mode", "realtime", { timeout: 10_000 });
    await ready(anaPage);
    const anaPush = await subscribeToMockPush(anaPage, `ana-${ana.id}`);

    // A confirms the scan.
    const sentAt = Date.now();
    await anaPage.getByRole("button", { name: /Confirmar/ }).click();
    await expect(anaPage).toHaveURL(/\/connections\/[0-9a-f-]+\/done$/);
    await expect(anaPage.getByRole("heading", { name: `Solicitud enviada a ${firstName(bruno)}` })).toBeVisible();

    // B: toast and bell within 2 s, with no reload; push sent within 2 s too.
    const toast = brunoPage.getByTestId("notification-toast");
    await expect(toast).toContainText(`${ana.name} sent you a request`, { timeout: LIVE_MS });
    await expect(bell(brunoPage)).toHaveAttribute("aria-label", "Notifications, 1 new", { timeout: LIVE_MS });
    expect(Date.now() - sentAt).toBeLessThan(LIVE_MS + 500);
    expect(await waitForPush(brunoPush, sentAt, LIVE_MS)).toBeLessThan(LIVE_MS);
    await expect(brunoPage.getByRole("link", { name: new RegExp(`${firstName(ana)} wants|${firstName(ana)} quiere`) })).toBeVisible();

    // B opens the request from the toast and accepts.
    await toast.click();
    await expect(brunoPage).toHaveURL(/\/requests\/[0-9a-f-]+$/);
    const acceptedAt = Date.now();
    await brunoPage.getByRole("button", { name: "Aceptar" }).click();
    await expect(brunoPage).toHaveURL(/\/connections\/[0-9a-f-]+\/done$/);
    await expect(brunoPage.getByText(NEW_POINTS).first()).toBeVisible();

    // A: the waiting screen flips to "connected" and the toast says so, within 2 s.
    await expect(anaPage.getByRole("heading", { name: `Conectaste con ${firstName(bruno)}` })).toBeVisible({ timeout: LIVE_MS });
    await expect(anaPage.getByTestId("notification-toast")).toContainText(`${bruno.name} aceptó tu solicitud`, { timeout: LIVE_MS });
    await expect(anaPage.getByText(NEW_POINTS).first()).toBeVisible();
    expect(await waitForPush(anaPush, acceptedAt, LIVE_MS)).toBeLessThan(LIVE_MS);

    // Opening the list marks everything seen, and B's bell clears.
    await brunoPage.goto("/notifications");
    await expect(brunoPage.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await brunoPage.goto("/home");
    await expect(bell(brunoPage)).toHaveAttribute("aria-label", "Notifications");

    await anaContext.close();
    await brunoContext.close();
  });

  test("a person can join only their own private channel", async ({ testUsers, realMode, baseURL }) => {
    const [ana, bruno] = await testUsers(2);
    if (!ana || !bruno) throw new Error("test users not created");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    test.skip(!url || !anonKey, "needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const supabase = createClient(url ?? "", anonKey ?? "", { auth: { persistSession: false } });
    await supabase.realtime.setAuth(accessTokenOf(await realMode.signInAs(ana)));

    const heard: string[] = [];
    const anaChannel = supabase.channel(`user:${ana.id}`, { config: { private: true } });
    anaChannel.on("broadcast", { event: "*" }, ({ event }: { event: string }) => heard.push(event));
    expect(await joinStatus(anaChannel)).toBe("SUBSCRIBED");
    expect(await joinStatus(supabase.channel(`user:${bruno.id}`, { config: { private: true } }))).toBe("CHANNEL_ERROR");

    const anonymous = createClient(url ?? "", anonKey ?? "", { auth: { persistSession: false } });
    expect(await joinStatus(anonymous.channel(`user:${ana.id}`, { config: { private: true } }))).toBe("CHANNEL_ERROR");

    // A public (non-private) channel with the same topic name hears nothing the server sends to Ana.
    const eavesdropping = createClient(url ?? "", anonKey ?? "", { auth: { persistSession: false } });
    const eavesdropper = eavesdropping.channel(`user:${ana.id}`);
    const overheard: string[] = [];
    eavesdropper.on("broadcast", { event: "*" }, ({ event }: { event: string }) => overheard.push(event));
    expect(await joinStatus(eavesdropper)).toBe("SUBSCRIBED");

    const brunoSession = await realMode.signInAs(bruno);
    const response = await fetch(new URL("/api/connections", baseURL).toString(), {
      method: "POST",
      headers: { cookie: brunoSession.cookieHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ toHandle: ana.handle, screenConsent: true }),
    });
    expect(response.status).toBe(201);
    await expect.poll(() => heard, { timeout: LIVE_MS }).toContain("request.received");
    expect(overheard).toEqual([]);
    await Promise.all([supabase.removeAllChannels(), anonymous.removeAllChannels(), eavesdropping.removeAllChannels()]);
  });

  test("with Realtime blocked, polling still delivers the request", async ({ browser, testUsers, signIn }) => {
    const [ana, bruno] = await testUsers(2);
    if (!ana || !bruno) throw new Error("test users not created");
    const brunoContext = await browser.newContext({ viewport: { width: 834, height: 1112 }, ...inLocale("es-MX") });
    await brunoContext.routeWebSocket(/\/realtime\/v1\//, (socket) => socket.close());
    await signIn(brunoContext, bruno);
    const anaContext = await browser.newContext();
    await signIn(anaContext, ana);

    const brunoPage = await openAs(brunoContext, "/home");
    await ready(brunoPage);
    await expect(bell(brunoPage)).toHaveAttribute("aria-label", "Avisos");
    const response = await anaContext.request.post("/api/connections", { data: { toHandle: bruno.handle, screenConsent: true } });
    expect(response.status()).toBe(201);

    await expect(brunoPage.getByTestId("notification-toast")).toContainText(`${ana.name} te envió una solicitud`, { timeout: POLL_FALLBACK_MS });
    await expect(bell(brunoPage)).toHaveAttribute("aria-label", "Avisos, 1 nuevos");
    await expect(liveMode(brunoPage)).toHaveAttribute("data-mode", "polling");
    await anaContext.close();
    await brunoContext.close();
  });

  test("a decline never notifies the person who scanned", async ({ browser, testUsers, signIn }) => {
    const [ana, bruno] = await testUsers(2);
    if (!ana || !bruno) throw new Error("test users not created");
    const anaContext = await browser.newContext(inLocale("en-US"));
    const brunoContext = await browser.newContext();
    await signIn(anaContext, ana);
    await signIn(brunoContext, bruno);
    const anaPage = await openAs(anaContext, "/home");
    await expect(liveMode(anaPage)).toHaveAttribute("data-mode", "realtime", { timeout: 10_000 });
    await ready(anaPage);
    const anaPush = await subscribeToMockPush(anaPage, `ana-decline-${ana.id}`);
    const brunoPush = await subscribeToMockPush(await brunoContext.newPage(), `bruno-decline-${bruno.id}`);

    const sentAt = Date.now();
    const sent = await anaContext.request.post("/api/connections", { data: { toHandle: bruno.handle, screenConsent: true } });
    const { connectionId } = ConnectionId.parse(await sent.json());
    // Control: push works in this run, so the silence below means something.
    await waitForPush(brunoPush, sentAt, LIVE_MS);
    const declinedAt = Date.now();
    expect((await brunoContext.request.post(`/api/connections/${connectionId}/decline`, { data: {} })).status()).toBe(204);

    await anaPage.waitForTimeout(LIVE_MS + 500);
    expect(push.received.filter((item) => item.path === anaPush && item.at >= declinedAt)).toEqual([]);
    await expect(anaPage.getByTestId("notification-toast")).toHaveCount(0);
    await expect(bell(anaPage)).toHaveAttribute("aria-label", "Notifications");
    await anaContext.close();
    await brunoContext.close();
  });

  test("the alerts card offers push where the browser allows it", async ({ browser, testUsers, signIn }) => {
    const [ana] = await testUsers(1);
    if (!ana) throw new Error("test user not created");
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...inLocale("en-US") });
    // Headless Chromium always answers "denied"; pretend the person has not been asked yet.
    await context.addInitScript(() => Object.defineProperty(Notification, "permission", { get: () => "default" }));
    await signIn(context, ana);
    const page = await openAs(context, "/notifications");
    await expect(page.getByTestId("push-state")).toHaveAttribute("data-state", "off");
    await expect(page.getByRole("button", { name: "Turn on alerts" })).toBeVisible();
    await context.close();
  });

  test("blocked alerts are explained, and in-app alerts keep working", async ({ browser, testUsers, signIn }) => {
    const [ana] = await testUsers(1);
    if (!ana) throw new Error("test user not created");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...inLocale("es-MX") });
    await context.addInitScript(() => Object.defineProperty(Notification, "permission", { get: () => "denied" }));
    await signIn(context, ana);
    const page = await openAs(context, "/notifications");
    await expect(page.getByTestId("push-state")).toHaveAttribute("data-state", "denied");
    await expect(page.getByTestId("push-state")).toContainText("Bloqueaste los avisos");
    await expect(page.getByRole("button", { name: "Activar avisos" })).toHaveCount(0);
    await context.close();
  });
});
