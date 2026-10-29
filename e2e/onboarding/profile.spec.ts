// F-07, F-42: 02 Perfil at /onboarding/profile (and ?from=me): prefill, visibility pickers, link validation, save to
// PATCH /api/me + /api/me/visibility, API errors and persistence. This screen is Spanish only (lib/copy/index.ts).
import type { Page, Request } from "@playwright/test";
import { Me } from "../../lib/api/schemas";
import { me as diego } from "../../lib/api/examples";
import { common, networks, profile as copy, visibility } from "../../lib/copy/es";
import { expect, test, waitForHydration } from "./helpers";

const isPatch = (path: string) => (request: Request) => request.method() === "PATCH" && new URL(request.url()).pathname === path;

const field = (page: Page, label: string) => page.getByRole("textbox", { name: label, exact: true });
const picker = (page: Page, item: string) => page.getByRole("group", { name: visibility.pickerLabel(item) });

async function openProfile(page: Page, query = ""): Promise<void> {
  await page.goto(`/onboarding/profile${query}`);
  await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible();
  await waitForHydration(page, "form button[type=submit]");
}

const submit = (page: Page, label: string) => page.getByRole("button", { name: label });

test.describe("profile (mock)", () => {
  test("prefills the LinkedIn data and the step @mock", async ({ page }) => {
    await openProfile(page);
    await expect(field(page, copy.name)).toHaveValue(diego.name);
    await expect(field(page, copy.role)).toHaveValue(diego.headline ?? "");
    await expect(field(page, copy.company)).toHaveValue(diego.company ?? "");
    await expect(field(page, copy.city)).toHaveValue(diego.city ?? "");
    await expect(field(page, networks.instagram)).toHaveValue(/diego\.rmz/);
    await expect(page.getByText(copy.step)).toBeVisible();
    await expect(page.getByText(copy.fromLinkedIn)).toBeVisible();
    await expect(page.getByText(visibility.legend.connections)).toBeVisible();
    await expect(picker(page, copy.role).getByRole("button", { name: visibility.levels.public })).toHaveAttribute("aria-pressed", "true");
  });

  test("saves fields and visibility, then goes to the monito @mock", async ({ page }) => {
    await openProfile(page);
    await field(page, copy.role).fill("CTO");
    await field(page, copy.city).fill("Zapopan");
    await picker(page, copy.role).getByRole("button", { name: visibility.levels.connections }).click();
    await picker(page, copy.company).getByRole("button", { name: visibility.levels.hidden }).click();
    await expect(page.getByText(/Al conectar también verán: .*Puesto/)).toBeVisible();

    const mePatch = page.waitForRequest(isPatch("/api/me"));
    const visibilityPatch = page.waitForRequest(isPatch("/api/me/visibility"));
    await submit(page, copy.next).click();
    expect((await mePatch).postDataJSON()).toMatchObject({ name: diego.name, headline: "CTO", company: diego.company, city: "Zapopan" });
    expect((await mePatch).postDataJSON()).not.toHaveProperty("links");
    expect((await visibilityPatch).postDataJSON()).toMatchObject({ headline: "connections", company: "hidden" });
    await expect(page).toHaveURL(/\/onboarding\/monito$/);
  });

  test("an invalid link blocks the save and focuses the field @mock", async ({ page }) => {
    await openProfile(page);
    const patches: string[] = [];
    page.on("request", (request) => isPatch("/api/me")(request) && patches.push(request.url()));
    const instagram = field(page, networks.instagram);
    await instagram.fill("no válido!!");
    await instagram.blur();
    await expect(page.getByText(copy.linkError.instagram)).toBeVisible();
    await expect(instagram).toHaveAttribute("aria-invalid", "true");
    await submit(page, copy.next).click();
    await expect(page.getByRole("alert").filter({ hasText: copy.fixErrors })).toBeVisible();
    await expect(instagram).toBeFocused();
    await expect(page).toHaveURL(/\/onboarding\/profile$/);
    expect(patches).toHaveLength(0);
  });

  test("a new valid link is sent; removing one can be undone @mock", async ({ page }) => {
    await openProfile(page);
    await field(page, networks.github).fill("@diego-dev");
    await page.getByRole("button", { name: copy.removeLabel(networks.instagram) }).click();
    await expect(field(page, networks.instagram)).toHaveValue("");
    await expect(page.getByText(copy.removed(networks.instagram))).toBeVisible();
    await page.getByRole("button", { name: copy.undo }).click();
    await expect(field(page, networks.instagram)).toHaveValue(/diego\.rmz/);
    await page.getByRole("button", { name: copy.removeLabel(networks.instagram) }).click();

    const mePatch = page.waitForRequest(isPatch("/api/me"));
    await submit(page, copy.next).click();
    expect((await mePatch).postDataJSON()).toMatchObject({ links: { github: "@diego-dev", instagram: "" } });
  });

  for (const [code, path] of [
    ["invalid_input", "/api/me"],
    ["unauthorized", "/api/me"],
    ["invalid_input", "/api/me/visibility"],
  ] as const) {
    test(`${code} from PATCH ${path} shows the error and keeps the form @mock`, async ({ page, mock }) => {
      await openProfile(page);
      await mock.mockError(code, `**${path}`);
      await field(page, copy.city).fill("Zapopan");
      await submit(page, copy.next).click();
      // The server message is shown as is (F-07 "raw msg"); localized field errors are not built.
      await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible();
      await expect(page).toHaveURL(/\/onboarding\/profile$/);
      await expect(field(page, copy.city)).toHaveValue("Zapopan");
      await expect(submit(page, copy.next)).toBeEnabled();
    });
  }

  test("onboarding back goes to the landing @mock", async ({ page }) => {
    await openProfile(page);
    await expect(page.getByRole("link", { name: common.back })).toHaveAttribute("href", "/");
  });

  test("?from=me edits the profile and returns to /me @mock", async ({ page }) => {
    await openProfile(page, "?from=me");
    await expect(page.getByText(copy.step)).toHaveCount(0);
    await expect(page.getByRole("link", { name: common.back })).toHaveAttribute("href", "/me");
    await field(page, copy.name).fill("Diego R.");
    const mePatch = page.waitForRequest(isPatch("/api/me"));
    await submit(page, copy.save).click();
    expect((await mePatch).postDataJSON()).toMatchObject({ name: "Diego R." });
    await expect(page).toHaveURL(/\/me$/);
  });

  test("a failed /api/me while rendering shows the error screen @mock", async ({ page, mock }) => {
    await mock.mockServerError("unauthorized");
    await page.goto("/onboarding/profile");
    await expect(page.getByRole("alert").filter({ hasText: /Algo se atoró/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ir al inicio/ })).toHaveAttribute("href", "/");
  });
});

