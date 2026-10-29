import { acceptedConnection, approvedNote, pendingRequest } from "../helpers/db";
import { skipTours, watchConsole } from "../helpers/ui";
import { expect, test } from "../fixtures";

// Every route of the inventory answers, no screen is blank, and the back button of each screen does what it should.
test.describe("Navegación", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("every route responds with content, signed in", async ({ pageA, world, userA, userB }) => {
    const accepted = await acceptedConnection(world, userA, userB, "new", ["IA"]);
    await approvedNote(accepted, userA, "Hablamos de IA.", "IA", ["AI Products"]);
    const carla = await world.addPerson({ name: "Carla Ríos" });
    const pending = await pendingRequest(world, carla, userA);
    const routes: [string, RegExp | string][] = [
      ["/", "Volver a mi evento"],
      [`/e/${world.event.accessCode}`, world.event.name],
      [`/e/${world.event.accessCode}/live`, /EN VIVO/],
      ["/home", "Hola, Ana"],
      ["/onboarding/profile", "Tu perfil"],
      ["/onboarding/monito", "Tu monito"],
      ["/connect", "Conectar"],
      ["/connect?tab=scan", "Apunta a su QR"],
      [`/connect/${userB.handle}`, "Registrar"],
      ["/connections", "Conexiones"],
      [`/connections/${accepted}/done`, "Conectaste con Bruno"],
      [`/connections/${accepted}/note`, "Cuéntale a Compa"],
      ["/me", userA.name],
      ["/me/badges", "Insignias"],
      [`/me/badges?of=${userB.handle}`, "Insignias"],
      [`/people/${userB.handle}`, userB.name],
      ["/ranking", "Top del evento"],
      [`/requests/${pending}`, "Carla quiere conectar contigo"],
      ["/invite", "Invita amigos"],
      [`/u/${userB.handle}`, "Registrar"],
      ["/nada-por-aqui", "Aquí no hay nada"],
      [`/people/nadie-${Date.now()}`, "Aquí no hay nada"],
    ];
    for (const [path, text] of routes) {
      const errors = watchConsole(pageA);
      await pageA.goto(path);
      await expect(pageA.getByText(text).first(), path).toBeVisible();
      expect((await pageA.locator("body").innerText()).trim().length, path).toBeGreaterThan(0);
      expect(errors.filter((record) => record.type === "pageerror"), path).toEqual([]);
    }
  });

  test("signed out, app routes go to the landing and the personal QR goes through LinkedIn", async ({ page, userB, world }) => {
    for (const path of ["/home", "/connect", "/connections", "/me", "/ranking", "/invite", "/onboarding/profile"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await page.goto(`/u/${userB.handle}`);
    await expect(page).toHaveTitle("LinkedIn de prueba");
    await expect(page.locator('input[name="next"]')).toHaveValue(`/connect/${userB.handle}`);
    await page.goto(`/e/${world.event.accessCode}/join`);
    await expect(page).toHaveTitle("LinkedIn de prueba");
    await page.goto("/u/NO-VALID");
    await expect(page).toHaveURL("/");
  });

  test("the back button of every screen goes where expected", async ({ pageA, world, userA, userB }) => {
    const accepted = await acceptedConnection(world, userA, userB, "new");
    const backs: [string, string][] = [
      ["/onboarding/profile", "/"],
      ["/onboarding/profile?from=me", "/me"],
      ["/onboarding/monito", "/onboarding/profile"],
      ["/onboarding/monito?from=me", "/me"],
      [`/connect/${userB.handle}`, "/connect?tab=scan"],
      [`/connections/${accepted}/note`, `/people/${userB.handle}`],
      ["/me/badges", "/me"],
      [`/me/badges?of=${userB.handle}`, `/people/${userB.handle}`],
      [`/people/${userB.handle}`, "/connections"],
      ["/ranking", "/home"],
    ];
    for (const [path, target] of backs) {
      await pageA.goto(path);
      const back = pageA.getByRole("link", { name: "Regresar" });
      await expect(back, path).toHaveAttribute("href", target);
      await back.click();
      await expect(pageA, path).toHaveURL(target);
    }
    for (const path of [`/connections/${accepted}/done`, "/invite"]) {
      await pageA.goto(path);
      await pageA.getByRole("link", { name: "Cerrar" }).click();
      await expect(pageA, path).toHaveURL("/home");
    }
  });

  test("the browser back button returns to the previous screen without a blank page", async ({ pageA }) => {
    await pageA.goto("/home");
    await pageA.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Perfil" }).click();
    await expect(pageA).toHaveURL("/me");
    await pageA.getByRole("link", { name: /Ranking/ }).click();
    await expect(pageA).toHaveURL("/ranking");
    await pageA.goBack();
    await expect(pageA).toHaveURL("/me");
    await expect(pageA.getByRole("link", { name: "Mi QR" })).toBeVisible();
    await pageA.goBack();
    await expect(pageA).toHaveURL("/home");
    await expect(pageA.getByText("Hola, Ana")).toBeVisible();
  });
});
