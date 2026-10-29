import { BADGE_IDS, BADGES } from "../../lib/badges/catalog";
import { acceptedConnection, badgesOf, connectionsBetween, grantBadge, pendingRequest } from "../helpers/db";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

const SECRET = ["rey", "speaker", "noctambulo", "cazatalentos"];

// 10 Insignias: all 20, filters, bars with real numbers, secrets without a hint, and earning Primer apretón.
test.describe("Insignias", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("shows the 20 badges with real progress and no hint on the secret ones", async ({ pageA, world, userA, userB }) => {
    const carla = await world.addPerson({ name: "Carla Ríos" });
    await acceptedConnection(world, userB, userA, "new", ["IA", "Fintech"]);
    await acceptedConnection(world, carla, userA, "new", ["Proptech"]);
    await pageA.goto("/me/badges");
    await expect(pageA.getByRole("heading", { name: "Insignias" })).toBeVisible();
    await expect(pageA.getByText("0 de 20 ganadas")).toBeVisible();
    await expect(pageA.getByRole("progressbar", { name: "Insignias ganadas" })).toHaveAttribute("aria-valuenow", "0");
    const tiles = pageA.locator("[data-badge]");
    await expect(tiles).toHaveCount(20);
    for (const id of BADGE_IDS) await expect(pageA.locator(`[data-badge=${id}]`)).toContainText(BADGES[id].name);

    // Real numbers: scanned twice by others, 3 distinct topics, 2 connections tonight.
    await expect(pageA.locator("[data-badge=iman]")).toContainText("2 / 10 te escanearon");
    await expect(pageA.getByRole("progressbar", { name: "Imán" })).toHaveAttribute("aria-valuenow", "2");
    await expect(pageA.locator("[data-badge=curioso]")).toContainText("3 / 10 temas distintos");
    await expect(pageA.locator("[data-badge=maraton]")).toContainText("2 / 15 en una noche");
    await expect(pageA.locator("[data-badge=conector100]")).toContainText("2 / 100 conexiones");
    for (const id of SECRET) {
      await expect(pageA.locator(`[data-badge=${id}]`)).toContainText("Secreta: descúbrela");
      await expect(pageA.locator(`[data-badge=${id}] [role=progressbar]`)).toHaveCount(0);
    }
    await expect(pageA.getByText(/\d+ a punto · 4 secretas/)).toBeVisible();
    await expect(pageA.getByRole("link", { name: "Regresar" })).toHaveAttribute("href", "/me");
  });

  test("the filters split earned and pending", async ({ pageA, world, userA, userB }) => {
    await acceptedConnection(world, userB, userA, "new");
    await grantBadge(userA, "apreton");
    await pageA.goto("/me/badges");
    const filters = pageA.getByRole("group", { name: "Filtrar insignias" });
    await filters.getByRole("button", { name: "Ganadas" }).click();
    await expect(pageA.locator("[data-badge]")).toHaveCount(1);
    await expect(pageA.locator("[data-badge=apreton][data-earned='1']")).toBeVisible();
    await filters.getByRole("button", { name: "Por ganar" }).click();
    await expect(pageA.locator("[data-badge]")).toHaveCount(19);
    await filters.getByRole("button", { name: "Todas" }).click();
    await expect(pageA.locator("[data-badge]")).toHaveCount(20);
  });

  test("earning Primer apretón puts it on my shelf", async ({ pageA, pageB, world, userA, userB, contextB }) => {
    await skipTours(contextB);
    await pageA.goto("/me");
    await expect(pageA.getByText("0 de 20 · ver todas")).toBeVisible();
    const id = await pendingRequest(world, userA, userB, ["IA"]);
    await pageB.goto(`/requests/${id}`);
    await pageB.getByRole("button", { name: "Aceptar" }).click();
    await expect(pageB).toHaveURL(`/connections/${id}/done`);
    expect(await badgesOf(userA)).toContain("apreton");
    expect(await badgesOf(userB)).toContain("apreton");
    expect((await connectionsBetween(userA, userB))[0]?.status).toBe("accepted");

    await pageA.goto("/me");
    const shelf = pageA.getByRole("link", { name: /Insignias/ });
    await expect(shelf.getByText(/[1-9] de 20 · ver todas/)).toBeVisible();
    await expect(shelf.getByRole("img", { name: "Primer apretón" })).toBeVisible();
    await pageA.goto("/me/badges");
    await expect(pageA.locator("[data-badge=apreton][data-earned='1']")).toContainText("Primer apretón");
    await expect(pageA.getByText(/[1-9] de 20 ganadas/)).toBeVisible();
  });
});
