import { loginAs, logout } from "../helpers/auth";
import { acceptRequest, pendingRequest, userRow } from "../helpers/db";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

type Links = Record<string, string>;

// Section 4: social handles. Typed in the profile and in "my profile", validated, persisted, and shown to the
// other person only for networks that are on and only once the connection is accepted.
test.describe("Redes sociales", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("the profile captures each handle, validates it and persists it", async ({ pageA, userA }) => {
    await pageA.goto("/onboarding/profile");
    const toggles = pageA.getByRole("group", { name: "Redes que compartes" });
    // Default visibility is "connections": all four are on and show their (empty) inputs.
    await expect(toggles.getByRole("button", { name: "Instagram" })).toHaveAttribute("aria-pressed", "true");
    const instagram = pageA.getByLabel("Instagram", { exact: true }).and(pageA.locator("input"));
    const whatsapp = pageA.getByLabel("WhatsApp", { exact: true }).and(pageA.locator("input"));
    const linkedin = pageA.getByLabel("LinkedIn", { exact: true }).and(pageA.locator("input"));
    const x = pageA.getByLabel("X", { exact: true }).and(pageA.locator("input"));

    await instagram.fill("@@ana.lopez");
    await whatsapp.fill("81 1234 5678");
    await pageA.getByRole("button", { name: "Siguiente: tu monito" }).click();
    await expect(pageA.getByText("Solo una @ al inicio.")).toBeVisible();
    await expect(pageA.getByText("Incluye el código de país, por ejemplo +52.")).toBeVisible();
    await expect(pageA).toHaveURL("/onboarding/profile");

    await instagram.fill("@ana.lopez");
    await whatsapp.fill("+52 81 1234 5678");
    await linkedin.fill("https://www.linkedin.com/in/ana-lopez/");
    await x.fill("ana_lopez");
    await pageA.getByRole("button", { name: "Siguiente: tu monito" }).click();
    await expect(pageA).toHaveURL("/onboarding/monito");

    const row = await userRow(userA);
    expect(row.links as Links).toEqual({
      instagram: "https://www.instagram.com/ana.lopez",
      whatsapp: "https://wa.me/528112345678",
      linkedin: "https://www.linkedin.com/in/ana-lopez",
      x: "https://x.com/ana_lopez",
    });

    await pageA.goto("/onboarding/profile");
    await expect(instagram).toHaveValue("ana.lopez");
    await expect(whatsapp).toHaveValue("+528112345678");
    await expect(linkedin).toHaveValue("ana-lopez");
    await expect(x).toHaveValue("ana_lopez");
  });

  test("turning a network off hides its input and stops sharing it", async ({ pageA, userA }) => {
    await pageA.goto("/onboarding/profile");
    await pageA.getByRole("group", { name: "Redes que compartes" }).getByRole("button", { name: "WhatsApp" }).click();
    await expect(pageA.getByLabel("WhatsApp", { exact: true }).and(pageA.locator("input"))).toHaveCount(0);
    await pageA.getByRole("button", { name: "Siguiente: tu monito" }).click();
    await expect(pageA).toHaveURL("/onboarding/monito");
    const row = (await userRow(userA)).visibility as { links: Record<string, string> };
    expect(row.links.whatsapp).toBe("hidden");
    expect(row.links.instagram).toBe("connections");
  });

  test("my profile saves each handle on its own and keeps it across sign-out", async ({ pageA, userA, context, baseURL }) => {
    await pageA.goto("/me");
    const x = pageA.getByLabel("X", { exact: true }).and(pageA.locator("input"));
    await x.fill("ana lopez");
    await x.press("Enter");
    await expect(pageA.getByText("Usa letras, números, punto o guion bajo, sin espacios.")).toBeVisible();
    await x.fill("@analopez");
    await x.press("Enter");
    await expect(pageA.getByText("Guardado")).toBeVisible();
    expect((await userRow(userA)).links).toEqual({ x: "https://x.com/analopez" });

    await pageA.reload();
    await expect(x).toHaveValue("analopez");

    await logout(context);
    await pageA.goto("/me");
    await expect(pageA).toHaveURL("/");
    await loginAs(context, userA, baseURL ?? "http://localhost:3902");
    await pageA.goto("/me");
    await expect(x).toHaveValue("analopez");

    // Turning X off hides the input and the network.
    await pageA.getByRole("group", { name: "Redes que compartes" }).getByRole("button", { name: "X" }).click();
    await expect(x).toHaveCount(0);
    await expect.poll(async () => ((await userRow(userA)).visibility as { links: Record<string, string> }).links.x).toBe("hidden");
  });

  test("the other person sees only the networks that are on, and only once accepted", async ({ world, userA, userB, pageA, pageB, signIn, context }) => {
    // A shares LinkedIn and Instagram; WhatsApp has a value but is off; X is on but empty.
    await pageA.goto("/me");
    const linkedin = pageA.getByLabel("LinkedIn", { exact: true }).and(pageA.locator("input"));
    await linkedin.fill("ana-lopez");
    await linkedin.press("Enter");
    await expect(pageA.getByText("Guardado")).toBeVisible();
    const instagram = pageA.getByLabel("Instagram", { exact: true }).and(pageA.locator("input"));
    await instagram.fill("ana.lopez");
    await instagram.press("Enter");
    await expect(pageA.getByText("Guardado")).toHaveCount(2);
    const whatsapp = pageA.getByLabel("WhatsApp", { exact: true }).and(pageA.locator("input"));
    await whatsapp.fill("+528112345678");
    await whatsapp.press("Enter");
    await expect(pageA.getByText("Guardado")).toHaveCount(3);
    await pageA.getByRole("group", { name: "Redes que compartes" }).getByRole("button", { name: "WhatsApp" }).click();
    await expect.poll(async () => ((await userRow(userA)).visibility as { links: Record<string, string> }).links.whatsapp).toBe("hidden");

    // Pending: B sees no networks of A, and A sees none of B.
    const pending = await pendingRequest(world, userB, userA);
    await pageB.goto(`/connections/${pending}/done`);
    await expect(pageB.getByText("Cuando acepte, verás sus redes aquí.")).toBeVisible();
    await expect(pageB.locator("[data-network]")).toHaveCount(0);
    await pageA.goto(`/people/${userB.handle}`);
    await expect(pageA.locator("[data-network]")).toHaveCount(0);

    // Accepted: the right buttons with the right links, on the confirmation and on A's profile as B sees it.
    await acceptRequest(pending, "new");
    await pageB.goto(`/connections/${pending}/done`);
    const buttons = pageB.locator("[data-network]");
    await expect(buttons).toHaveCount(2);
    await expect(pageB.getByRole("link", { name: "LinkedIn de Ana" })).toHaveAttribute("href", "https://www.linkedin.com/in/ana-lopez");
    await expect(pageB.getByRole("link", { name: "Instagram de Ana" })).toHaveAttribute("href", "https://www.instagram.com/ana.lopez");
    await expect(pageB.locator("[data-network=whatsapp]")).toHaveCount(0);

    await pageB.goto(`/people/${userA.handle}`);
    await expect(pageB.getByRole("link", { name: "LinkedIn de Ana" })).toHaveAttribute("href", "https://www.linkedin.com/in/ana-lopez");
    await expect(pageB.getByRole("link", { name: "Instagram de Ana" })).toHaveAttribute("href", "https://www.instagram.com/ana.lopez");
    await expect(pageB.locator("[data-network]")).toHaveCount(2);

    // Someone not connected with A sees nothing.
    const stranger = await world.addPerson({ name: "Carla Ajena" });
    await signIn(context, stranger);
    await pageA.goto(`/people/${userA.handle}`);
    await expect(pageA.locator("[data-network]")).toHaveCount(0);
  });
});
