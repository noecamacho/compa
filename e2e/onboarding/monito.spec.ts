// F-08: 02b Monito at /onboarding/monito: every option row, random, photo vs monito, save (PATCH /api/me) to `next`,
// ?from=me, save errors and persistence. This screen is Spanish only (lib/copy/index.ts).
import type { Locator, Page, Request } from "@playwright/test";
import { Me } from "../../lib/api/schemas";
import { common, monito as copy } from "../../lib/copy/es";
import { MonitoLook } from "../../lib/monito/look";
import { expect, test, waitForHydration } from "./helpers";

const isMePatch = (request: Request) => request.method() === "PATCH" && new URL(request.url()).pathname === "/api/me";

const row = (page: Page, label: string) => page.getByRole("group", { name: label, exact: true });
const option = (page: Page, rowLabel: string, name: string) => row(page, rowLabel).getByRole("radio", { name, exact: true });
const extra = (page: Page, name: string) => row(page, copy.extras).getByRole("button", { name, exact: true });
const photoChoice = (page: Page) => page.getByRole("radio", { name: new RegExp(copy.usePhoto) });
const monitoChoice = (page: Page) => page.getByRole("radio", { name: new RegExp(copy.createMonito) });
const saveButton = (page: Page) => page.getByRole("button", { name: copy.done });

async function openMonito(page: Page, query = ""): Promise<void> {
  await page.goto(`/onboarding/monito${query}`);
  await expect(saveButton(page)).toBeVisible();
  await waitForHydration(page, "main button");
}

const pressed = async (chip: Locator): Promise<boolean> => (await chip.getAttribute("aria-pressed")) === "true";

// A fixed look picked option by option; returns what the PATCH must carry.
async function pickLook(page: Page) {
  await option(page, copy.body, copy.bodyNames.woman).click();
  await expect(option(page, copy.hair, copy.hairNames.long)).toHaveAttribute("aria-checked", "true");
  await option(page, copy.hair, copy.hairNames.curly).click();
  await option(page, copy.skin, copy.skinNames.dark).click();
  await option(page, copy.hairColor, copy.hairColorNames.red).click();
  await option(page, copy.shirt, copy.shirtNames.sky).click();
  const cap = extra(page, copy.extraNames.cap);
  const glasses = extra(page, copy.extraNames.glasses);
  const capBefore = await pressed(cap);
  await cap.click();
  await expect(cap).toHaveAttribute("aria-pressed", `${!capBefore}`);
  await glasses.click();
  return { body: "woman", hair: "curly", skin: "#5C3A21", hairColor: "#D9664F", shirt: "#6CC4FF", hat: capBefore ? "none" : "cap", face: (await pressed(glasses)) ? "glasses" : "none" };
}

async function expectChosen(page: Page): Promise<void> {
  for (const [rowLabel, name] of [
    [copy.body, copy.bodyNames.woman],
    [copy.hair, copy.hairNames.curly],
    [copy.skin, copy.skinNames.dark],
    [copy.hairColor, copy.hairColorNames.red],
    [copy.shirt, copy.shirtNames.sky],
  ] as const) {
    await expect(option(page, rowLabel, name)).toHaveAttribute("aria-checked", "true");
  }
}

// The checked option of every look row, to see the dice change something.
const lookState = (page: Page) =>
  Promise.all([copy.skin, copy.hair, copy.hairColor, copy.shirt].map((label) => row(page, label).locator('[aria-checked="true"]').getAttribute("aria-label").then((name) => name ?? "")));

