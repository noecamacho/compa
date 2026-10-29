// F-23, F-26, F-31, F-32, F-36: the request screen /requests/<id>, POST accept and decline with their documented
// errors, points to both people, a silent decline, an ended event and the reconnection kind.
import type { Page } from "@playwright/test";
import { diego, ids } from "../../lib/api/examples";
import { E } from "../../lib/api/errors";
import { common, confirmation, networks, request } from "../../lib/copy/es";
import { firstName } from "../../lib/format";
import { errorCopy, expect, test } from "../fixtures";
import { AdminEvents, accept, detailOf, expectError, expectNotFound, listOf, notificationsOf, sendRequest, skipTours } from "../connect/helpers";

const INCOMING = ids.connection3;
const acceptButton = (page: Page) => page.getByRole("button", { name: request.accept });
const declineButton = (page: Page) => page.getByRole("button", { name: common.notNow });
const alert = (page: Page) => page.getByRole("alert").filter({ hasText: /\S/ });

test.describe("requests: accept and decline (mock)", () => {
  test("the request screen shows who asked and both answers @mock", async ({ page }) => {
    await page.goto(`/requests/${INCOMING}`);
    await expect(page.getByRole("heading", { level: 1, name: request.title(firstName(diego.name)) })).toBeVisible();
    await expect(page.getByText(request.badge)).toBeVisible();
    await expect(page.getByText(request.bothWin)).toBeVisible();
    await expect(page.getByText(request.interestsLabel)).toBeVisible();
    await expect(acceptButton(page)).toBeEnabled();
    await expect(declineButton(page)).toBeEnabled();
    await page.getByRole("link", { name: common.close }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("Aceptar posts accept and opens the done page @mock", async ({ page }) => {
    await page.goto(`/requests/${INCOMING}`);
    const accepted = page.waitForResponse((response) => response.url().endsWith(`/api/connections/${INCOMING}/accept`));
    await acceptButton(page).click();
    expect((await accepted).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/connections/${INCOMING}/done$`));
  });

  test("Ahora no declines silently and goes home @mock", async ({ page }) => {
    await page.goto(`/requests/${INCOMING}`);
    const declined = page.waitForResponse((response) => response.url().endsWith(`/api/connections/${INCOMING}/decline`));
    await declineButton(page).click();
    expect((await declined).status()).toBe(204);
    await expect(page).toHaveURL(/\/home$/);
  });

  test("a failed decline stays with the reason so it can be retried @mock", async ({ page, mock }) => {
    await mock.mockError("event_ended", "**/api/connections/*/decline");
    await page.goto(`/requests/${INCOMING}`);
    await declineButton(page).click();
    await expect(alert(page)).toHaveText(errorCopy(E.eventEnded));
    await expect(declineButton(page)).toBeEnabled();
    await expect(page).toHaveURL(new RegExp(`/requests/${INCOMING}$`));
  });

  test("declining an already answered request goes home @mock", async ({ page, mock }) => {
    await mock.mockError("not_pending", "**/api/connections/*/decline");
    await page.goto(`/requests/${INCOMING}`);
    await declineButton(page).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  for (const error of [E.notPending, E.eventEnded, E.forbidden, E.connectionNotFound, E.unauthorized]) {
    test(`${error.code} on accept shows an alert and keeps both answers @mock`, async ({ page, mock }) => {
      await mock.mockError(error.code, "**/api/connections/*/accept");
      await page.goto(`/requests/${INCOMING}`);
      await acceptButton(page).click();
      await expect(alert(page)).toHaveText(errorCopy(error));
      await expect(acceptButton(page)).toBeEnabled();
      await expect(declineButton(page)).toBeEnabled();
      await expect(page).toHaveURL(new RegExp(`/requests/${INCOMING}$`));
    });
  }

  test("while accepting both buttons are disabled and a double click posts once @mock", async ({ page }) => {
    await page.goto(`/requests/${INCOMING}`);
    let posts = 0;
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/api/connections/*/accept", async (route) => {
      posts += 1;
      await held;
      await route.fallback();
    });
    await acceptButton(page).dblclick();
    await expect(page.getByRole("button", { name: request.accepting })).toBeDisabled();
    await expect(declineButton(page)).toBeDisabled();
    release();
    await expect(page).toHaveURL(/\/done$/);
    expect(posts).toBe(1);
  });

  test("the done page shows the points, the breakdown, the note and the networks @mock", async ({ page }) => {
    await skipTours(page.context());
    await page.goto(`/connections/${ids.connection}/done`);
    await expect(page.getByRole("heading", { name: confirmation.titleReconnection("Valeria") })).toBeVisible();
    await expect(page.getByText(confirmation.points(35))).toBeVisible();
    await expect(page.getByText([confirmation.breakdownKind("reconnection", 20), confirmation.breakdownNote(15)].join(" · "))).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(confirmation.talkedAbout) })).toHaveAttribute("href", `/connections/${ids.connection}/note`);
    await expect(page.getByText(confirmation.keepTalking)).toBeVisible();
    await expect(page.getByRole("link", { name: confirmation.linkLabel(networks.linkedin, "Valeria") })).toBeVisible();
    await page.getByRole("link", { name: common.done }).click();
    await expect(page).toHaveURL(/\/home$/);
  });
});

test.describe("requests: accept and decline (real)", () => {
  test("B accepts A's request: both get +50 new, the networks unlock and A is told @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    const { body: sent } = await sendRequest(ana.page.request, bruno.user.handle);
    await bruno.page.goto(`/requests/${sent.connectionId}`);
    await expect(bruno.page.getByRole("heading", { level: 1, name: request.title(firstName(ana.user.name)) })).toBeVisible();
    await acceptButton(bruno.page).click();
    await expect(bruno.page).toHaveURL(new RegExp(`/connections/${sent.connectionId}/done$`));
    await expect(bruno.page.getByRole("heading", { name: confirmation.titleNew(firstName(ana.user.name)) })).toBeVisible();
    await expect(bruno.page.getByText(confirmation.points(50))).toBeVisible();
    await expect(bruno.page.getByText(confirmation.keepTalking)).toBeVisible();

    await ana.page.goto(`/connections/${sent.connectionId}/done`);
    await expect(ana.page.getByRole("heading", { name: confirmation.titleNew(firstName(bruno.user.name)) })).toBeVisible();
    await expect(ana.page.getByText(confirmation.points(50))).toBeVisible();

    for (const side of [ana, bruno]) {
      const detail = await detailOf(side.page.request, sent.connectionId);
      expect(detail).toMatchObject({ status: "accepted", kind: "new", points: { kind: 50, total: 50 } });
      expect((await listOf(side.page.request)).totals).toMatchObject({ points: 50, connections: 1, people: 1 });
    }
    const notices = await notificationsOf(ana.page.request);
    expect(notices.notifications.filter((item) => item.kind === "accepted").map((item) => item.person.id)).toEqual([bruno.user.id]);
    // Answered: the request screen now is the done screen, and a second answer is refused.
    await bruno.page.goto(`/requests/${sent.connectionId}`);
    await expect(bruno.page).toHaveURL(new RegExp(`/connections/${sent.connectionId}/done$`));
    await expectError(await accept(bruno.page.request, sent.connectionId), 409, "not_pending");
    await expectError(await bruno.page.request.post(`/api/connections/${sent.connectionId}/decline`), 409, "not_pending");
  });

  test("a double accept awards the points once @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    const { body: sent } = await sendRequest(ana.page.request, bruno.user.handle);
    const answers = await Promise.all([accept(bruno.page.request, sent.connectionId), accept(bruno.page.request, sent.connectionId)]);
    expect(answers.map((answer) => answer.status()).sort()).toEqual([200, 409]);
    expect((await listOf(bruno.page.request)).totals.points).toBe(50);
    expect((await listOf(ana.page.request)).totals.points).toBe(50);
  });

  test("the requester opening the request gets the pending screen, never the answers @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    const { body: sent } = await sendRequest(ana.page.request, bruno.user.handle);
    await ana.page.goto(`/requests/${sent.connectionId}`);
    await expect(ana.page).toHaveURL(new RegExp(`/connections/${sent.connectionId}/done$`));
    await expect(ana.page.getByRole("heading", { name: confirmation.titlePending(firstName(bruno.user.name)) })).toBeVisible();
    await expect(acceptButton(ana.page)).toHaveCount(0);
    await expectError(await accept(ana.page.request, sent.connectionId), 403, "forbidden");
    await expectError(await ana.page.request.post(`/api/connections/${sent.connectionId}/decline`), 403, "forbidden");
  });

  test("B declines: B goes home, A still sees pending, nobody is told @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    const { body: sent } = await sendRequest(ana.page.request, bruno.user.handle);
    await bruno.page.goto(`/requests/${sent.connectionId}`);
    await declineButton(bruno.page).click();
    await expect(bruno.page).toHaveURL(/\/home$/);

    expect((await detailOf(bruno.page.request, sent.connectionId)).status).toBe("declined");
    expect((await detailOf(ana.page.request, sent.connectionId)).status).toBe("pending");
    expect((await listOf(bruno.page.request)).incoming).toEqual([]);
    await ana.page.goto(`/connections/${sent.connectionId}/done`);
    await expect(ana.page.getByRole("heading", { name: confirmation.titlePending(firstName(bruno.user.name)) })).toBeVisible();
    const kinds = (await notificationsOf(ana.page.request)).notifications.map((item) => item.kind);
    expect(kinds).not.toContain("accepted");
    // The pair cannot be re-asked at this event: a repeat scan returns the same row, still pending for A.
    const again = await sendRequest(ana.page.request, bruno.user.handle);
    expect(again).toMatchObject({ status: 200, body: { connectionId: sent.connectionId, status: "pending" } });
    await expectError(await accept(bruno.page.request, sent.connectionId), 409, "not_pending");
    // Declined requests are no longer answerable, so the screen shows no buttons.
    await bruno.page.goto(`/requests/${sent.connectionId}`);
    await expect(bruno.page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(acceptButton(bruno.page)).toHaveCount(0);
  });

  test("a stranger or an unknown id gets 404; a bad id 400 @real", async ({ twoUsers, testUsers, signIn, browser, baseURL }) => {
    const [ana, bruno] = twoUsers;
    const { body: sent } = await sendRequest(ana.page.request, bruno.user.handle);
    const [stranger] = await testUsers(1);
    if (!stranger) throw new Error("test user not created");
    const context = await browser.newContext({ baseURL });
    await signIn(context, stranger);
    await expectError(await context.request.get(`/api/connections/${sent.connectionId}`), 404, "connection_not_found");
    await expectError(await accept(context.request, sent.connectionId), 404, "connection_not_found");
    await expectError(await context.request.post(`/api/connections/${sent.connectionId}/decline`), 404, "connection_not_found");
    const strangerPage = await context.newPage();
    await strangerPage.goto(`/requests/${sent.connectionId}`);
    await expectNotFound(strangerPage);
    await strangerPage.goto(`/connections/${sent.connectionId}/done`);
    await expectNotFound(strangerPage);
    const unknown = "00000000-0000-4000-8000-000000000000";
    await expectError(await accept(context.request, unknown), 404, "connection_not_found");
    await expectError(await context.request.get("/api/connections/not-a-uuid"), 400, "invalid_input");
    await expectError(await accept(context.request, "not-a-uuid"), 400, "invalid_input");
    await context.close();

    const anonymous = await browser.newContext({ baseURL });
    await expectError(await accept(anonymous.request, sent.connectionId), 401, "unauthorized");
    await expectError(await anonymous.request.get(`/api/connections/${sent.connectionId}`), 401, "unauthorized");
    await anonymous.close();
  });

  test("A picks Reencuentro: B accepts and both get +20 reconnection @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    await skipTours(ana.context);
    await ana.page.goto(`/connect/${bruno.user.handle}`);
    await ana.page.getByRole("button", { name: /Reencuentro/ }).click();
    await ana.page.getByRole("button", { name: /^Confirmar · \+20 pts$/ }).click();
    await expect(ana.page).toHaveURL(/\/done$/);
    const connectionId = ana.page.url().split("/").at(-2) ?? "";
    const answer = await accept(bruno.page.request, connectionId);
    expect(answer.status()).toBe(200);
    expect(await answer.json()).toMatchObject({ kind: "reconnection", points: 20 });
    await bruno.page.goto(`/connections/${connectionId}/done`);
    await expect(bruno.page.getByRole("heading", { name: confirmation.titleReconnection(firstName(ana.user.name)) })).toBeVisible();
    await expect(bruno.page.getByText(confirmation.points(20))).toBeVisible();
  });

  test("B accepting with knew makes it a reconnection @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    const { body: sent } = await sendRequest(ana.page.request, bruno.user.handle);
    const answer = await accept(bruno.page.request, sent.connectionId, true);
    expect(await answer.json()).toMatchObject({ kind: "reconnection", points: 20 });
    expect((await detailOf(ana.page.request, sent.connectionId)).points.kind).toBe(20);
  });

  test("the pair met at an earlier event: the new connection is a +20 reconnection @real", async ({ twoUsers, realMode, baseURL, testEvent }) => {
    const [ana, bruno] = twoUsers;
    const admin = await AdminEvents.signIn(realMode, baseURL ?? "");
    try {
      // The earlier event must have started before the test event (metAtEarlierEvent compares startsAt).
      const hoursSinceTestStart = (Date.now() - Date.parse(await admin.startsAt(testEvent.slug))) / 3_600_000;
      const earlier = await admin.create([ana.user, bruno.user], Math.ceil(hoursSinceTestStart) + 24);
      const first = await sendRequest(ana.page.request, bruno.user.handle);
      expect(first.body.event?.slug).toBe(earlier.slug);
      expect(await (await accept(bruno.page.request, first.body.connectionId)).json()).toMatchObject({ kind: "new", points: 50 });
      await admin.end(earlier.slug);

      const second = await sendRequest(ana.page.request, bruno.user.handle);
      expect(second.body.event?.slug).toBe(testEvent.slug);
      expect(second.status).toBe(201);
      expect(await (await accept(bruno.page.request, second.body.connectionId)).json()).toMatchObject({ kind: "reconnection", points: 20 });
      expect((await listOf(ana.page.request)).totals).toMatchObject({ points: 70, connections: 2, people: 1 });
    } finally {
      await admin.archiveAll();
    }
  });

  test("after the event ends, accept and decline answer event_ended and the request reads expired @real", async ({ twoUsers, realMode, baseURL }) => {
    const [ana, bruno] = twoUsers;
    const admin = await AdminEvents.signIn(realMode, baseURL ?? "");
    try {
      const event = await admin.create([ana.user, bruno.user]);
      const { body: sent } = await sendRequest(ana.page.request, bruno.user.handle);
      expect(sent.event?.slug).toBe(event.slug);
      await bruno.page.goto(`/requests/${sent.connectionId}`);
      await expect(acceptButton(bruno.page)).toBeVisible();
      await admin.end(event.slug);

      await acceptButton(bruno.page).click();
      await expect(alert(bruno.page)).toHaveText(errorCopy(E.eventEnded));
      await expectError(await bruno.page.request.post(`/api/connections/${sent.connectionId}/decline`), 409, "event_ended");
      await expectError(await ana.page.request.patch(`/api/connections/${sent.connectionId}/knew`, { data: { knew: true } }), 409, "not_pending");
      expect((await detailOf(ana.page.request, sent.connectionId)).status).toBe("expired");
      expect((await listOf(bruno.page.request)).incoming).toEqual([]);
      expect((await notificationsOf(bruno.page.request)).notifications.filter((item) => item.kind === "request")).toEqual([]);
    } finally {
      await admin.archiveAll();
    }
  });
});
