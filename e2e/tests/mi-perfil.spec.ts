import { acceptedConnection, grantBadge } from "../helpers/db";
import { box, dock, skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// 09 MiPerfil: monito, badges, ranking, edit and QR navigate; nothing sits under the dock.
test.describe("Mi perfil", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("shows my data and every access navigates", async ({ pageA, world, userA, userB }) => {
    await acceptedConnection(world, userA, userB, "new");
    await grantBadge(userA, "apreton");
    await pageA.goto("/me");
    await expect(pageA.getByText(userA.name)).toBeVisible();
    await expect(pageA.getByText(/CTO · Tlali/)).toContainText("Monterrey");
    await expect(pageA.getByText(/50 pts · #\d/)).toBeVisible();
    await expect(pageA.getByRole("link", { name: "Mi QR" })).toHaveAttribute("href", "/connect");
    await expect(pageA.getByRole("link", { name: "Editar perfil" })).toHaveAttribute("href", "/onboarding/profile?from=me");
    await expect(pageA.getByRole("link", { name: "Tu monito, cámbialo" })).toHaveAttribute("href", "/onboarding/monito?from=me");
    await expect(pageA.getByRole("link", { name: /Insignias/ })).toHaveAttribute("href", "/me/badges");
    await expect(pageA.getByRole("link", { name: /Insignias/ }).getByRole("img", { name: "Primer apretón" })).toBeVisible();
    await expect(pageA.getByRole("link", { name: /Ranking/ })).toHaveAttribute("href", "/ranking");
    await expect(pageA.getByRole("link", { name: /Mi monito/ })).toHaveAttribute("href", "/onboarding/monito?from=me");
    await expect(pageA.getByRole("link", { name: /Guía rápida/ })).toHaveAttribute("href", "/home?tour=1");

    // The three numbers come from the backend: 1 new, 0 reconnections, 1 event.
    const stats = pageA.locator("main").getByText(/^\d+$/);
    await expect(stats.nth(0)).toHaveText("1");
    await expect(stats.nth(1)).toHaveText("0");
    await expect(stats.nth(2)).toHaveText("1");

    for (const [name, path] of [
      ["Mi QR", "/connect"],
      ["Editar perfil", "/onboarding/profile?from=me"],
      [/Insignias/, "/me/badges"],
      [/Ranking/, "/ranking"],
    ] as const) {
      await pageA.goto("/me");
      await pageA.getByRole("link", { name }).click();
      await expect(pageA).toHaveURL(path);
    }
  });

  test("nothing is hidden under the dock", async ({ pageA }) => {
    await pageA.goto("/me");
    const bar = dock(pageA);
    await expect(bar).toBeVisible();
    const last = pageA.getByRole("link", { name: /Guía rápida/ });
    await last.scrollIntoViewIfNeeded();
    await pageA.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const content = await box(last);
    const nav = await box(bar);
    expect(content.y + content.height).toBeLessThanOrEqual(nav.y);
    const viewport = pageA.viewportSize();
    expect(viewport).not.toBeNull();
    expect(nav.y + nav.height).toBeLessThanOrEqual(viewport?.height ?? 0);
    expect(nav.x).toBeGreaterThanOrEqual(0);
    expect(nav.x + nav.width).toBeLessThanOrEqual(viewport?.width ?? 0);
  });

  test("without a rank the pill shows the points and the ranking row shows a dash", async ({ pageA }) => {
    await pageA.goto("/me");
    await expect(pageA.getByText("0 pts", { exact: true })).toBeVisible();
    await expect(pageA.getByRole("link", { name: /Ranking/ })).toContainText("—");
  });
});
