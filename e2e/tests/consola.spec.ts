import { acceptedConnection, approvedNote, connectionsBetween } from "../helpers/db";
import { skipTours, watchConsole } from "../helpers/ui";
import { expect, test } from "../fixtures";

// Zero console errors and warnings, and zero uncaught errors, across the whole journey (page.on('console') / page.on('pageerror')).
test.describe("Consola", () => {
  test.beforeEach(async ({ context, contextB }) => {
    await skipTours(context);
    await skipTours(contextB);
  });

  test("the full journey leaves the console clean", async ({ pageA, pageB, world, userA, userB }) => {
    const recordsA = watchConsole(pageA);
    const recordsB = watchConsole(pageB);

    await pageA.goto(`/e/${world.event.accessCode}`);
    await pageA.goto("/home");
    await pageA.goto("/onboarding/profile");
    await expect(pageA.locator("form[data-restored]")).toBeVisible();
    await pageA.getByLabel("Puesto").fill("CTO");
    const linkedin = pageA.getByLabel("LinkedIn", { exact: true }).and(pageA.locator("input"));
    await linkedin.fill("ana-lopez");
    await pageA.getByRole("button", { name: "Siguiente: tu monito" }).click();
    await expect(pageA).toHaveURL("/onboarding/monito");
    await expect(pageA.locator("main[data-restored]")).toBeVisible();
    await pageA.getByRole("button", { name: "Al azar" }).click();
    await pageA.getByRole("button", { name: "Listo, entrar" }).click();
    await expect(pageA).toHaveURL("/home");

    await pageA.goto("/connect");
    await pageA.getByRole("group", { name: "Modo" }).getByRole("button", { name: "Escanear" }).click();
    const box = pageA.getByRole("searchbox");
    await box.fill("bruno");
    await box.press("Enter");
    await pageA.getByRole("link", { name: `Conectar con ${userB.name}` }).click();
    await pageA.getByRole("button", { name: "IA", exact: true }).click();
    await pageA.getByRole("button", { name: "Confirmar · +55 pts" }).click();
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    const [request] = await connectionsBetween(userA, userB);
    if (!request) throw new Error("no request");

    await pageB.goto("/home");
    await pageB.getByRole("link", { name: /Ana quiere conectar contigo/ }).click();
    await pageB.getByRole("button", { name: "Aceptar" }).click();
    await expect(pageB).toHaveURL(`/connections/${request.id}/done`);
    await expect(pageA.getByRole("heading", { name: "Conectaste con Bruno" })).toBeVisible({ timeout: 10_000 });
    await pageA.getByRole("link", { name: "Listo" }).click();

    await pageA.goto(`/connections/${request.id}/note`);
    await pageA.getByRole("textbox").fill("Hablamos de IA y de su ronda.");
    await pageA.getByRole("button", { name: "Resumir" }).click();
    await pageA.getByRole("button", { name: "Guardar en la conexión" }).click();
    await expect(pageA).toHaveURL(`/people/${userB.handle}`);

    const other = await world.addPerson({ name: "Carla Ríos" });
    const older = await acceptedConnection(world, other, userA, "reconnection");
    await approvedNote(older, other, "Hablamos de proptech.", "Proptech", ["Startups"]);
    for (const path of ["/connections", `/people/${other.handle}`, `/connections/${older}/note`, "/me", "/me/badges", `/me/badges?of=${userB.handle}`, "/ranking", "/invite", `/connections/${request.id}/done`]) {
      await pageA.goto(path);
      await pageA.waitForTimeout(300);
    }
    await pageA.goto("/ranking");
    await pageA.getByRole("group", { name: "Alcance del ranking" }).getByRole("button", { name: "Todo el año" }).click();
    await pageA.goto("/me/badges");
    await pageA.getByRole("group", { name: "Filtrar insignias" }).getByRole("button", { name: "Por ganar" }).click();
    await pageA.goto("/home?tour=1");
    await pageA.getByRole("dialog").getByRole("button", { name: "Saltar" }).click();
    await pageA.waitForTimeout(500);

    expect(recordsA).toEqual([]);
    expect(recordsB).toEqual([]);
  });
});
