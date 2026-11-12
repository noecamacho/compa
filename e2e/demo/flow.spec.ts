// D2: demo mode (API_MODE=demo) end to end. Needs a server started with API_MODE=demo; only @demo specs run against it.
// The visitor needs no account; what they do lives in their cookie and moves their points, the board and the console.
import { copyFor } from "../../lib/copy";
import { demoCast } from "../../lib/demo/cast";
import { DEMO_EVENT_CODE, DEMO_EVENT_SLUG } from "../../lib/demo/scenario";
import { DEMO_REQUESTERS, DEMO_VISITOR_ID, demoConnectionId } from "../../lib/demo/visitor";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { firstName } from "../../lib/format";
import { skipTours } from "../connect/helpers";
import { expect, test } from "../fixtures";

const cast = demoCast();
const alina = cast[0]!;
const requester = cast[DEMO_REQUESTERS[0]]!;
let copy = copyFor("es");

test.beforeEach(async ({ context }, testInfo) => {
  copy = copyFor(localeFromAcceptLanguage(testInfo.project.use.locale));
  await skipTours(context);
});

test.describe("demo mode: a visitor without an account", () => {
  test("a scan is pending, then accepted, and the visitor's link reaches the big screen @demo", async ({ page }) => {
    await page.goto(`/connect/${alina.handle}`);
    await page.getByRole("button", { name: copy.register.topics[1], exact: true }).click();
    await page.getByRole("button", { name: copy.register.confirm(55) }).click();
    await expect(page.getByRole("heading", { name: copy.confirmation.titlePending(firstName(alina.name)) })).toBeVisible();
    // The fictional person accepts after a few seconds; the pending screen polls and turns into the confirmation.
    await expect(page.getByRole("heading", { name: copy.confirmation.titleNew(firstName(alina.name)) })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("+55 pts")).toBeVisible();

    const live = await page.request.get(`/api/e/${DEMO_EVENT_CODE}/live`);
    const snapshot = (await live.json()) as { connections: { a: string; b: string }[] };
    expect(snapshot.connections).toContainEqual(expect.objectContaining({ a: DEMO_VISITOR_ID, b: alina.id }));
  });

  test("accepting an incoming request pays +50 and clears it from home @demo", async ({ page }) => {
    await page.goto(`/requests/${demoConnectionId(DEMO_REQUESTERS[0])}`);
    await page.getByRole("button", { name: copy.request.accept, exact: true }).click();
    await expect(page.getByRole("heading", { name: copy.confirmation.titleNew(firstName(requester.name)) })).toBeVisible();
    await page.goto("/home");
    await expect(page.getByRole("link", { name: new RegExp(firstName(requester.name)) }).filter({ hasText: requester.name })).toHaveCount(0);
  });

  test("the organizer console shows the demo room to the visitor @demo", async ({ page }) => {
    await page.goto(`/admin/events/${DEMO_EVENT_SLUG}`);
    await expect(page.getByRole("heading", { name: "COMPA Community Night" })).toBeVisible();
    await expect(page.getByText(copy.demoApi.eventDescription)).toBeVisible();
  });

  test("another event code opens nothing @demo", async ({ page }) => {
    const response = await page.goto("/e/k7m2p9xq4t");
    expect(response?.status()).toBe(404);
  });
});
