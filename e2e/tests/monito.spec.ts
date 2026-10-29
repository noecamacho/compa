import type { Locator, Page } from "@playwright/test";
import { MonitoLook } from "../../lib/monito/look";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

const preview = (page: Page): Locator => page.getByRole("img", { name: "Tu monito" });

// Extras start from a random look (no saved monito yet), so an extra is set, not toggled blindly.
async function setExtra(button: Locator, on: boolean): Promise<void> {
  if ((await button.getAttribute("aria-pressed")) !== String(on)) await button.click();
  await expect(button).toHaveAttribute("aria-pressed", String(on));
}

// The draft is written after paint; wait for it before reloading.
const draftStored = (page: Page, needle: string) => expect.poll(() => page.evaluate(() => Object.entries(sessionStorage).filter(([key]) => key.startsWith("compa:draft:monito:")).map(([, value]) => value).join(""))).toContain(needle);

async function lookOf(locator: Locator): Promise<Record<string, unknown>> {
  const raw = await locator.getAttribute("data-look");
  if (!raw) throw new Error("no data-look on the monito");
  return JSON.parse(raw) as Record<string, unknown>;
}

// 02b Monito: every option changes the preview, extras combine, random looks are valid, the saved monito is the same everywhere.
test.describe("Monito", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("every skin, hair, color, shirt and extra changes the preview", async ({ pageA }) => {
    await pageA.goto("/onboarding/monito");
    await expect(pageA.locator("main[data-restored]")).toBeVisible();
    const checks: { group: string; options: string[]; prop: string }[] = [
      { group: "Piel", options: ["Muy clara", "Clara", "Media", "Morena", "Oscura"], prop: "skin" },
      { group: "Pelo", options: ["Corto", "Largo", "Chongo", "Rizado"], prop: "hair" },
      { group: "Color", options: ["Negro", "Café", "Pelirrojo", "Rubio"], prop: "hairColor" },
      { group: "Camisa", options: ["Menta", "Cielo", "Chicle", "Sol", "Coral", "Tinta"], prop: "shirt" },
    ];
    for (const { group, options, prop } of checks) {
      const seen = new Set<string>();
      for (const option of options) {
        const radio = pageA.getByRole("group", { name: group }).getByRole("radio", { name: option, exact: true });
        await radio.click();
        await expect(radio).toHaveAttribute("aria-checked", "true");
        const look = await lookOf(preview(pageA));
        seen.add(String(look[prop]));
      }
      expect(seen.size, `${group} options produce distinct looks`).toBe(options.length);
    }

    const extras = pageA.getByRole("group", { name: "Extras" });
    await setExtra(extras.getByRole("button", { name: "Gorra" }), true);
    await setExtra(extras.getByRole("button", { name: "Lentes" }), true);
    await setExtra(extras.getByRole("button", { name: "Barba" }), true);
    const combined = await lookOf(preview(pageA));
    expect(combined.hat).toBe("cap");
    expect(combined.face).toBe("glasses");
    expect(combined.beard).toBe(true);
    await setExtra(extras.getByRole("button", { name: "Lentes" }), false);
    const without = await lookOf(preview(pageA));
    expect(without.hat).toBe("cap");
    expect(without.face).toBe("none");
    expect(without.beard).toBe(true);
  });

  test("'Al azar' 20 times never produces an invalid look", async ({ pageA }) => {
    await pageA.goto("/onboarding/monito");
    await expect(pageA.locator("main[data-restored]")).toBeVisible();
    const seen = new Set<string>();
    for (let round = 0; round < 20; round++) {
      await pageA.getByRole("button", { name: "Al azar" }).click();
      const raw = await preview(pageA).getAttribute("data-look");
      expect(raw).not.toBeNull();
      expect(MonitoLook.safeParse(JSON.parse(raw ?? "{}")).success, `round ${round}: ${raw}`).toBe(true);
      seen.add(raw ?? "");
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  test("the saved monito is the same on Inicio and Mi perfil", async ({ pageA, userA }) => {
    await pageA.goto("/onboarding/monito");
    await expect(pageA.locator("main[data-restored]")).toBeVisible();
    await pageA.getByRole("group", { name: "Camisa" }).getByRole("radio", { name: "Coral" }).click();
    await pageA.getByRole("group", { name: "Pelo" }).getByRole("radio", { name: "Chongo" }).click();
    await setExtra(pageA.getByRole("group", { name: "Extras" }).getByRole("button", { name: "Lentes" }), true);
    const chosen = await lookOf(preview(pageA));
    await pageA.getByRole("button", { name: "Listo, entrar" }).click();
    await expect(pageA).toHaveURL("/home");
    const onHome = await lookOf(pageA.getByRole("link", { name: `${userA.name} Hola, Ana` }).getByRole("img"));
    expect(onHome).toEqual(chosen);
    await pageA.goto("/me");
    const onMe = await lookOf(pageA.getByRole("link", { name: "Tu monito, cámbialo" }).getByRole("img"));
    expect(onMe).toEqual(chosen);
    expect(onMe.shirt).toBe("#FF6B4A");
    expect(onMe.hair).toBe("bun");
    expect(onMe.face).toBe("glasses");
  });

  test("going back and reloading keeps the chosen look until it is saved", async ({ pageA }) => {
    await pageA.goto("/onboarding/monito");
    await expect(pageA.locator("main[data-restored]")).toBeVisible();
    await pageA.getByRole("group", { name: "Camisa" }).getByRole("radio", { name: "Tinta" }).click();
    await setExtra(pageA.getByRole("group", { name: "Extras" }).getByRole("button", { name: "Gorra" }), true);
    await draftStored(pageA, '"cap":true');
    await pageA.reload();
    await expect(pageA.locator("main[data-restored]")).toBeVisible();
    await expect(pageA.getByRole("group", { name: "Camisa" }).getByRole("radio", { name: "Tinta" })).toHaveAttribute("aria-checked", "true");
    await expect(pageA.getByRole("group", { name: "Extras" }).getByRole("button", { name: "Gorra" })).toHaveAttribute("aria-pressed", "true");
    await pageA.getByRole("link", { name: "Regresar" }).click();
    await expect(pageA).toHaveURL("/onboarding/profile");
    await pageA.goBack();
    await expect(pageA.getByRole("group", { name: "Camisa" }).getByRole("radio", { name: "Tinta" })).toHaveAttribute("aria-checked", "true");
  });

  test("from my profile it returns to /me and a failed save shows an error", async ({ pageA }) => {
    await pageA.goto("/onboarding/monito?from=me");
    await expect(pageA.getByRole("link", { name: "Regresar" })).toHaveAttribute("href", "/me");
    await pageA.route("**/api/me", (route) => (route.request().method() === "PATCH" ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "internal_error", message: "x" } }) }) : route.continue()));
    await pageA.getByRole("button", { name: "Listo, entrar" }).click();
    await expect(pageA.locator("main").getByRole("alert")).toHaveText("Algo salió mal. Inténtalo otra vez.");
    await pageA.unroute("**/api/me");
    await pageA.getByRole("button", { name: "Listo, entrar" }).click();
    await expect(pageA).toHaveURL("/me");
  });

  test("the photo choice is disabled without a LinkedIn photo", async ({ pageA }) => {
    await pageA.goto("/onboarding/monito");
    const photo = pageA.getByRole("radiogroup", { name: "Cómo te ven" }).getByRole("radio", { name: /Usar mi foto de LinkedIn/ });
    await expect(photo).toBeDisabled();
    await expect(pageA.getByRole("radiogroup", { name: "Cómo te ven" }).getByRole("radio", { name: /Crear mi monito/ })).toHaveAttribute("aria-checked", "true");
  });
});
