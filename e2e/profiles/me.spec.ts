// 09 MiPerfil and its edit flow (F-41, F-42): points and rank, every shortcut, per-link visibility that saves at once
// and reverts on failure, editing name, role and city, and interests. Spanish-only copy, so both locales assert lib/copy/es.
import { errorCopy } from "../fixtures";
import type { Page } from "@playwright/test";
import { E } from "../../lib/api/errors";
import { me as diego } from "../../lib/api/examples";
import { InterestList, Me, VisibilitySettings } from "../../lib/api/schemas";
import { BADGE_IDS } from "../../lib/badges/catalog";
import { common, me as copy, networks, person, profile, tour, visibility } from "../../lib/copy/es";
import { formatPoints } from "../../lib/format";
import { acceptedConnection, call, expect, expectApiError, skipTours, test } from "./helpers";

const picker = (page: Page, network: keyof typeof networks) => page.getByRole("group", { name: visibility.pickerLabel(networks[network]) });

const isVisibilityPatch = (url: string, method: string) => method === "PATCH" && new URL(url).pathname === "/api/me/visibility";

test.describe("my profile in mock mode", () => {
  test.beforeEach(async ({ page }) => skipTours(page));

  test("shows who I am, my points, numbers, badges and links @mock", async ({ page }) => {
    await page.goto("/me");
    await expect(page.getByText(diego.name, { exact: true })).toBeVisible();
    await expect(page.getByText(`${diego.headline} · ${diego.company}`)).toBeVisible();
    await expect(page.getByText(copy.pointsRank(formatPoints(1265), 6))).toBeVisible();
    for (const label of [copy.newConnections, copy.reconnections, copy.events]) await expect(page.getByText(label, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(copy.badgesCount(diego.badges?.length ?? 0, BADGE_IDS.length)) })).toHaveAttribute("href", "/me/badges");
    await expect(picker(page, "linkedin").getByRole("button", { name: visibility.levels.connections })).toHaveAttribute("aria-pressed", "true");
    await expect(picker(page, "instagram").getByRole("button", { name: visibility.levels.connections })).toHaveAttribute("aria-pressed", "true");
    await expect(picker(page, "github")).toHaveCount(0);
    await expect(page.getByText(copy.testUser)).toHaveCount(0);
    await expect(page.getByRole("link", { name: new RegExp(copy.admin) })).toHaveCount(0);
  });

  test("every shortcut points to its screen @mock", async ({ page }) => {
    await page.goto("/me");
    const links: [string | RegExp, string][] = [
      [copy.myQr, "/connect"],
      [copy.edit, "/onboarding/profile?from=me"],
      [copy.changeMonito, "/onboarding/monito?from=me"],
      [new RegExp(`^${copy.ranking}`), "/ranking"],
      [new RegExp(`^${copy.myMonito}`), "/onboarding/monito?from=me"],
      [tour.replay, "/home?tour=1"],
      [copy.linksEdit, "/onboarding/profile?from=me#preview"],
    ];
    for (const [name, href] of links) await expect(page.getByRole("link", { name }).first()).toHaveAttribute("href", href);
    await page.getByRole("link", { name: new RegExp(`^${copy.ranking}`) }).click();
    await expect(page).toHaveURL(/\/ranking$/);
  });

  test("a visibility change saves at once @mock", async ({ page }) => {
    await page.goto("/me");
    const saved = page.waitForRequest((request) => isVisibilityPatch(request.url(), request.method()));
    await picker(page, "instagram").getByRole("button", { name: visibility.levels.public }).click();
    expect((await saved).postDataJSON()).toEqual({ links: { instagram: "public" } });
    await expect(picker(page, "instagram").getByRole("button", { name: visibility.levels.public })).toHaveAttribute("aria-pressed", "true");
  });

  test("a visibility save that fails reverts the choice @mock", async ({ page, mock }) => {
    await mock.mockError("invalid_input", "**/api/me/visibility");
    await page.goto("/me");
    const failed = page.waitForResponse((response) => isVisibilityPatch(response.url(), response.request().method()));
    await picker(page, "linkedin").getByRole("button", { name: visibility.levels.hidden }).click();
    expect((await failed).status()).toBe(400);
    await expect(picker(page, "linkedin").getByRole("button", { name: visibility.levels.connections })).toHaveAttribute("aria-pressed", "true");
  });

  test("editing from my profile saves and comes back @mock", async ({ page }) => {
    await page.goto("/me");
    await page.getByRole("link", { name: copy.edit }).click();
    await expect(page).toHaveURL(/\/onboarding\/profile\?from=me$/);
    await expect(page.getByRole("link", { name: common.back })).toHaveAttribute("href", "/me");
    await page.getByLabel(profile.city, { exact: true }).fill("Zapopan, Jalisco");
    const patched = page.waitForRequest((request) => request.method() === "PATCH" && new URL(request.url()).pathname === "/api/me");
    await page.getByRole("button", { name: profile.save }).click();
    expect((await patched).postDataJSON()).toMatchObject({ city: "Zapopan, Jalisco", name: diego.name });
    await expect(page).toHaveURL(/\/me$/);
  });

  test("a rejected edit shows the error and stays on the form @mock", async ({ page, mock }) => {
    await mock.mockError("invalid_input", "**/api/me");
    await page.goto("/onboarding/profile?from=me");
    await page.getByRole("button", { name: profile.save }).click();
    await expect(page.getByRole("alert").filter({ hasText: errorCopy(E.invalidInput) })).toBeVisible();
    await expect(page).toHaveURL(/\/onboarding\/profile\?from=me$/);
  });

  test("an invalid link is flagged before saving @mock", async ({ page }) => {
    await page.goto("/onboarding/profile?from=me");
    const x = page.getByLabel(networks.x, { exact: true });
    await x.fill("not a handle!!");
    // Leaving the field shows its error first; the save tap then lands on the button, not on the shifted layout.
    await x.blur();
    await expect(page.getByRole("alert").filter({ hasText: profile.linkError.x })).toBeVisible();
    await page.getByRole("button", { name: profile.save }).click();
    await expect(page.getByRole("alert").filter({ hasText: profile.fixErrors })).toBeVisible();
    await expect(page).toHaveURL(/\/onboarding\/profile\?from=me$/);
  });

  test("the interests list is public @mock", async ({ page }) => {
    const interests = await call(page.request, "GET", "/api/interests", InterestList);
    expect(interests.length).toBeGreaterThan(0);
  });
});

