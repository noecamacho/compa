// Connections outside an event (wiki/points-rules.md): scanning someone who is at no running event creates a request
// with `event: null`. Same pending → accept flow and notifications, no points, no ranking, not on any live board.
import type { Browser, BrowserContext, BrowserContextOptions, Page } from "@playwright/test";
import type { TestUserT } from "../../lib/api/admin-schemas";
import { LiveRecent } from "../../lib/api/schemas";
import type { RealModeClient } from "../../lib/testing/real-mode";
import { expect, test } from "../fixtures";
import { AdminEvents, accept, copyOf, detailOf, expectError, json, listOf, notificationsOf, sendRequest, skipTours } from "./helpers";

type Outsider = { user: TestUserT; context: BrowserContext; page: Page };
// The project's device settings, as the twoUsers fixture passes them.
type ContextOptions = Pick<BrowserContextOptions, "baseURL" | "locale" | "viewport" | "isMobile" | "hasTouch" | "extraHTTPHeaders">;

// Fresh test users checked in nowhere, each signed in in its own context; deleted afterwards (cascades their rows).
async function outsiders(
  count: number,
  { browser, realMode, signIn, ...options }: { browser: Browser; realMode: RealModeClient; signIn: (context: BrowserContext, user: TestUserT) => Promise<unknown> } & ContextOptions,
): Promise<{ people: Outsider[]; cleanup: () => Promise<void> }> {
  const users = await realMode.createTestUsers({ count });
  const people: Outsider[] = [];
  for (const user of users) {
    const context = await browser.newContext(options);
    await skipTours(context);
    await signIn(context, user);
    people.push({ user, context, page: await context.newPage() });
  }
  const cleanup = async () => {
    for (const person of people) await person.context.close();
    for (const user of users) await realMode.deleteTestUser(user.id).catch(() => undefined);
  };
  return { people, cleanup };
}