test.describe("monito (mock)", () => {
  test("shows every option row and the monito choice without a LinkedIn photo @mock", async ({ page }) => {
    await openMonito(page);
    await expect(page.getByText(copy.title).first()).toBeVisible();
    await expect(row(page, copy.body).getByRole("radio")).toHaveCount(3);
    await expect(row(page, copy.skin).getByRole("radio")).toHaveCount(5);
    await expect(row(page, copy.hair).getByRole("radio")).toHaveCount(4);
    await expect(row(page, copy.hairColor).getByRole("radio")).toHaveCount(4);
    await expect(row(page, copy.shirt).getByRole("radio")).toHaveCount(6);
    await expect(row(page, copy.extras).getByRole("button")).toHaveCount(3);
    await expect(photoChoice(page)).toBeDisabled();
    await expect(photoChoice(page)).toContainText(copy.noPhoto);
    await expect(monitoChoice(page)).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText(copy.step)).toBeVisible();
    await expect(page.getByRole("link", { name: common.back })).toHaveAttribute("href", "/onboarding/profile");
  });

  test("saves the picked look and goes Home @mock", async ({ page }) => {
    await openMonito(page);
    const expected = await pickLook(page);
    const patch = page.waitForRequest(isMePatch);
    await saveButton(page).click();
    const body = (await patch).postDataJSON();
    expect(body).toMatchObject({ avatar: expected, avatarMode: "monito" });
    expect(MonitoLook.safeParse(body.avatar).success).toBe(true);
    await expect(page).toHaveURL(/\/home$/);
  });

  test("the dice changes the look but keeps the body @mock", async ({ page }) => {
    await openMonito(page);
    await option(page, copy.body, copy.bodyNames.man).click();
    const before = await lookState(page);
    await expect(async () => {
      await page.getByRole("button", { name: copy.random }).click();
      expect(await lookState(page)).not.toEqual(before);
    }).toPass({ timeout: 10_000 });
    await expect(option(page, copy.body, copy.bodyNames.man)).toHaveAttribute("aria-checked", "true");
  });

  test("goes to a safe ?next after saving @mock", async ({ page }) => {
    await openMonito(page, `?next=${encodeURIComponent("/connections?tab=all")}`);
    await saveButton(page).click();
    await expect(page).toHaveURL(/\/connections\?tab=all$/);
  });

  for (const unsafe of ["//evil.com", "https://evil.com", "/\\evil.com"]) {
    test(`ignores an unsafe ?next=${unsafe} and goes Home @mock`, async ({ page }) => {
      await openMonito(page, `?next=${encodeURIComponent(unsafe)}`);
      await saveButton(page).click();
      await expect(page).toHaveURL(/\/home$/);
    });
  }

  test("?from=me returns to /me @mock", async ({ page }) => {
    await openMonito(page, "?from=me");
    await expect(page.getByText(copy.step)).toHaveCount(0);
    await expect(page.getByRole("link", { name: common.back })).toHaveAttribute("href", "/me");
    await saveButton(page).click();
    await expect(page).toHaveURL(/\/me$/);
  });

  for (const code of ["invalid_input", "unauthorized"]) {
    test(`a ${code} save error shows and keeps the selection @mock`, async ({ page, mock }) => {
      await openMonito(page);
      await pickLook(page);
      await mock.mockError(code, "**/api/me");
      await saveButton(page).click();
      // The server message is shown as is (F-08 "raw msg").
      await expect(page.getByText(code === "unauthorized" ? /Sign in/ : /invalid/i)).toBeVisible();
      await expect(page).toHaveURL(/\/onboarding\/monito$/);
      await expectChosen(page);
      await expect(saveButton(page)).toBeEnabled();
    });
  }
});

test.describe("monito (real)", () => {
  test("a saved look persists and is reopened as saved @real", async ({ page, context, testUsers, signIn }) => {
    const [user] = await testUsers(1);
    if (!user) throw new Error("test user not created");
    await signIn(context, user);
    await openMonito(page);
    const expected = await pickLook(page);
    await saveButton(page).click();
    await expect(page).toHaveURL(/\/home$/);

    const me = Me.parse(await (await page.request.get("/api/me")).json());
    expect(me.avatar).toMatchObject(expected);
    expect(me.avatarMode).toBe("monito");
    await openMonito(page, "?from=me");
    await expectChosen(page);
  });

  test("a LinkedIn photo is preselected; switching to the monito is saved @real", async ({ page, context, createUsers, signIn, baseURL }) => {
    const photoUrl = new URL("/icon.png", baseURL ?? "http://localhost:3000").toString();
    const [user] = await createUsers({ users: [{ photoUrl }] });
    if (!user) throw new Error("test user not created");
    await signIn(context, user);
    await openMonito(page);
    await expect(photoChoice(page)).toBeEnabled();
    await expect(photoChoice(page)).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText(copy.hintPhoto)).toBeVisible();
    await expect(page.getByRole("img", { name: user.name })).toBeVisible();

    await monitoChoice(page).click();
    await expect(page.getByText(copy.hint)).toBeVisible();
    await saveButton(page).click();
    await expect(page).toHaveURL(/\/home$/);
    expect(Me.parse(await (await page.request.get("/api/me")).json()).avatarMode).toBe("monito");

    await openMonito(page, "?from=me");
    await expect(monitoChoice(page)).toHaveAttribute("aria-checked", "true");
    await photoChoice(page).click();
    await saveButton(page).click();
    await expect(page).toHaveURL(/\/me$/);
    expect(Me.parse(await (await page.request.get("/api/me")).json()).avatarMode).toBe("photo");
  });
});