test.describe("profile (real)", () => {
  test("saves job title, company, city and visibility, and they persist @real", async ({ page, context, testUsers, signIn }) => {
    const [user] = await testUsers(1);
    if (!user) throw new Error("test user not created");
    await signIn(context, user);
    await openProfile(page);
    await expect(field(page, copy.name)).toHaveValue(user.name);
    await field(page, copy.role).fill("Ingeniera de pruebas");
    await field(page, copy.company).fill("Compa QA");
    await field(page, copy.city).fill("Zapopan, Jalisco");
    await picker(page, copy.company).getByRole("button", { name: visibility.levels.hidden }).click();
    await submit(page, copy.next).click();
    await expect(page).toHaveURL(/\/onboarding\/monito$/);

    await openProfile(page, "?from=me");
    await expect(field(page, copy.role)).toHaveValue("Ingeniera de pruebas");
    await expect(field(page, copy.company)).toHaveValue("Compa QA");
    await expect(field(page, copy.city)).toHaveValue("Zapopan, Jalisco");
    await expect(picker(page, copy.company).getByRole("button", { name: visibility.levels.hidden })).toHaveAttribute("aria-pressed", "true");
    const me = Me.parse(await (await page.request.get("/api/me")).json());
    expect(me.visibility.company).toBe("hidden");
    expect(me.city).toBe("Zapopan, Jalisco");
  });

  test("editing the name from /me saves it and keeps it edited @real", async ({ page, context, testUsers, signIn }) => {
    const [user] = await testUsers(1);
    if (!user) throw new Error("test user not created");
    await signIn(context, user);
    await openProfile(page, "?from=me");
    await field(page, copy.name).fill(`${user.name} QA`);
    await submit(page, copy.save).click();
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByText(`${user.name} QA`).first()).toBeVisible();
    const me = Me.parse(await (await page.request.get("/api/me")).json());
    expect(me.name).toBe(`${user.name} QA`);
    expect(me.nameEdited).toBe(true);
  });

  test("an empty name is rejected by the server and nothing is saved @real", async ({ page, context, testUsers, signIn }) => {
    const [user] = await testUsers(1);
    if (!user) throw new Error("test user not created");
    await signIn(context, user);
    await openProfile(page, "?from=me");
    await field(page, copy.name).fill("");
    await submit(page, copy.save).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible();
    await expect(page).toHaveURL(/\/onboarding\/profile\?from=me$/);
    const me = Me.parse(await (await page.request.get("/api/me")).json());
    expect(me.name).toBe(user.name);
  });
});