test.describe("connect: outside an event @real", () => {
  test("neither at an event: labelled scan, accept, no points, in the list @real", async ({ browser, realMode, signIn, baseURL, locale, viewport, isMobile, hasTouch, extraHTTPHeaders }, testInfo) => {
    const copy = copyOf(testInfo);
    const { people, cleanup } = await outsiders(2, { browser, realMode, signIn, baseURL, locale, viewport, isMobile, hasTouch, extraHTTPHeaders });
    const [ana, bruno] = people;
    if (!ana || !bruno) throw new Error("test users not created");
    try {
      // Before sending: the register screen says there are no points.
      await ana.page.goto(`/connect/${bruno.user.handle}`);
      await expect(ana.page.getByText(copy.common.outsideEvent, { exact: true }).first()).toBeVisible();
      await expect(ana.page.getByText(copy.register.outsideEventNotice, { exact: true }).first()).toBeVisible();
      await ana.page.getByRole("button", { name: copy.register.confirmOutsideEvent }).click();
      await expect(ana.page).toHaveURL(/\/connections\/[0-9a-f-]+\/done$/);
      await expect(ana.page.getByText(copy.common.outsideEvent, { exact: true }).first()).toBeVisible();
      const connectionId = ana.page.url().split("/").at(-2) ?? "";
      expect((await detailOf(ana.page.request, connectionId)).event).toBeNull();

      // The scanned person hears about it like any request, labelled outside an event.
      const notifications = await notificationsOf(bruno.page.request);
      expect(notifications.notifications).toContainEqual(expect.objectContaining({ kind: "request", connectionId, eventName: null }));
      await bruno.page.goto("/home");
      await expect(bruno.page.getByText(copy.common.outsideEventShort, { exact: true }).first()).toBeVisible();
      await bruno.page.goto(`/requests/${connectionId}`);
      await expect(bruno.page.getByText(copy.request.bothWinOutsideEvent, { exact: true }).first()).toBeVisible();
      await bruno.page.getByRole("button", { name: copy.request.accept }).click();
      await expect(bruno.page).toHaveURL(new RegExp(`/connections/${connectionId}/done$`));

      // Accepted with its kind, but zero points everywhere.
      const detail = await detailOf(ana.page.request, connectionId);
      expect(detail).toMatchObject({ status: "accepted", event: null, points: { kind: 0, topics: 0, note: 0, total: 0 } });
      const list = await listOf(ana.page.request);
      expect(list.totals).toMatchObject({ points: 0, connections: 1, people: 1 });
      expect(list.people.map((entry) => entry.person.id)).toContain(bruno.user.id);
      await ana.page.goto("/connections");
      await expect(ana.page.getByRole("link", { name: new RegExp(bruno.user.name) })).toContainText(copy.common.outsideEventShort);
    } finally {
      await cleanup();
    }
  });

  test("a repeat or reverse scan returns the same request; a double accept pays once (zero) @real", async ({ browser, realMode, signIn, baseURL, locale, viewport, isMobile, hasTouch, extraHTTPHeaders }) => {
    const { people, cleanup } = await outsiders(2, { browser, realMode, signIn, baseURL, locale, viewport, isMobile, hasTouch, extraHTTPHeaders });
    const [ana, bruno] = people;
    if (!ana || !bruno) throw new Error("test users not created");
    try {
      const first = await sendRequest(ana.page.request, bruno.user.handle, { topics: ["IA"] });
      expect(first).toMatchObject({ status: 201, body: { event: null, status: "pending" } });
      const again = await sendRequest(ana.page.request, bruno.user.handle);
      expect(again).toMatchObject({ status: 200, body: { connectionId: first.body.connectionId } });
      const reverse = await sendRequest(bruno.page.request, ana.user.handle);
      expect(reverse).toMatchObject({ status: 200, body: { connectionId: first.body.connectionId } });

      const answers = await Promise.all([accept(bruno.page.request, first.body.connectionId), accept(bruno.page.request, first.body.connectionId)]);
      expect(answers.map((answer) => answer.status()).sort()).toEqual([200, 409]);
      const won = answers.find((answer) => answer.status() === 200);
      expect(await won?.json()).toMatchObject({ kind: "new", points: 0 });
      // The topics marked while registering pay nothing outside an event either.
      expect((await listOf(ana.page.request)).totals.points).toBe(0);
      expect((await listOf(bruno.page.request)).totals.points).toBe(0);
    } finally {
      await cleanup();
    }
  });

  test("only the scanner is at an event: the scanned person's context wins, so no event, no points, not on its live board @real", async ({ browser, realMode, signIn, baseURL, locale, viewport, isMobile, hasTouch, extraHTTPHeaders, testEvent }) => {
    const { people, cleanup } = await outsiders(2, { browser, realMode, signIn, baseURL, locale, viewport, isMobile, hasTouch, extraHTTPHeaders });
    const [ana, bruno] = people;
    if (!ana || !bruno) throw new Error("test users not created");
    try {
      const joined = await ana.page.request.post(`/api/e/${testEvent.accessCode}/check-in`, { data: { screenConsent: true } });
      expect(joined.ok()).toBe(true);
      const { body } = await sendRequest(ana.page.request, bruno.user.handle);
      expect(body.event).toBeNull();
      expect(await (await accept(bruno.page.request, body.connectionId)).json()).toMatchObject({ points: 0 });
      // The scanner's event board never sees it.
      const recent = await json(await ana.page.request.get(`/api/e/${testEvent.accessCode}/live/recent`), LiveRecent);
      expect(recent.pairs.map((pair) => pair.id)).not.toContain(body.connectionId);
      // The other way round, the scanner joins the scanned person's event and it scores as before.
      const back = await sendRequest(bruno.page.request, ana.user.handle);
      expect(back.body.event?.slug).toBe(testEvent.slug);
    } finally {
      await cleanup();
    }
  });

  test("accepted after checking in to an event it still pays nothing; meeting at an event later is a +20 reconnection @real", async ({ browser, realMode, signIn, baseURL, locale, viewport, isMobile, hasTouch, extraHTTPHeaders }) => {
    const { people, cleanup } = await outsiders(2, { browser, realMode, signIn, baseURL, locale, viewport, isMobile, hasTouch, extraHTTPHeaders });
    const [ana, bruno] = people;
    if (!ana || !bruno) throw new Error("test users not created");
    const admin = await AdminEvents.signIn(realMode, baseURL ?? "");
    try {
      const outside = await sendRequest(ana.page.request, bruno.user.handle);
      expect(outside.body.event).toBeNull();
      const event = await admin.create([ana.user, bruno.user]);
      expect(await (await accept(bruno.page.request, outside.body.connectionId)).json()).toMatchObject({ kind: "new", points: 0 });
      expect((await detailOf(ana.page.request, outside.body.connectionId)).event).toBeNull();

      const atEvent = await sendRequest(ana.page.request, bruno.user.handle);
      expect(atEvent).toMatchObject({ status: 201, body: { event: { slug: event.slug } } });
      expect(atEvent.body.connectionId).not.toBe(outside.body.connectionId);
      expect(await (await accept(bruno.page.request, atEvent.body.connectionId)).json()).toMatchObject({ kind: "reconnection", points: 20 });
      expect((await listOf(ana.page.request)).totals).toMatchObject({ points: 20, connections: 2, people: 1 });
    } finally {
      await admin.archiveAll();
      await cleanup();
    }
  });

  test("an erased person takes the connection with them; a self-scan still fails @real", async ({ browser, realMode, signIn, baseURL, locale, viewport, isMobile, hasTouch, extraHTTPHeaders }) => {
    const { people, cleanup } = await outsiders(2, { browser, realMode, signIn, baseURL, locale, viewport, isMobile, hasTouch, extraHTTPHeaders });
    const [ana, bruno] = people;
    if (!ana || !bruno) throw new Error("test users not created");
    try {
      await expectError(await ana.page.request.post("/api/connections", { data: { toHandle: ana.user.handle } }), 409, "self_connection");
      const { body } = await sendRequest(ana.page.request, bruno.user.handle);
      expect((await accept(bruno.page.request, body.connectionId)).status()).toBe(200);
      await realMode.deleteTestUser(bruno.user.id);
      const list = await listOf(ana.page.request);
      expect(list.people).toHaveLength(0);
      expect((await ana.page.request.get(`/api/connections/${body.connectionId}`)).status()).toBe(404);
    } finally {
      await cleanup();
    }
  });
});
