import type { Locator } from "@playwright/test";
import { acceptedConnection, connectionsBetween, eventPoints, pendingRequest, sql, userRow } from "../helpers/db";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// Two taps in a row, the second without waiting (a disabled or gone button simply gets no second tap).
// Playwright's double-click action is one press with clickCount 2, so it would not run the handler twice.
async function tapTwice(locator: Locator): Promise<void> {
  await locator.click();
  await locator.click({ force: true, noWaitAfter: true, timeout: 1_000 }).catch(() => undefined);
}

// A fast double tap on every main button never duplicates connections, points or requests.
test.describe("Doble tap", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("Confirmar twice sends one request", async ({ pageA, userA, userB }) => {
    await pageA.goto(`/connect/${userB.handle}`);
    await tapTwice(pageA.getByRole("button", { name: "Confirmar · +50 pts" }));
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    expect(await connectionsBetween(userA, userB)).toHaveLength(1);
    // Registering the same person again lands on the same request, not a second one.
    await pageA.goto(`/connect/${userB.handle}`);
    await pageA.getByRole("button", { name: /Confirmar/ }).click();
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    expect(await connectionsBetween(userA, userB)).toHaveLength(1);
  });

  test("Aceptar twice pays once", async ({ pageB, world, userA, userB, contextB }) => {
    await skipTours(contextB);
    const id = await pendingRequest(world, userA, userB, ["IA"]);
    await pageB.goto(`/requests/${id}`);
    await tapTwice(pageB.getByRole("button", { name: "Aceptar" }));
    await expect(pageB).toHaveURL(`/connections/${id}/done`);
    expect(await eventPoints(userA, world.event)).toBe(55);
    expect(await eventPoints(userB, world.event)).toBe(50);
    const bonus = await sql()<{ n: number }[]>`select count(*)::int as n from bonus_points where ref_id = ${id}`;
    expect(bonus[0]?.n).toBe(1);
  });

  test("Guardar on the note twice pays +15 once", async ({ pageA, world, userA, userB }) => {
    const id = await acceptedConnection(world, userA, userB, "new");
    await pageA.goto(`/connections/${id}/note`);
    await pageA.getByRole("textbox").fill("Hablamos de su ronda.");
    await pageA.getByRole("button", { name: "Resumir" }).click();
    await tapTwice(pageA.getByRole("button", { name: "Guardar en la conexión" }));
    await expect(pageA).toHaveURL(`/people/${userB.handle}`);
    expect(await eventPoints(userA, world.event)).toBe(65);
    const approved = await sql()<{ n: number }[]>`select count(*)::int as n from interactions where connection_id = ${id} and approved_at is not null`;
    expect(approved[0]?.n).toBe(1);
  });

  test("saving the profile and the monito twice writes once and moves on", async ({ pageA, userA }) => {
    await pageA.goto("/onboarding/profile");
    await expect(pageA.locator("form[data-restored]")).toBeVisible();
    await pageA.getByLabel("Puesto").fill("Doble");
    await tapTwice(pageA.getByRole("button", { name: "Siguiente: tu monito" }));
    await expect(pageA).toHaveURL("/onboarding/monito");
    expect((await userRow(userA)).headline).toBe("Doble");
    await expect(pageA.locator("main[data-restored]")).toBeVisible();
    await tapTwice(pageA.getByRole("button", { name: "Listo, entrar" }));
    await expect(pageA).toHaveURL("/home");
  });

  test("a network toggle tapped twice ends where it started", async ({ pageA, userA }) => {
    await pageA.goto("/me");
    const toggle = pageA.getByRole("group", { name: "Redes que compartes" }).getByRole("button", { name: "X" });
    await tapTwice(toggle);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => ((await userRow(userA)).visibility as { links: Record<string, string> }).links.x).toBe("connections");
  });
});
