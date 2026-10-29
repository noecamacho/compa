import { acceptedConnection, approvedNote, connectionsBetween, grantBadge, pendingRequest } from "../helpers/db";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// 08 PerfilOtro: real data, the badge shelf, relationship numbers, every access navigates, only shared networks.
test.describe("Perfil de otro", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("shows the real person, their badges and the relationship numbers", async ({ pageA, world, userA, userB }) => {
    const carla = await world.addPerson({ name: "Carla Ríos" });
    const past = await world.addEvent({ startsAt: new Date(Date.now() - 48 * 3_600_000), endsAt: new Date(Date.now() - 40 * 3_600_000) });
    await acceptedConnection(world, userA, userB, "new", ["IA"]);
    await acceptedConnection(world, userB, userA, "reconnection", [], new Date(Date.now() - 47 * 3_600_000), past);
    // Carla knows both: one mutual connection.
    await acceptedConnection(world, userA, carla, "new");
    await acceptedConnection(world, userB, carla, "new");
    await grantBadge(userB, "apreton");
    await grantBadge(userB, "madrugador");
    const id = (await connectionsBetween(userA, userB)).find((row) => row.kind === "new")?.id ?? "";
    await approvedNote(id, userA, "Bruno levanta capital.", "Ronda de Kuali", ["Startups"]);

    await pageA.goto(`/people/${userB.handle}`);
    await expect(pageA.getByRole("heading", { name: userB.name })).toBeVisible();
    await expect(pageA.getByText(/Cofounder · Kuali/)).toContainText("Guadalajara");
    await expect(pageA.getByText("Conectados")).toBeVisible();
    await expect(pageA.getByRole("link", { name: "Regresar" })).toHaveAttribute("href", "/connections");
    await expect(pageA.getByRole("link", { name: /pts/ })).toHaveAttribute("href", "/ranking");

    const shelf = pageA.getByRole("link", { name: /Sus insignias/ });
    await expect(shelf).toHaveAttribute("href", `/me/badges?of=${userB.handle}`);
    await expect(shelf.getByText("2 de 20 · ver todas")).toBeVisible();
    await expect(shelf.getByRole("img", { name: "Primer apretón" })).toBeVisible();
    await expect(shelf.getByRole("img", { name: "Madrugador" })).toBeVisible();

    // 1 reconnection, 2 events together, 1 mutual.
    const stats = pageA.locator("main").getByText(/^\d+$/);
    await expect(stats.nth(0)).toHaveText("1");
    await expect(stats.nth(1)).toHaveText("2");
    await expect(stats.nth(2)).toHaveText("1");

    const lastTime = pageA.getByRole("link", { name: /La última vez/ });
    await expect(lastTime).toContainText("Hoy · Ronda de Kuali");
    await expect(lastTime).toHaveAttribute("href", /\/connections\/[0-9a-f-]+\/note$/);
    await expect(pageA.getByRole("link", { name: /Conexiones en común/ })).toHaveAttribute("href", "/connections");

    await shelf.click();
    await expect(pageA).toHaveURL(`/me/badges?of=${userB.handle}`);
    await expect(pageA.getByText("2 de 20 ganadas")).toBeVisible();
    await expect(pageA.locator("[data-badge=apreton][data-earned='1']")).toBeVisible();
    await expect(pageA.locator("[data-badge=iman][data-earned='0']")).toBeVisible();
    await pageA.getByRole("link", { name: "Regresar" }).click();
    await expect(pageA).toHaveURL(`/people/${userB.handle}`);
  });

  test("someone not connected shows as such, without networks or relationship", async ({ pageA, userB }) => {
    await pageA.goto(`/people/${userB.handle}`);
    await expect(pageA.getByText("Sin conectar")).toBeVisible();
    await expect(pageA.locator("[data-network]")).toHaveCount(0);
    await expect(pageA.getByText("reencuentros")).toHaveCount(0);
    await expect(pageA.getByText("0 de 20 · ver todas")).toBeVisible();
  });

  test("a pending request shows as pending", async ({ pageA, world, userA, userB }) => {
    await pendingRequest(world, userA, userB);
    await pageA.goto(`/people/${userB.handle}`);
    await expect(pageA.getByText("Pendiente")).toBeVisible();
  });

  test("only the networks the person turned on appear", async ({ pageA, world, userA, userB, pageB, contextB }) => {
    await skipTours(contextB);
    await acceptedConnection(world, userA, userB, "new");
    await pageB.goto("/me");
    const x = pageB.getByLabel("X", { exact: true }).and(pageB.locator("input"));
    await x.fill("brunodiaz");
    await x.press("Enter");
    await expect(pageB.getByText("Guardado")).toBeVisible();
    const whatsapp = pageB.getByLabel("WhatsApp", { exact: true }).and(pageB.locator("input"));
    await whatsapp.fill("+5213312345678");
    await whatsapp.press("Enter");
    await expect(pageB.getByText("Guardado")).toHaveCount(2);
    await pageB.getByRole("group", { name: "Redes que compartes" }).getByRole("button", { name: "WhatsApp" }).click();
    await expect(pageB.getByLabel("WhatsApp", { exact: true }).and(pageB.locator("input"))).toHaveCount(0);

    await pageA.goto(`/people/${userB.handle}`);
    await expect(pageA.getByRole("link", { name: "X de Bruno" })).toHaveAttribute("href", "https://x.com/brunodiaz");
    await expect(pageA.locator("[data-network]")).toHaveCount(1);
  });
});
