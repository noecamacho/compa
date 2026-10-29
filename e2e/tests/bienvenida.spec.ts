import { allowLinkedIn } from "../helpers/auth";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// Welcome: the landing (/) and the event door (/e/<code>), the LinkedIn entry and its cancel path.
test.describe("Bienvenida", () => {
  test("the door button changes text and destination with the session", async ({ page, world, userA, signIn, context }) => {
    await page.goto(`/e/${world.event.accessCode}`);
    const signedOut = page.getByRole("link", { name: "Entrar con LinkedIn" });
    await expect(signedOut).toBeVisible();
    await expect(signedOut).toHaveAttribute("href", `/auth/linkedin?next=${encodeURIComponent(`/e/${world.event.accessCode}/join`)}`);
    await expect(page.getByRole("link", { name: "Ver la pantalla en vivo" })).toHaveAttribute("href", `/e/${world.event.accessCode}/live`);

    await signIn(context, userA);
    // Not checked in yet (the fixture checks in; undo it through the door is not possible), so use a fresh person.
    const fresh = await world.addPerson({ name: "Carla Nueva", checkIn: false });
    await signIn(context, fresh);
    await page.goto(`/e/${world.event.accessCode}`);
    const signedIn = page.getByRole("link", { name: "Entrar al evento" });
    await expect(signedIn).toBeVisible();
    await expect(signedIn).toHaveAttribute("href", `/e/${world.event.accessCode}/join`);
  });

  test("LinkedIn sign-in brings name, headline, company and city into the profile", async ({ page, world, context }) => {
    await skipTours(context);
    await page.goto(`/e/${world.event.accessCode}`);
    await page.getByRole("link", { name: "Entrar con LinkedIn" }).click();
    await expect(page).toHaveTitle("LinkedIn de prueba");
    // A distinct account per run: the test sign-in maps one email to one person, so parallel viewports must not share it.
    await allowLinkedIn(page, { name: "Lucía Fernández", headline: "Head of Product", company: "Nido", city: "Ciudad de México", email: `lucia-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@nido.mx` });

    await expect(page).toHaveURL(`/e/${world.event.accessCode}/join`);
    await expect(page.getByRole("heading", { name: "Antes de entrar" })).toBeVisible();
    await page.getByRole("button", { name: "Aceptar y entrar" }).click();
    await expect(page).toHaveURL("/home");
    await expect(page.getByText("Hola, Lucía")).toBeVisible();

    await page.goto("/onboarding/profile");
    await expect(page.getByLabel("Nombre")).toHaveValue("Lucía Fernández");
    await expect(page.getByLabel("Puesto")).toHaveValue("Head of Product");
    await expect(page.getByLabel("Empresa")).toHaveValue("Nido");
    await expect(page.getByLabel("Ciudad")).toHaveValue("Ciudad de México");
  });

  test("cancelling LinkedIn leaves no blank screen", async ({ page, world }) => {
    await page.goto(`/e/${world.event.accessCode}`);
    await page.getByRole("link", { name: "Entrar con LinkedIn" }).click();
    await page.getByRole("link", { name: "Cancelar" }).click();
    await expect(page).toHaveURL("/?error=linkedin");
    await expect(page.getByRole("alert")).toHaveText("No pudimos entrar con LinkedIn. Escanea el QR de tu evento otra vez.");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("'Ahora no' at the consent step returns to the door", async ({ page, world, context, signIn }) => {
    const fresh = await world.addPerson({ name: "Diego Puerta", checkIn: false });
    await signIn(context, fresh);
    await page.goto(`/e/${world.event.accessCode}/join`);
    await page.getByRole("link", { name: "Ahora no" }).click();
    await expect(page).toHaveURL(`/e/${world.event.accessCode}`);
    await expect(page.getByRole("heading", { name: world.event.name })).toBeVisible();
  });

  test("a checked-in person gets a way back to the event from the landing", async ({ pageA }) => {
    await pageA.goto("/");
    const back = pageA.getByRole("link", { name: "Volver a mi evento" });
    await expect(back).toHaveAttribute("href", "/home");
    await back.click();
    await expect(pageA).toHaveURL("/home");
  });

  test("an unknown event code shows the not-found door", async ({ page }) => {
    await page.goto("/e/nope12345");
    await expect(page.getByRole("heading", { name: "Este QR no abre ninguna puerta" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir a compa.lol" })).toHaveAttribute("href", "/");
  });
});
