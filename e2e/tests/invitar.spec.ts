import type { BrowserContext } from "@playwright/test";
import { allowLinkedIn } from "../helpers/auth";
import { connectionsBetween, eventPoints, inviteRow, sql, type TestUser } from "../helpers/db";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// Records navigator.share calls so the share buttons can be asserted without a share sheet.
async function recordShares(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const calls: unknown[] = [];
    (window as unknown as { __shares: unknown[] }).__shares = calls;
    Object.defineProperty(navigator, "share", { value: async (data: unknown) => void calls.push(data), configurable: true });
  });
}

// 12 Invitar: the link, the share buttons, and a friend who enters with the link and connects (+100 / +50).
test.describe("Invitar", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("Copiar leaves the real link in the clipboard; WhatsApp, Instagram and Más share it", async ({ pageA, userA, context, baseURL }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await recordShares(context);
    await pageA.goto("/invite");
    const url = `${baseURL}/i/${userA.handle}`;
    await expect(pageA.getByText(url.replace(/^https?:\/\//, ""))).toBeVisible();
    await expect(pageA.getByText("0 de 3")).toBeVisible();
    await expect(pageA.getByRole("link", { name: "Cerrar" })).toHaveAttribute("href", "/home");
    await expect(pageA.getByRole("link", { name: "Mostrar mi QR de invitación" })).toHaveAttribute("href", "/connect");

    await pageA.getByRole("button", { name: "Copiar" }).click();
    await expect(pageA.getByRole("button", { name: "Copiado" })).toBeVisible();
    expect(await pageA.evaluate(() => navigator.clipboard.readText())).toBe(url);

    const popup = pageA.waitForEvent("popup");
    await pageA.getByRole("button", { name: "WhatsApp" }).click();
    const shareWindow = await popup;
    // wa.me redirects to api.whatsapp.com; either way the text carries the link.
    expect(shareWindow.url()).toMatch(/whatsapp\.com|wa\.me/);
    expect(decodeURIComponent(shareWindow.url().replace(/\+/g, " "))).toContain(url);
    await shareWindow.close();

    await pageA.getByRole("button", { name: "Instagram" }).click();
    await pageA.getByRole("button", { name: "Más" }).click();
    const shares = await pageA.evaluate(() => (window as unknown as { __shares: { url?: string; text?: string }[] }).__shares);
    expect(shares).toHaveLength(2);
    expect(shares[0]?.url).toBe(url);
    expect(shares[1]?.text).toContain(url);
  });

  test("a friend who enters with the link and makes a first connection pays +100 and +50", async ({ pageA, pageB, world, userA, userB, browser, contextB }) => {
    await skipTours(contextB);
    await pageA.goto("/invite");
    await expect(pageA.getByText("0 de 3")).toBeVisible();
    const code = userA.handle;

    // The friend signs in through the invite link, lands on the profile with the invite, then enters the event.
    const friendContext = await browser.newContext();
    await skipTours(friendContext);
    const friend = await friendContext.newPage();
    await friend.goto(`/i/${code}`);
    await expect(friend).toHaveTitle("LinkedIn de prueba");
    // A distinct LinkedIn account per run: the test sign-in maps the same email to the same person, like LinkedIn would.
    await allowLinkedIn(friend, { name: "Fede Invitado", headline: "Dev", company: "Volta", city: "Querétaro", email: `fede-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@volta.mx` });
    await expect(friend).toHaveURL(`/onboarding/profile?invite=${code}`);
    await expect(friend.getByLabel("Nombre")).toHaveValue("Fede Invitado");
    const handle = await friend.evaluate(async () => ((await (await fetch("/api/me")).json()) as { handle: string }).handle);
    const [row] = await sql()<{ id: string; auth_user_id: string }[]>`select id, auth_user_id from users where handle = ${handle}`;
    if (!row) throw new Error("friend not created");
    const fede: TestUser = { id: row.id, authUserId: row.auth_user_id, handle, name: "Fede Invitado", headline: "Dev", company: "Volta", city: "Querétaro", email: null };
    world.people.push(fede);
    expect((await inviteRow(code))?.inviteeId).toBe(fede.id);

    await friend.goto(`/e/${world.event.accessCode}/join`);
    await friend.getByRole("button", { name: "Aceptar y entrar" }).click();
    await expect(friend).toHaveURL("/home");

    // Fede scans Bruno; Bruno accepts: Fede 50 (new) + 50 (invitee), Ana 100 (inviter), Bruno 50.
    await friend.goto(`/connect/${userB.handle}`);
    await friend.getByRole("button", { name: "Confirmar · +50 pts" }).click();
    await expect(friend.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    const [request] = await connectionsBetween(fede, userB);
    if (!request) throw new Error("no request");
    await pageB.goto(`/requests/${request.id}`);
    await pageB.getByRole("button", { name: "Aceptar" }).click();
    await expect(pageB).toHaveURL(`/connections/${request.id}/done`);

    expect(await eventPoints(userA, world.event)).toBe(100);
    expect(await eventPoints(fede, world.event)).toBe(100);
    expect(await eventPoints(userB, world.event)).toBe(50);
    expect((await inviteRow(code))?.firstConnectionAt).not.toBeNull();

    // The slots advance for the inviter, on the invite screen and on home.
    await pageA.goto("/invite");
    await expect(pageA.getByText("1 de 3")).toBeVisible();
    await expect(pageA.getByText("Fede")).toBeVisible();
    // The prize text says +100 pts; the filled slot repeats it under Fede.
    await expect(pageA.getByText("+100 pts", { exact: true })).toHaveCount(2);
    await expect(pageA.getByText("Amigo 2")).toBeVisible();
    await pageA.goto("/home");
    await expect(pageA.getByText("faltan 2")).toBeVisible();
    // Ana has the +100 but no connection of her own yet: home still nudges her to the first scan.
    await expect(pageA.getByText("Tu primera conexión te mete al ranking")).toBeVisible();
    await friendContext.close();
  });
});
