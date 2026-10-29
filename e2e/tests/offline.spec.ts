import { acceptedConnection, pendingRequest } from "../helpers/db";
import { alertIn, skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

const BANNER = "Sin conexión. Lo que hagas se guardará cuando vuelva el internet.";

// With the network off, every screen shows a clear state (the offline strip) and every action ends in a message, never a spinner.
test.describe("Offline", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("every screen shows the offline strip and hides it when the network returns", async ({ pageA, context, world, userA, userB }) => {
    const accepted = await acceptedConnection(world, userA, userB, "new");
    const carla = await world.addPerson({ name: "Carla Ríos" });
    const pending = await pendingRequest(world, carla, userA);
    const screens = ["/home", "/connect", "/connect?tab=scan", `/connect/${userB.handle}`, "/connections", `/connections/${accepted}/done`, `/connections/${accepted}/note`, "/me", "/me/badges", `/people/${userB.handle}`, "/ranking", `/requests/${pending}`, "/invite", "/onboarding/profile", "/onboarding/monito"];
    for (const path of screens) {
      await pageA.goto(path);
      await expect(pageA.getByRole("status", { name: BANNER }).or(pageA.getByText(BANNER)), path).toHaveCount(0);
      await context.setOffline(true);
      await expect(pageA.getByText(BANNER), path).toBeVisible();
      await context.setOffline(false);
      await expect(pageA.getByText(BANNER), path).toHaveCount(0);
    }
  });

  test("actions while offline end in a Spanish message and the button comes back", async ({ pageA, context, world, userA, userB }) => {
    const pending = await pendingRequest(world, userB, userA);
    const message = "Sin conexión. Revisa tu internet e inténtalo otra vez.";

    await pageA.goto("/onboarding/profile");
    await expect(pageA.locator("form[data-restored]")).toBeVisible();
    await context.setOffline(true);
    await pageA.getByLabel("Puesto").fill("Offline");
    await pageA.getByRole("button", { name: "Siguiente: tu monito" }).click();
    await expect(alertIn(pageA)).toHaveText(message);
    await expect(pageA.getByRole("button", { name: "Siguiente: tu monito" })).toBeEnabled();
    await context.setOffline(false);

    await pageA.goto(`/connect/${userB.handle}`);
    await context.setOffline(true);
    await pageA.getByRole("button", { name: "Confirmar · +50 pts" }).click();
    await expect(alertIn(pageA)).toHaveText(message);
    await expect(pageA.getByRole("button", { name: "Confirmar · +50 pts" })).toBeEnabled();
    await context.setOffline(false);

    await pageA.goto(`/requests/${pending}`);
    await context.setOffline(true);
    await pageA.getByRole("button", { name: "Aceptar" }).click();
    await expect(alertIn(pageA)).toHaveText(message);
    await expect(pageA.getByRole("button", { name: "Aceptar" })).toBeEnabled();
    await context.setOffline(false);

    await pageA.goto("/onboarding/monito");
    await expect(pageA.locator("main[data-restored]")).toBeVisible();
    await context.setOffline(true);
    await pageA.getByRole("button", { name: "Listo, entrar" }).click();
    await expect(alertIn(pageA)).toHaveText(message);
    await context.setOffline(false);

    // The scanner's search while offline says it found no one instead of hanging.
    await pageA.goto("/connect?tab=scan");
    await context.setOffline(true);
    const box = pageA.getByRole("searchbox");
    await box.fill("bruno");
    await box.press("Enter");
    await expect(alertIn(pageA)).toHaveText("No encontramos a nadie con ese nombre.");
    await expect(box).not.toHaveAttribute("aria-busy", "true");
    await context.setOffline(false);
  });
});
