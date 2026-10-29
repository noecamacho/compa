import { badgesOf, connectionsBetween, eventPoints, lifetimePoints, userRow } from "../helpers/db";
import { alertIn, skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// The two-step connection with two browser contexts: A scans B and registers, B sees the request, accepts or declines.
test.describe("Conexión en dos pasos", () => {
  test.beforeEach(async ({ context, contextB }) => {
    await skipTours(context);
    await skipTours(contextB);
  });

  test("B sees A's request with A's data and nobody sees networks before accepting", async ({ pageA, pageB, world, userA, userB }) => {
    // A shares LinkedIn; B shares Instagram. Nothing is visible until B accepts.
    await pageA.goto("/me");
    const linkedin = pageA.getByLabel("LinkedIn", { exact: true }).and(pageA.locator("input"));
    await linkedin.fill("ana-lopez");
    await linkedin.press("Enter");
    await expect(pageA.getByText("Guardado")).toBeVisible();
    await pageB.goto("/me");
    const instagram = pageB.getByLabel("Instagram", { exact: true }).and(pageB.locator("input"));
    await instagram.fill("bruno.diaz");
    await instagram.press("Enter");
    await expect(pageB.getByText("Guardado")).toBeVisible();

    await pageA.goto(`/connect/${userB.handle}`);
    await pageA.getByRole("button", { name: "Fintech", exact: true }).click();
    await pageA.getByRole("button", { name: "Confirmar · +55 pts" }).click();
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    await expect(pageA.getByText("+0 pts")).toBeVisible();
    await expect(pageA.locator("[data-network]")).toHaveCount(0);
    const [request] = await connectionsBetween(userA, userB);
    expect(request?.status).toBe("pending");

    await pageB.goto("/home");
    await pageB.getByRole("link", { name: "Ana quiere conectar contigo Toca para ver quién es y aceptar. Ver" }).click();
    await expect(pageB).toHaveURL(`/requests/${request?.id}`);
    await expect(pageB.getByRole("heading", { name: "Ana quiere conectar contigo" })).toBeVisible();
    await expect(pageB.getByText("Nueva solicitud")).toBeVisible();
    await expect(pageB.getByText(userA.name, { exact: true })).toBeVisible();
    await expect(pageB.getByText("CTO · Tlali · Monterrey")).toBeVisible();
    await expect(pageB.locator("[data-network]")).toHaveCount(0);
    await expect(pageB.getByRole("link", { name: /LinkedIn de Ana/ })).toHaveCount(0);
    await expect(pageA.getByRole("link", { name: /Instagram de Bruno/ })).toHaveCount(0);
    void world;
  });

  test("accepting gives the kind points to both and lists each in the other's connections", async ({ pageA, pageB, world, userA, userB }) => {
    await pageA.goto("/me");
    const linkedin = pageA.getByLabel("LinkedIn", { exact: true }).and(pageA.locator("input"));
    await linkedin.fill("ana-lopez");
    await linkedin.press("Enter");
    await expect(pageA.getByText("Guardado")).toBeVisible();

    await pageA.goto(`/connect/${userB.handle}`);
    await pageA.getByRole("button", { name: "IA", exact: true }).click();
    await pageA.getByRole("button", { name: "Confirmar · +55 pts" }).click();
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    const [request] = await connectionsBetween(userA, userB);
    if (!request) throw new Error("no request");

    await pageB.goto(`/requests/${request.id}`);
    await pageB.getByRole("button", { name: "Aceptar" }).click();
    await expect(pageB).toHaveURL(`/connections/${request.id}/done`);
    await expect(pageB.getByRole("heading", { name: "Conectaste con Ana" })).toBeVisible();
    await expect(pageB.getByText("+50 pts")).toBeVisible();
    // B now sees A's LinkedIn.
    await expect(pageB.getByRole("link", { name: "LinkedIn de Ana" })).toHaveAttribute("href", "https://www.linkedin.com/in/ana-lopez");

    // A's pending confirmation refreshes itself once B answers: kind (+50) plus topics (+5).
    await expect(pageA.getByRole("heading", { name: "Conectaste con Bruno" })).toBeVisible({ timeout: 10_000 });
    await expect(pageA.getByText("+55 pts")).toBeVisible();
    await expect(pageA.getByText("+50 nueva · +5 temas")).toBeVisible();

    expect(await eventPoints(userA, world.event)).toBe(55);
    expect(await eventPoints(userB, world.event)).toBe(50);
    expect(await lifetimePoints(userA)).toBe(55);
    expect(await badgesOf(userA)).toContain("apreton");
    expect(await badgesOf(userB)).toContain("apreton");

    await pageA.goto("/connections");
    await expect(pageA.getByRole("link", { name: /Bruno Díaz/ })).toHaveAttribute("href", `/people/${userB.handle}`);
    await pageB.goto("/connections");
    await expect(pageB.getByRole("link", { name: /Ana López/ })).toHaveAttribute("href", `/people/${userA.handle}`);
  });

  test("'Ahora no' creates no connection and no points", async ({ pageA, pageB, world, userA, userB }) => {
    await pageA.goto(`/connect/${userB.handle}`);
    await pageA.getByRole("button", { name: "Confirmar · +50 pts" }).click();
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    const [request] = await connectionsBetween(userA, userB);
    if (!request) throw new Error("no request");

    await pageB.goto(`/requests/${request.id}`);
    await pageB.getByRole("button", { name: "Ahora no" }).click();
    await expect(pageB).toHaveURL("/home");
    await expect(pageB.getByRole("link", { name: /Ana quiere conectar contigo/ })).toHaveCount(0);

    const [after] = await connectionsBetween(userA, userB);
    expect(after?.status).toBe("declined");
    expect(after?.points).toBeNull();
    expect(await eventPoints(userA, world.event)).toBe(0);
    expect(await eventPoints(userB, world.event)).toBe(0);
    await pageB.goto("/connections");
    await expect(pageB.getByText("Todavía no tienes conexiones. Escanea a la primera persona que conozcas.")).toBeVisible();
    // The requester is not told: the request still reads as pending.
    await pageA.reload();
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
  });

  test("a reconnection pays +20 to both and a declined request cannot be accepted later", async ({ pageA, pageB, world, userA, userB }) => {
    await pageA.goto(`/connect/${userB.handle}`);
    await pageA.getByRole("group", { name: "Tipo de conexión" }).getByRole("button", { name: /Reencuentro/ }).click();
    await pageA.getByRole("button", { name: "Confirmar · +20 pts" }).click();
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    const [request] = await connectionsBetween(userA, userB);
    if (!request) throw new Error("no request");
    await pageB.goto(`/requests/${request.id}`);
    await pageB.getByRole("button", { name: "Aceptar" }).click();
    await expect(pageB.getByRole("heading", { name: "Reencuentro con Ana" })).toBeVisible();
    await expect(pageB.getByText("+20 pts")).toBeVisible();
    expect(await eventPoints(userA, world.event)).toBe(20);
    expect(await eventPoints(userB, world.event)).toBe(20);
    expect((await userRow(userA)).id).toBe(userA.id);

    // Answering again is refused in Spanish.
    await pageB.goto(`/requests/${request.id}`);
    await pageB.getByRole("button", { name: "Aceptar" }).click();
    await expect(alertIn(pageB)).toHaveText("Esta solicitud ya fue respondida.");
  });
});