test.describe("my profile tour", () => {
  test("opens on the first visit and walks the three steps @mock", async ({ page }) => {
    await page.goto("/me");
    for (const [index, step] of tour.me.entries()) {
      const dialog = page.getByRole("dialog", { name: step.title });
      await expect(dialog).toContainText(tour.step(index + 1, tour.me.length));
      await dialog.getByRole("button", { name: index === tour.me.length - 1 ? tour.done : tour.next }).click();
    }
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("my profile in real mode", () => {
  test("a newcomer has no points or rank yet @real", async ({ people }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    await ana.page.goto("/me");
    await expect(ana.page.getByText(ana.user.name, { exact: true })).toBeVisible();
    await expect(ana.page.getByText(copy.pointsRank("0", null), { exact: true })).toBeVisible();
    await expect(ana.page.getByText(copy.testUser)).toBeVisible();
    await expect(ana.page.getByRole("link", { name: new RegExp(copy.badgesCount(0, BADGE_IDS.length)) })).toBeVisible();
  });

  test("after an accepted connection my points, rank and numbers are real @real", async ({ people }) => {
    const [ana, bruno] = await people([{}, {}]);
    if (!ana || !bruno) throw new Error("test users not created");
    await acceptedConnection(ana, bruno);
    // Other workers connect at the same event, so the rank is compared with a fresh /api/me until both agree.
    await expect(async () => {
      await ana.page.goto("/me");
      const me = await call(ana.page.request, "GET", "/api/me", Me);
      expect(me.scores?.event.points).toBe(50);
      const rank = me.scores?.event.rank ?? null;
      expect(rank).not.toBeNull();
      await expect(ana.page.getByText(copy.pointsRank(formatPoints(50), rank), { exact: true })).toBeVisible({ timeout: 2_000 });
      await expect(ana.page.getByRole("link", { name: new RegExp(`^${copy.ranking}`) })).toContainText(`#${rank}`, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    expect((await call(ana.page.request, "GET", "/api/me", Me)).stats?.newConnections).toBe(1);
    await expect(ana.page.getByRole("link", { name: new RegExp(copy.badges) }).getByRole("img", { name: "Primer apretón", exact: true })).toBeVisible();
  });

  test("editing name, role and city saves them and marks the name as edited @real", async ({ people }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    const edits = { name: "Ana Prueba Editada", headline: "Ingeniera de pruebas", city: "Zapopan, Jalisco" };
    await ana.page.goto("/onboarding/profile?from=me");
    await ana.page.getByLabel(profile.name, { exact: true }).fill(edits.name);
    await ana.page.getByLabel(profile.role, { exact: true }).fill(edits.headline);
    await ana.page.getByLabel(profile.city, { exact: true }).fill(edits.city);
    await ana.page.getByRole("button", { name: profile.save }).click();
    await expect(ana.page).toHaveURL(/\/me$/);
    await expect(ana.page.getByText(edits.name, { exact: true })).toBeVisible();
    // The card shows the role and the city's first part on one line block.
    await expect(ana.page.getByText(edits.headline)).toContainText("Zapopan");
    const me = await call(ana.page.request, "GET", "/api/me", Me);
    expect(me).toMatchObject({ ...edits, nameEdited: true });
  });

  test("interests are saved by id and unknown ids are rejected @real", async ({ people }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    const [interest] = await call(ana.page.request, "GET", "/api/interests", InterestList);
    if (!interest) throw new Error("the interest list is empty: seed the database");
    const me = await call(ana.page.request, "PATCH", "/api/me", Me, { interestIds: [interest.id] });
    expect(me.interests).toEqual([interest.name]);
    await expectApiError(await ana.page.request.patch("/api/me", { data: { interestIds: [32_000] } }), 400, "invalid_input");
    // Past the smallint column: once a 500 from Postgres, now rejected by PatchMeBody.
    await expectApiError(await ana.page.request.patch("/api/me", { data: { interestIds: [2_000_000] } }), 400, "invalid_input");
    await expectApiError(await ana.page.request.patch("/api/me", { data: { links: { x: "not a handle!!" } } }), 400, "invalid_input");
    await expectApiError(await ana.page.request.patch("/api/me/visibility", { data: { links: { x: "friends" } } }), 400, "invalid_input");
  });

  test("hiding a link on my profile hides it from my peer, making it public shows it to strangers @real", async ({ people }) => {
    const owner = { links: { instagram: "https://www.instagram.com/compa.owner" }, visibility: { links: { instagram: "connections" as const } } };
    const [ana, bruno, carla] = await people([owner, {}, {}]);
    if (!ana || !bruno || !carla) throw new Error("test users not created");
    await acceptedConnection(bruno, ana);
    const instagram = (page: Page) => page.getByRole("link", { name: person.linkLabel(networks.instagram, ana.user.name) });
    await bruno.page.goto(`/people/${ana.user.handle}`);
    await expect(instagram(bruno.page)).toBeVisible();

    await ana.page.goto("/me");
    const choose = async (level: keyof typeof visibility.levels) => {
      const saved = ana.page.waitForResponse((response) => isVisibilityPatch(response.url(), response.request().method()));
      await picker(ana.page, "instagram").getByRole("button", { name: visibility.levels[level] }).click();
      expect((await saved).status()).toBe(200);
    };
    await choose("hidden");
    await bruno.page.reload();
    await expect(instagram(bruno.page)).toHaveCount(0);

    await choose("public");
    await carla.page.goto(`/people/${ana.user.handle}`);
    await expect(instagram(carla.page)).toBeVisible();
    expect((await call(ana.page.request, "GET", "/api/me", Me)).visibility.links.instagram).toBe("public");
    await call(ana.page.request, "PATCH", "/api/me/visibility", VisibilitySettings, { links: { instagram: "connections" } });
    await carla.page.reload();
    await expect(instagram(carla.page)).toHaveCount(0);
  });
});
