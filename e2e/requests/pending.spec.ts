// F-29, F-35, F-50: the requester's pending screen /connections/<id>/done flips once the other person accepts
// (PendingWatcher polls every 3 s), and PATCH /api/connections/{id}/knew with its documented errors.
import { confirmation, register } from "../../lib/copy/es";
import { firstName } from "../../lib/format";
import { expect, test } from "../fixtures";
import { accept, detailOf, expectError, sendRequest, skipTours } from "../connect/helpers";

test.describe("requests: pending screen and knew", () => {
  test("A's pending screen turns into the connection when B accepts, without a reload @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    await skipTours(ana.context);
    await ana.page.goto(`/connect/${bruno.user.handle}`);
    await ana.page.getByRole("button", { name: register.confirm(50) }).click();
    await expect(ana.page).toHaveURL(/\/done$/);
    const pending = ana.page.getByRole("heading", { name: confirmation.titlePending(firstName(bruno.user.name)) });
    await expect(pending).toBeVisible();
    await expect(ana.page.getByText(confirmation.pendingNote)).toBeVisible();
    const connectionId = ana.page.url().split("/").at(-2) ?? "";

    // A marker on window survives router.refresh() but not a reload.
    await ana.page.evaluate(() => Reflect.set(globalThis, "__compaNoReload", true));
    expect((await accept(bruno.page.request, connectionId)).status()).toBe(200);
    await expect(ana.page.getByRole("heading", { name: confirmation.titleNew(firstName(bruno.user.name)) })).toBeVisible({ timeout: 8_000 });
    await expect(ana.page.getByText(confirmation.points(50))).toBeVisible();
    await expect(ana.page.getByText(confirmation.keepTalking)).toBeVisible();
    expect(await ana.page.evaluate(() => Reflect.get(globalThis, "__compaNoReload"))).toBe(true);
    await expect(ana.page).toHaveURL(new RegExp(`/connections/${connectionId}/done$`));
  });

  test("A ticks knew while pending: B's accept makes it a reconnection @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    const { body: sent } = await sendRequest(ana.page.request, bruno.user.handle);
    const knew = await ana.page.request.patch(`/api/connections/${sent.connectionId}/knew`, { data: { knew: true } });
    expect(knew.status()).toBe(200);
    expect(await knew.json()).toEqual({ connectionId: sent.connectionId, knew: true });
    expect(await (await accept(bruno.page.request, sent.connectionId)).json()).toMatchObject({ kind: "reconnection", points: 20 });
    expect(await detailOf(ana.page.request, sent.connectionId)).toMatchObject({ kind: "reconnection", status: "accepted" });
    await expectError(await ana.page.request.patch(`/api/connections/${sent.connectionId}/knew`, { data: { knew: false } }), 409, "not_pending");
  });

  test("knew: only the requester, only members, only a valid body @real", async ({ twoUsers, testUsers, signIn, browser, baseURL }) => {
    const [ana, bruno] = twoUsers;
    const { body: sent } = await sendRequest(ana.page.request, bruno.user.handle);
    const path = `/api/connections/${sent.connectionId}/knew`;
    await expectError(await bruno.page.request.patch(path, { data: { knew: true } }), 403, "forbidden");
    await expectError(await ana.page.request.patch(path, { data: { knew: "yes" } }), 400, "invalid_input");
    await expectError(await ana.page.request.patch(path, { data: {} }), 400, "invalid_input");
    await expectError(await ana.page.request.patch("/api/connections/00000000-0000-4000-8000-000000000000/knew", { data: { knew: true } }), 404, "connection_not_found");

    const [stranger] = await testUsers(1);
    if (!stranger) throw new Error("test user not created");
    const context = await browser.newContext({ baseURL });
    await signIn(context, stranger);
    await expectError(await context.request.patch(path, { data: { knew: true } }), 404, "connection_not_found");
    await context.close();
    const anonymous = await browser.newContext({ baseURL });
    await expectError(await anonymous.request.patch(path, { data: { knew: true } }), 401, "unauthorized");
    await anonymous.close();
  });
});
