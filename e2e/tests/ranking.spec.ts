import { acceptedConnection } from "../helpers/db";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// 11 Ranking: tonight and all-year boards differ, podium and "Tú" come from data, fewer than 3 people never breaks.
test.describe("Ranking", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("tonight and all year load different data; podium, Tú and the gap are computed", async ({ pageA, world, userA, userB }) => {
    const carla = await world.addPerson({ name: "Carla Ríos" });
    const past = await world.addEvent({ startsAt: new Date(Date.now() - 48 * 3_600_000), endsAt: new Date(Date.now() - 40 * 3_600_000) });
    await acceptedConnection(world, userA, userB, "new"); // A 50, B 50
    await acceptedConnection(world, carla, userB, "reconnection"); // Carla 20, B 70
    await acceptedConnection(world, carla, userA, "new", [], new Date(Date.now() - 47 * 3_600_000), past); // lifetime: A 100, Carla 70

    await pageA.goto("/ranking");
    await expect(pageA.getByRole("heading", { name: "Top del evento" })).toBeVisible();
    await expect(pageA.getByRole("link", { name: "Regresar" })).toHaveAttribute("href", "/home");
    const scope = pageA.getByRole("group", { name: "Alcance del ranking" });
    await expect(scope.getByRole("button", { name: "Esta noche" })).toHaveAttribute("aria-pressed", "true");

    // Tonight: Bruno 70, Ana 50, Carla 20.
    await expect(pageA.getByRole("link", { name: `#1 ${userB.name}`, exact: true })).toHaveAttribute("href", `/people/${userB.handle}`);
    await expect(pageA.getByRole("link", { name: `#2 ${userA.name}`, exact: true })).toHaveAttribute("href", `/people/${userA.handle}`);
    await expect(pageA.getByRole("link", { name: `#3 ${carla.name}`, exact: true })).toHaveAttribute("href", `/people/${carla.handle}`);
    await expect(pageA.getByText("Tú · #2")).toBeVisible();
    await expect(pageA.getByText("50 pts · esta noche")).toBeVisible();
    await expect(pageA.getByText("Para pasar a Bruno")).toBeVisible();
    await expect(pageA.getByText("21 pts", { exact: true })).toBeVisible();
    await expect(pageA.getByRole("progressbar", { name: "Para pasar a Bruno" })).toHaveAttribute("aria-valuenow", "71");
    const above = pageA.getByRole("link", { name: /^#1 .*70$/ });
    await expect(above).toHaveAttribute("href", `/people/${userB.handle}`);

    // All year: Ana 100, Bruno 70, Carla 70 (ties broken by connections, then sign-up).
    await scope.getByRole("button", { name: "Todo el año" }).click();
    await expect(pageA.getByRole("link", { name: `#1 ${userA.name}`, exact: true })).toBeVisible();
    await expect(pageA.getByText("Tú · #1")).toBeVisible();
    await expect(pageA.getByText("100 pts · en 2 eventos")).toBeVisible();
    await expect(pageA.getByText("Vas en primer lugar.")).toBeVisible();
    await expect(pageA.getByRole("link", { name: "Conectar ahora" })).toHaveAttribute("href", "/connect");
  });

  test("with fewer than three people nothing breaks", async ({ pageA, world, userA, userB }) => {
    await acceptedConnection(world, userA, userB, "new");
    await pageA.goto("/ranking");
    await expect(pageA.getByRole("link", { name: `#1 ${userA.name}` }).or(pageA.getByRole("link", { name: `#2 ${userA.name}` }))).toBeVisible();
    await expect(pageA.getByText(/Tú · #[12]/)).toBeVisible();
    await expect(pageA.getByRole("link", { name: /^#3 / })).toHaveCount(0);
  });

  test("without points I have no place and the podium is empty", async ({ pageA }) => {
    await pageA.goto("/ranking");
    await expect(pageA.getByText("Tú · sin lugar")).toBeVisible();
    await expect(pageA.getByText("Haz tu primera conexión para entrar al ranking.")).toBeVisible();
    await expect(pageA.getByRole("link", { name: /^#[123] / })).toHaveCount(0);
    await expect(pageA.getByText("Vivo")).toBeVisible();
    await pageA.getByRole("group", { name: "Alcance del ranking" }).getByRole("button", { name: "Todo el año" }).click();
    await expect(pageA.getByText("0 pts · en 1 eventos")).toBeVisible();
  });

  test("the podium opens the person", async ({ pageA, world, userA, userB }) => {
    await acceptedConnection(world, userB, userA, "new");
    await pageA.goto("/ranking");
    await pageA.getByRole("link", { name: `#1 ${userB.name}` }).or(pageA.getByRole("link", { name: `#2 ${userB.name}` })).click();
    await expect(pageA).toHaveURL(`/people/${userB.handle}`);
  });
});
