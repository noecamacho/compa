import { userRow } from "../helpers/db";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// 02 Perfil: prefilled from LinkedIn, editable, drafts survive reload and going back, saving persists.
test.describe("Perfil", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("fields are prefilled and editable, and saving persists after a reload", async ({ pageA, userA }) => {
    await pageA.goto("/onboarding/profile");
    await expect(pageA.getByLabel("Nombre")).toHaveValue(userA.name);
    await expect(pageA.getByLabel("Puesto")).toHaveValue("CTO");
    await expect(pageA.getByLabel("Empresa")).toHaveValue("Tlali");
    await expect(pageA.getByLabel("Ciudad")).toHaveValue("Monterrey, Nuevo León");

    await pageA.getByLabel("Puesto").fill("CEO");
    await pageA.getByLabel("Empresa").fill("Nido Labs");
    await pageA.getByLabel("Ciudad").fill("Querétaro");
    await pageA.getByRole("button", { name: "Siguiente: tu monito" }).click();
    await expect(pageA).toHaveURL("/onboarding/monito");

    await pageA.goto("/onboarding/profile");
    await pageA.reload();
    await expect(pageA.getByLabel("Puesto")).toHaveValue("CEO");
    await expect(pageA.getByLabel("Empresa")).toHaveValue("Nido Labs");
    await expect(pageA.getByLabel("Ciudad")).toHaveValue("Querétaro");
    const row = await userRow(userA);
    expect(row.headline).toBe("CEO");
    expect(row.company).toBe("Nido Labs");
    expect(row.city).toBe("Querétaro");
  });

  test("what is typed survives a reload before saving", async ({ pageA }) => {
    await pageA.goto("/onboarding/profile");
    await expect(pageA.locator("form[data-restored]")).toBeVisible();
    await pageA.getByLabel("Nombre").fill("Ana Lopez Editada");
    await pageA.getByLabel("Puesto").fill("VP Engineering");
    await pageA.reload();
    await expect(pageA.getByLabel("Nombre")).toHaveValue("Ana Lopez Editada");
    await expect(pageA.getByLabel("Puesto")).toHaveValue("VP Engineering");
  });

  test("going back and returning keeps what was typed", async ({ pageA }) => {
    await pageA.goto("/onboarding/profile");
    await expect(pageA.locator("form[data-restored]")).toBeVisible();
    await pageA.getByLabel("Empresa").fill("Empresa Temporal");
    await pageA.getByRole("link", { name: "Regresar" }).click();
    await expect(pageA).toHaveURL("/");
    await pageA.goBack();
    await expect(pageA).toHaveURL("/onboarding/profile");
    await expect(pageA.getByLabel("Empresa")).toHaveValue("Empresa Temporal");
  });

  test("from my profile the button says Guardar and returns to /me", async ({ pageA }) => {
    await pageA.goto("/onboarding/profile?from=me");
    await expect(pageA.getByRole("link", { name: "Regresar" })).toHaveAttribute("href", "/me");
    await pageA.getByLabel("Ciudad").fill("Mérida");
    await pageA.getByRole("button", { name: "Guardar" }).click();
    await expect(pageA).toHaveURL("/me");
    await expect(pageA.getByText("Mérida")).toBeVisible();
  });

  test("a failed save shows a Spanish error and keeps the form", async ({ pageA }) => {
    await pageA.route("**/api/me", (route) => (route.request().method() === "PATCH" ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "internal_error", message: "Something went wrong." } }) }) : route.continue()));
    await pageA.goto("/onboarding/profile");
    await expect(pageA.locator("form[data-restored]")).toBeVisible();
    await pageA.getByLabel("Puesto").fill("Fundadora");
    await pageA.getByRole("button", { name: "Siguiente: tu monito" }).click();
    await expect(pageA.locator("form").getByRole("alert")).toHaveText("Algo salió mal. Inténtalo otra vez.");
    await expect(pageA.getByLabel("Puesto")).toHaveValue("Fundadora");
    await expect(pageA.getByRole("button", { name: "Siguiente: tu monito" })).toBeEnabled();
  });

  test("the name cannot be saved empty", async ({ pageA }) => {
    await pageA.goto("/onboarding/profile");
    await expect(pageA.locator("form[data-restored]")).toBeVisible();
    await pageA.getByLabel("Nombre").fill("");
    await pageA.getByRole("button", { name: "Siguiente: tu monito" }).click();
    await expect(pageA).toHaveURL("/onboarding/profile");
    await expect(pageA.getByLabel("Nombre")).toBeFocused();
  });
});
