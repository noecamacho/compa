import type { Page } from "@playwright/test";
import { acceptedConnection } from "../helpers/db";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

const LONG_NAME = "Maximiliana Fernández Ochoa"; // 27 characters, plus the company below it
const LONG_COMPANY = "Corporación Internacional de Tecnología Aplicada";

// No element of the screen overflows the viewport or its own box; text that must truncate truncates.
async function overflowReport(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const problems: string[] = [];
    if (document.documentElement.scrollWidth > width + 1) problems.push(`page scrolls horizontally: ${document.documentElement.scrollWidth} > ${width}`);
    for (const element of document.querySelectorAll<HTMLElement>("main *")) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right > width + 1 || rect.left < -1) problems.push(`${element.tagName.toLowerCase()}.${String(element.className).split(" ").slice(0, 3).join(".")} outside the viewport (${Math.round(rect.left)}–${Math.round(rect.right)})`);
    }
    return problems;
  });
}

test.describe("Textos largos", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("a long name, a long company and eight topics never overflow", async ({ pageA, world, userA }) => {
    const maxi = await world.addPerson({ name: LONG_NAME, headline: "Directora de Operaciones Regionales", company: LONG_COMPANY, city: "San Cristóbal de las Casas, Chiapas" });
    const eight = ["Levantar capital", "IA", "Proptech", "Contratar", "Ventas B2B", "Fintech", "Hardware", "Go to market"];
    await acceptedConnection(world, userA, maxi, "new", eight);

    for (const path of [`/connect/${maxi.handle}`, "/connections", `/people/${maxi.handle}`, "/home"]) {
      await pageA.goto(path);
      await pageA.waitForTimeout(600);
      expect(await overflowReport(pageA), path).toEqual([]);
    }

    // My own long data on my profile and on the QR card.
    await pageA.goto("/onboarding/profile?from=me");
    await expect(pageA.locator("form[data-restored]")).toBeVisible();
    await pageA.getByLabel("Nombre").fill(LONG_NAME);
    await pageA.getByLabel("Empresa").fill(LONG_COMPANY);
    await pageA.getByRole("button", { name: "Guardar" }).click();
    await expect(pageA).toHaveURL("/me");
    for (const path of ["/me", "/connect", "/ranking", "/invite"]) {
      await pageA.goto(path);
      await pageA.waitForTimeout(600);
      expect(await overflowReport(pageA), path).toEqual([]);
    }

    // The connections row truncates the eight topics inside its box.
    await pageA.goto("/connections");
    const row = pageA.getByRole("link", { name: new RegExp(LONG_NAME) });
    const topics = row.locator("span.truncate").last();
    const clipped = await topics.evaluate((element) => element.scrollWidth > element.clientWidth && getComputedStyle(element).textOverflow === "ellipsis");
    expect(clipped).toBe(true);
    const rowBox = await row.boundingBox();
    const topicsBox = await topics.boundingBox();
    expect((topicsBox?.x ?? 0) + (topicsBox?.width ?? 0)).toBeLessThanOrEqual((rowBox?.x ?? 0) + (rowBox?.width ?? 0));
  });

  test("the register screen with the maximum topics keeps the button inside the screen", async ({ pageA, world }) => {
    const maxi = await world.addPerson({ name: LONG_NAME, headline: "Directora de Operaciones Regionales", company: LONG_COMPANY });
    await pageA.goto(`/connect/${maxi.handle}`);
    for (const topic of ["Levantar capital", "Ventas B2B", "Contratar"]) await pageA.getByRole("button", { name: topic, exact: true }).click();
    await expect(pageA.getByRole("button", { name: "Confirmar · +55 pts" })).toBeVisible();
    expect(await overflowReport(pageA)).toEqual([]);
  });
});
