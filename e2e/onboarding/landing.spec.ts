// F-01, F-02: the landing at compa.lol for visitors, signed-in people (with and without a current event) and stale
// sessions; sign-in error copy; meta and link-preview tags. Mock mode signs everyone in as Diego (lib/api/examples.ts).
import type { Page } from "@playwright/test";
import { copyOf, expect, test } from "./helpers";

const SIGN_UP = /crear cuenta|sign ?up|create account|registr/i;

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectVisitorLanding(page: Page, copy: ReturnType<typeof copyOf>["landing"]): Promise<void> {
  const signIn = page.getByRole("link", { name: copy.signIn });
  await expect(signIn).toBeVisible();
  await expect(signIn).toHaveAttribute("href", "/auth/linkedin?next=/home");
  await expect(page.getByText(copy.signInNote)).toBeVisible();
  await expect(page.getByRole("link", { name: copy.backToEvent })).toHaveCount(0);
  await expect(page.getByRole("link", { name: copy.goToAccount })).toHaveCount(0);
}

test.describe("landing", () => {
  test("renders the promise, the event-QR hint and no sign-up button @mock @real", async ({ page }, testInfo) => {
    const copy = copyOf(testInfo).landing;
    await page.goto("/");
    const heading = page.getByRole("heading", { level: 1 });
    for (const line of copy.title) await expect(heading).toContainText(line);
    await expect(page.getByText(copy.lead)).toBeVisible();
    await expect(page.getByText(copy.doorTitle)).toBeVisible();
    await expect(page.getByText(copy.doorHint)).toBeVisible();
    await expect(page.getByRole("img", { name: copy.sceneLabel })).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("lang", testInfo.project.use.locale?.slice(0, 2) ?? "");
    await expect(page.getByRole("link", { name: SIGN_UP })).toHaveCount(0);
    await expect(page.getByRole("button", { name: SIGN_UP })).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expectNoHorizontalScroll(page);
  });

  test("carries the title, description and link-preview tags", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Compa");
    const meta = (selector: string) => page.locator(`meta[${selector}]`).first();
    await expect(meta('name="description"')).toHaveAttribute("content", /\S/);
    await expect(meta('property="og:title"')).toHaveAttribute("content", "Compa");
    await expect(meta('property="og:description"')).toHaveAttribute("content", /\S/);
    await expect(meta('property="og:image"')).toHaveAttribute("content", /^https:\/\/compa\.lol\/opengraph-image/);
    await expect(meta('property="og:url"')).toHaveAttribute("content", /^https:\/\/compa\.lol\/?$/);
    await expect(meta('name="twitter:card"')).toHaveAttribute("content", "summary_large_image");
    await expect(meta('name="viewport"')).toHaveAttribute("content", /width=device-width/);
  });

  for (const error of ["signin", "linkedin"]) {
    test(`?error=${error} shows the sign-in error @mock @real`, async ({ page }, testInfo) => {
      const copy = copyOf(testInfo).landing;
      await page.goto(`/?error=${error}`);
      await expect(page.getByRole("alert")).toHaveText(copy.signInError);
    });
  }

  test("an unknown ?error value shows no error @mock @real", async ({ page }) => {
    await page.goto("/?error=%3Cscript%3Ex%3C%2Fscript%3E");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});

test.describe("landing signed in (mock)", () => {
  test("someone at an event goes back to it through Home @mock", async ({ page }, testInfo) => {
    const copy = copyOf(testInfo).landing;
    await page.goto("/");
    const back = page.getByRole("link", { name: copy.backToEvent });
    await expect(back).toBeVisible();
    await expect(page.getByRole("link", { name: copy.signIn })).toHaveCount(0);
    await back.click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("a stale session (/api/me 401) sees the visitor landing @mock", async ({ page, mock }, testInfo) => {
    await mock.mockServerError("unauthorized");
    await page.goto("/");
    await expectVisitorLanding(page, copyOf(testInfo).landing);
  });
});

test.describe("landing signed in (real)", () => {
  test("a visitor gets the LinkedIn button @real", async ({ page }, testInfo) => {
    await page.goto("/");
    await expectVisitorLanding(page, copyOf(testInfo).landing);
  });

  test("someone checked in goes back to the event @real", async ({ page, realUser }, testInfo) => {
    expect(realUser.user.currentEvent).not.toBeNull();
    const copy = copyOf(testInfo).landing;
    await page.goto("/");
    const back = page.getByRole("link", { name: copy.backToEvent });
    await expect(back).toBeVisible();
    await expect(page.getByRole("link", { name: copy.signIn })).toHaveCount(0);
    await back.click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("someone outside any event goes to their account @real", async ({ page, context, outsider, signIn }, testInfo) => {
    await signIn(context, outsider);
    const copy = copyOf(testInfo).landing;
    await page.goto("/");
    const account = page.getByRole("link", { name: copy.goToAccount });
    await expect(account).toBeVisible();
    await expect(page.getByRole("link", { name: copy.backToEvent })).toHaveCount(0);
    await account.click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("a garbage session cookie is treated as signed out @real", async ({ page, context, baseURL }, testInfo) => {
    const url = baseURL ?? "http://localhost:3000";
    await context.addCookies([{ name: "sb-127-auth-token", value: "base64-bm90LWEtc2Vzc2lvbg", url }]);
    await page.goto("/");
    await expectVisitorLanding(page, copyOf(testInfo).landing);
  });
});
