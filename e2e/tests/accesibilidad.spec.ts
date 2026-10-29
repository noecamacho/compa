import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { acceptedConnection, approvedNote, pendingRequest } from "../helpers/db";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// Controls whose box is smaller than 44 px are still fine when their hit area (globals.css `hit-44`) is at least 44 px.
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const MIN = 44;
    const problems: string[] = [];
    const controls = document.querySelectorAll<HTMLElement>("main button, main a[href], main input:not([type=hidden]), main textarea, nav a[href]");
    for (const element of controls) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const after = getComputedStyle(element, "::after");
      const hitWidth = after.content === '""' ? Math.max(rect.width, parseFloat(after.width) || 0) : rect.width;
      const hitHeight = after.content === '""' ? Math.max(rect.height, parseFloat(after.height) || 0) : rect.height;
      if (hitWidth + 0.5 < MIN || hitHeight + 0.5 < MIN) problems.push(`${element.tagName.toLowerCase()} "${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 30)}" ${Math.round(hitWidth)}×${Math.round(hitHeight)}`);
    }
    return problems;
  });
}

const iconOnlyWithoutName = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const problems: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>("main button, main a[href], nav a[href]")) {
      const text = (element.textContent ?? "").trim();
      const name = element.getAttribute("aria-label") ?? element.getAttribute("title") ?? "";
      const img = element.querySelector("img[alt], [role=img][aria-label]");
      if (!text && !name && !img) problems.push(element.outerHTML.slice(0, 80));
    }
    return problems;
  });

test.describe("Accesibilidad", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("axe finds nothing serious or critical on any screen; icon buttons have names; targets are 44 px", async ({ pageA, world, userA, userB }) => {
    const accepted = await acceptedConnection(world, userA, userB, "new", ["IA"]);
    await approvedNote(accepted, userA, "Hablamos de IA.", "IA para fintech", ["AI Products"], "Mandar el deck");
    const carla = await world.addPerson({ name: "Carla Ríos" });
    const pending = await pendingRequest(world, carla, userA);
    const screens = [
      "/",
      `/e/${world.event.accessCode}`,
      "/home",
      "/onboarding/profile",
      "/onboarding/monito",
      "/connect",
      "/connect?tab=scan",
      `/connect/${userB.handle}`,
      "/connections",
      `/connections/${accepted}/done`,
      `/connections/${accepted}/note`,
      "/me",
      "/me/badges",
      `/people/${userB.handle}`,
      "/ranking",
      `/requests/${pending}`,
      "/invite",
    ];
    const findings: string[] = [];
    for (const path of screens) {
      await pageA.goto(path);
      await pageA.waitForTimeout(400);
      // color-contrast is left out on purpose: the design's muted grey (#6F6A7E on #FFF6E5, 4.2:1) is a token the brief
      // says not to change; the finding is recorded in e2e/AVANCE.md for the design owner.
      const results = await new AxeBuilder({ page: pageA }).withTags(["wcag2a", "wcag2aa", "best-practice"]).disableRules(["color-contrast"]).exclude("#__next-route-announcer__").analyze();
      for (const violation of results.violations) {
        if (violation.impact !== "serious" && violation.impact !== "critical") continue;
        findings.push(`${path}: ${violation.id} (${violation.impact}) ${violation.nodes.map((node) => node.target.join(" ")).slice(0, 3).join(" | ")}`);
      }
      for (const problem of await iconOnlyWithoutName(pageA)) findings.push(`${path}: unnamed control ${problem}`);
      for (const problem of await smallTargets(pageA)) findings.push(`${path}: small target ${problem}`);
    }
    expect(findings).toEqual([]);
  });

  test("the guided tour is a labelled dialog that closes with Escape", async ({ browser, userA, baseURL }) => {
    // A context of its own: the describe's beforeEach marks the tours as seen.
    const fresh = await browser.newContext();
    await fresh.addCookies([{ name: "compa_test_session", value: userA.authUserId, url: baseURL ?? "http://localhost:3902" }]);
    const page = await fresh.newPage();
    await page.goto("/home");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("aria-label", /.+/);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await fresh.close();
  });
});
