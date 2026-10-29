import { acceptedConnection, eventPoints, pendingRequest } from "../helpers/db";
import { dock, skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// 03 Inicio and 03b InicioVacio: empty and normal states, backend numbers, every card navigates, the dock marks the active tab.
test.describe("Inicio", () => {
  test("empty state with 0 connections points to the first scan", async ({ pageA, context }) => {
    await skipTours(context);
    await pageA.goto("/home");
    await expect(pageA.getByText("Hola, Ana")).toBeVisible();
    await expect(pageA.getByText("Empieza aquí")).toBeVisible();
    await expect(pageA.getByText("Escanea a la primera persona que conozcas")).toBeVisible();
    const rankRow = pageA.getByRole("link", { name: /Tu primera conexión te mete al ranking/ });
    await expect(rankRow).toHaveAttribute("href", "/connect");
    await expect(pageA.getByText("0", { exact: true }).first()).toBeVisible();
    await expect(pageA.getByText("faltan 3")).toBeVisible();
  });

  test("normal state shows backend counters, pairs and my ranking row", async ({ pageA, world, userA, userB }) => {
    const carla = await world.addPerson({ name: "Carla Ríos", headline: "CEO", company: "Pagalo", city: "Guadalajara" });
    await acceptedConnection(world, userA, userB, "new", ["IA"]);
    await acceptedConnection(world, carla, userB, "reconnection");
    await pageA.goto("/home");
    await expect(pageA.getByText("conexiones esta noche")).toBeVisible();
    await expect(pageA.locator("text=/^2$/").first()).toBeVisible();
    const pairs = pageA.getByRole("img", { name: "Conexiones que están pasando ahora" });
    await expect(pairs.getByText("Ana y Bruno")).toBeVisible();
    await expect(pairs.getByText("Carla y Bruno")).toBeVisible();
    const points = await eventPoints(userA, world.event);
    expect(points).toBe(50);
    // A and Carla tie on 50; Bruno leads with 70. A's rank comes from the backend ordering (points, connections, check-in).
    const rankRow = pageA.getByRole("link", { name: /Vas en el #\d+ con 50 pts/ });
    await expect(rankRow).toHaveAttribute("href", "/ranking");
    await expect(pageA.getByText("Empieza aquí")).toHaveCount(0);
  });

  test("every card navigates where it should", async ({ pageA, context }) => {
    await skipTours(context);
    await pageA.goto("/home");
    await expect(pageA.getByRole("link", { name: /Hola, Ana/ })).toHaveAttribute("href", "/me");
    await expect(pageA.getByRole("link", { name: /Conectar Muestra tu QR|Conectar Escanea/ })).toHaveAttribute("href", "/connect");
    await expect(pageA.getByRole("link", { name: /Invita 3 y gana la gorra dorada/ })).toHaveAttribute("href", "/invite");
    await expect(pageA.getByRole("link", { name: "Avisos" })).toHaveAttribute("href", "/connections");
    await pageA.getByRole("link", { name: /Invita 3 y gana la gorra dorada/ }).click();
    await expect(pageA).toHaveURL("/invite");
    await pageA.goBack();
    await pageA.getByRole("link", { name: /Conectar Muestra tu QR|Conectar Escanea/ }).click();
    await expect(pageA).toHaveURL("/connect");
  });

  test("the bell opens the first pending request and shows the count", async ({ pageA, world, userA, userB, context }) => {
    await skipTours(context);
    const id = await pendingRequest(world, userB, userA);
    await pageA.goto("/home");
    const bell = pageA.getByRole("link", { name: "Avisos, 1 nuevos" });
    await expect(bell).toHaveAttribute("href", `/requests/${id}`);
    const card = pageA.getByRole("link", { name: /Bruno quiere conectar contigo/ });
    await expect(card).toHaveAttribute("href", `/requests/${id}`);
    await card.click();
    await expect(pageA).toHaveURL(`/requests/${id}`);
  });

  test("a request that arrives while on Inicio shows up without a reload", async ({ pageA, world, userA, userB, context }) => {
    await skipTours(context);
    await pageA.goto("/home");
    await expect(pageA.getByRole("link", { name: "Avisos" })).toBeVisible();
    await pendingRequest(world, userB, userA);
    await expect(pageA.getByRole("link", { name: /Bruno quiere conectar contigo/ })).toBeVisible({ timeout: 10_000 });
  });

  test("the dock navigates and marks the active tab", async ({ pageA, context }) => {
    await skipTours(context);
    await pageA.goto("/home");
    const bar = dock(pageA);
    await expect(bar.getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
    for (const [label, path] of [
      ["Conectar", "/connect"],
      ["Conexiones", "/connections"],
      ["Perfil", "/me"],
      ["Inicio", "/home"],
    ] as const) {
      await bar.getByRole("link", { name: label }).click();
      await expect(pageA).toHaveURL(path);
      await expect(bar.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
      await expect(bar.locator("a[aria-current=\"page\"]")).toHaveCount(1);
    }
  });

  test("the guided tour runs once and can be skipped or walked through", async ({ pageA }) => {
    await pageA.goto("/home");
    const dialog = pageA.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("1 de 4")).toBeVisible();
    await dialog.getByRole("button", { name: "Siguiente" }).click();
    await expect(dialog.getByText("2 de 4")).toBeVisible();
    await dialog.getByRole("button", { name: "Atrás" }).click();
    await expect(dialog.getByText("1 de 4")).toBeVisible();
    await dialog.getByRole("button", { name: "Saltar" }).click();
    await expect(dialog).toHaveCount(0);
    await pageA.reload();
    await expect(pageA.getByText("Hola, Ana")).toBeVisible();
    await expect(pageA.getByRole("dialog")).toHaveCount(0);
    await pageA.goto("/home?tour=1");
    await expect(pageA.getByRole("dialog")).toBeVisible();
    for (let step = 0; step < 4; step++) {
      const last = step === 3;
      await pageA.getByRole("dialog").getByRole("button", { name: last ? "¡Entendido!" : "Siguiente" }).click();
    }
    await expect(pageA.getByRole("dialog")).toHaveCount(0);
    await expect(pageA).toHaveURL("/home");
  });
});
