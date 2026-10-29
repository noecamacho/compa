import { userRow } from "../helpers/db";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// A reload at every onboarding step loses nothing: typed profile data, chosen handles, the monito look, and what was saved.
test.describe("Persistencia", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("reloading on each onboarding step keeps everything", async ({ pageA, userA }) => {
    // Step 1: profile, typed but not saved.
    await pageA.goto("/onboarding/profile");
    await expect(pageA.locator("form[data-restored]")).toBeVisible();
    await pageA.getByLabel("Puesto").fill("Founder");
    await pageA.getByLabel("Empresa").fill("Persistente SA");
    const instagram = pageA.getByLabel("Instagram", { exact: true }).and(pageA.locator("input"));
    await instagram.fill("ana.persiste");
    await pageA.reload();
    await expect(pageA.locator("form[data-restored]")).toBeVisible();
    await expect(pageA.getByLabel("Puesto")).toHaveValue("Founder");
    await expect(pageA.getByLabel("Empresa")).toHaveValue("Persistente SA");
    await expect(instagram).toHaveValue("ana.persiste");
    await pageA.getByRole("button", { name: "Siguiente: tu monito" }).click();
    await expect(pageA).toHaveURL("/onboarding/monito");

    // Saved: a reload of the profile shows the saved values, not a stale draft.
    await pageA.goto("/onboarding/profile");
    await expect(pageA.getByLabel("Empresa")).toHaveValue("Persistente SA");
    expect((await userRow(userA)).company).toBe("Persistente SA");

    // Step 2: monito, chosen but not saved.
    await pageA.goto("/onboarding/monito");
    await expect(pageA.locator("main[data-restored]")).toBeVisible();
    await pageA.getByRole("group", { name: "Camisa" }).getByRole("radio", { name: "Chicle" }).click();
    await pageA.getByRole("group", { name: "Pelo" }).getByRole("radio", { name: "Largo" }).click();
    await expect.poll(() => pageA.evaluate(() => Object.entries(sessionStorage).filter(([key]) => key.startsWith("compa:draft:monito:")).map(([, value]) => value).join(""))).toContain('"hair":"long"');
    await pageA.reload();
    await expect(pageA.locator("main[data-restored]")).toBeVisible();
    await expect(pageA.getByRole("group", { name: "Camisa" }).getByRole("radio", { name: "Chicle" })).toHaveAttribute("aria-checked", "true");
    await expect(pageA.getByRole("group", { name: "Pelo" }).getByRole("radio", { name: "Largo" })).toHaveAttribute("aria-checked", "true");
    await pageA.getByRole("button", { name: "Listo, entrar" }).click();
    await expect(pageA).toHaveURL("/home");

    // Saved: the look is in the database and shows after a reload everywhere.
    const avatar = (await userRow(userA)).avatar as { shirt: string; hair: string };
    expect(avatar.shirt).toBe("#FF8FAB");
    expect(avatar.hair).toBe("long");
    await pageA.reload();
    const look = JSON.parse((await pageA.getByRole("link", { name: /Hola, Ana/ }).getByRole("img").getAttribute("data-look")) ?? "{}") as { shirt: string };
    expect(look.shirt).toBe("#FF8FAB");
  });

  test("a reload mid-connection keeps the request and the sent state", async ({ pageA, userB }) => {
    await pageA.goto(`/connect/${userB.handle}`);
    await pageA.getByRole("button", { name: "Proptech", exact: true }).click();
    await pageA.getByRole("button", { name: "Confirmar · +55 pts" }).click();
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    await pageA.reload();
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    await pageA.goto("/home");
    await pageA.reload();
    await expect(pageA.getByText("Hola, Ana")).toBeVisible();
  });
});
