// F-30 and F-69: the addressee learns about a request on Home without reloading (polling every 3 s): the incoming
// card and the bell count. The full two-user run: A scans B, B accepts from Home, both see +50 and the notices.
import type { Page } from "@playwright/test";
import { ids, paola } from "../../lib/api/examples";
import { confirmation, register, request, tour } from "../../lib/copy/es";
import { firstName } from "../../lib/format";
import { expect, test } from "../fixtures";
import { copyOf, notificationsOf, skipTours } from "../connect/helpers";

const incomingCard = (page: Page, name: string) => page.getByRole("link", { name: new RegExp(tour.incoming.title(firstName(name))) });

test.describe("requests: incoming on Home", () => {
  test("a pending request shows as a card that opens the request @mock", async ({ page }) => {
    await skipTours(page.context());
    await page.goto("/home");
    const card = incomingCard(page, paola.name);
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("href", `/requests/${ids.connection3}`);
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/requests/${ids.connection3}$`));
  });

  test("A scans B; B's Home shows the card and the bell without a reload; B accepts; both get +50 @real", async ({ twoUsers }, testInfo) => {
    const [ana, bruno] = twoUsers;
    const copy = copyOf(testInfo).notifications;
    await skipTours(ana.context);
    await skipTours(bruno.context);
    await bruno.page.goto("/home");
    await expect(bruno.page.getByRole("link", { name: copy.bellLabel(0), exact: true })).toBeVisible();
    await expect(incomingCard(bruno.page, ana.user.name)).toHaveCount(0);

    await ana.page.goto(`/connect/${bruno.user.handle}`);
    await ana.page.getByRole("button", { name: register.confirm(50) }).click();
    await expect(ana.page.getByRole("heading", { name: confirmation.titlePending(firstName(bruno.user.name)) })).toBeVisible();
    const connectionId = ana.page.url().split("/").at(-2) ?? "";

    // A marker on window survives polling updates but not a reload.
    await bruno.page.evaluate(() => Reflect.set(globalThis, "__compaNoReload", true));
    await expect(incomingCard(bruno.page, ana.user.name)).toBeVisible({ timeout: 8_000 });
    await expect(bruno.page.getByRole("link", { name: copy.bellLabel(1), exact: true })).toBeVisible({ timeout: 8_000 });
    expect(await bruno.page.evaluate(() => Reflect.get(globalThis, "__compaNoReload"))).toBe(true);

    await incomingCard(bruno.page, ana.user.name).click();
    await expect(bruno.page).toHaveURL(new RegExp(`/requests/${connectionId}$`));
    await bruno.page.getByRole("button", { name: request.accept }).click();
    await expect(bruno.page.getByRole("heading", { name: confirmation.titleNew(firstName(ana.user.name)) })).toBeVisible();
    await expect(bruno.page.getByText(confirmation.points(50))).toBeVisible();
    await expect(ana.page.getByRole("heading", { name: confirmation.titleNew(firstName(bruno.user.name)) })).toBeVisible({ timeout: 8_000 });
    await expect(ana.page.getByText(confirmation.points(50))).toBeVisible();

    const anaNotices = await notificationsOf(ana.page.request);
    expect(anaNotices.notifications.find((item) => item.kind === "accepted")).toMatchObject({ connectionId, unseen: true });
    const brunoNotices = await notificationsOf(bruno.page.request);
    expect(brunoNotices.notifications.filter((item) => item.kind === "request")).toEqual([]);
    await bruno.page.goto("/home");
    await expect(incomingCard(bruno.page, ana.user.name)).toHaveCount(0);
  });
});
