import { acceptedConnection } from "../helpers/db";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// 07 Conexiones: the real list, type filters, search, the event chip, the empty state, each row opens the right person.
test.describe("Conexiones", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("empty state when there are no connections", async ({ pageA }) => {
    await pageA.goto("/connections");
    await expect(pageA.getByRole("heading", { name: "Conexiones" })).toBeVisible();
    await expect(pageA.getByText("Todavía no tienes conexiones. Escanea a la primera persona que conozcas.")).toBeVisible();
  });

  test("lists real people, filters by type and opens the right person", async ({ pageA, world, userA, userB }) => {
    const carla = await world.addPerson({ name: "Carla Ríos" });
    const dani = await world.addPerson({ name: "Dani Mora" });
    const past = await world.addEvent({ startsAt: new Date(Date.now() - 48 * 3_600_000), endsAt: new Date(Date.now() - 40 * 3_600_000), name: "Meetup pasado" });
    await acceptedConnection(world, userA, userB, "new", ["IA", "Fintech"]);
    await acceptedConnection(world, carla, userA, "reconnection", ["Proptech"]);
    // Three reconnections with Dani across events make a friend.
    await acceptedConnection(world, userA, dani, "reconnection", [], new Date(Date.now() - 3_600_000));
    await acceptedConnection(world, dani, userA, "reconnection", [], new Date(Date.now() - 47 * 3_600_000), past);
    const older = await world.addEvent({ startsAt: new Date(Date.now() - 96 * 3_600_000), endsAt: new Date(Date.now() - 90 * 3_600_000) });
    await acceptedConnection(world, userA, dani, "reconnection", [], new Date(Date.now() - 95 * 3_600_000), older);

    await pageA.goto("/connections");
    const rows = pageA.locator("main a[href^='/people/']");
    await expect(rows).toHaveCount(3);
    await expect(pageA.getByRole("link", { name: /Bruno Díaz/ })).toHaveAttribute("href", `/people/${userB.handle}`);
    await expect(pageA.getByRole("link", { name: /IA · Fintech/ })).toBeVisible();

    const filters = pageA.getByRole("group", { name: "Filtrar por tipo" });
    await filters.getByRole("button", { name: "Nuevas" }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Bruno Díaz");
    await filters.getByRole("button", { name: "Reencuentros" }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Carla Ríos");
    await filters.getByRole("button", { name: "Amigos" }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Dani Mora");
    await filters.getByRole("button", { name: "Todas" }).click();
    await expect(rows).toHaveCount(3);

    await rows.filter({ hasText: "Carla Ríos" }).click();
    await expect(pageA).toHaveURL(`/people/${carla.handle}`);
    await expect(pageA.getByRole("heading", { name: "Carla Ríos" })).toBeVisible();
  });

  test("the search button filters by name and the event chip narrows to tonight", async ({ pageA, world, userA, userB }) => {
    const past = await world.addEvent({ startsAt: new Date(Date.now() - 48 * 3_600_000), endsAt: new Date(Date.now() - 40 * 3_600_000) });
    const elena = await world.addPerson({ name: "Elena Núñez", checkIn: false });
    await acceptedConnection(world, userA, userB, "new");
    await acceptedConnection(world, userA, elena, "new", [], new Date(Date.now() - 47 * 3_600_000), past);
    await pageA.goto("/connections");
    const rows = pageA.locator("main a[href^='/people/']");
    await expect(rows).toHaveCount(2);

    const search = pageA.getByRole("button", { name: "Buscar en mis conexiones" });
    await expect(search).toHaveAttribute("aria-expanded", "false");
    await search.click();
    await expect(search).toHaveAttribute("aria-expanded", "true");
    const box = pageA.getByRole("searchbox", { name: "Buscar en mis conexiones" });
    await box.fill("nunez");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Elena Núñez");
    await box.fill("zzz");
    await expect(pageA.getByText("Ninguna conexión coincide.")).toBeVisible();
    await box.fill("");
    await expect(rows).toHaveCount(2);

    const chip = pageA.getByRole("button", { name: world.event.name });
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Bruno Díaz");
    await chip.click();
    await expect(rows).toHaveCount(2);
  });
});
