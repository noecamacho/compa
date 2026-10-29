import { allowLinkedIn } from "../helpers/auth";
import { connectionsBetween, eventPoints, lifetimePoints, sql, type TestUser } from "../helpers/db";
import { skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// Every action of the points table (design/compa-v2/README.md "Puntos"), each checked against the exact total.
test.describe("Puntos", () => {
  test.beforeEach(async ({ context, contextB }) => {
    await skipTours(context);
    await skipTours(contextB);
  });

  test("new +50, topics +5, note +15, reconnection +20, accepted by both", async ({ pageA, pageB, world, userA, userB }) => {
    // Nueva with topics: A asks, B accepts → A 55 (50 + 5 topics), B 50.
    await pageA.goto(`/connect/${userB.handle}`);
    await pageA.getByRole("button", { name: "IA", exact: true }).click();
    await pageA.getByRole("button", { name: "Confirmar · +55 pts" }).click();
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    const [first] = await connectionsBetween(userA, userB);
    if (!first) throw new Error("no request");
    await pageB.goto(`/requests/${first.id}`);
    await pageB.getByRole("button", { name: "Aceptar" }).click();
    await expect(pageB).toHaveURL(`/connections/${first.id}/done`);
    expect(await eventPoints(userA, world.event)).toBe(55);
    expect(await eventPoints(userB, world.event)).toBe(50);

    // Note +15 to its author only.
    await pageA.goto(`/connections/${first.id}/note`);
    await pageA.getByRole("textbox").fill("Hablamos de IA y de su ronda.");
    await pageA.getByRole("button", { name: "Resumir" }).click();
    await pageA.getByRole("button", { name: "Guardar en la conexión" }).click();
    await expect(pageA).toHaveURL(`/people/${userB.handle}`);
    expect(await eventPoints(userA, world.event)).toBe(70);
    expect(await eventPoints(userB, world.event)).toBe(50);
    await pageA.goto(`/connections/${first.id}/done`);
    await expect(pageA.getByText("+70 pts")).toBeVisible();

    // Reconnection at a later event: +20 to both, no topics.
    const later = await world.addEvent({ startsAt: new Date(Date.now() - 1_800_000), endsAt: new Date(Date.now() + 6 * 3_600_000), name: "Afterparty" });
    for (const person of [userA, userB]) await sql()`insert into event_attendees (event_id, user_id, screen_consent_at) values (${later.id}, ${person.id}, now())`;
    await pageB.goto(`/connect/${userA.handle}`);
    await expect(pageB.getByText("Ya se conocían")).toBeVisible();
    await pageB.getByRole("button", { name: "Confirmar · +20 pts" }).click();
    await expect(pageB.getByRole("heading", { name: "Solicitud enviada a Ana" })).toBeVisible();
    const second = (await connectionsBetween(userA, userB)).find((row) => row.status === "pending");
    if (!second) throw new Error("no second request");
    await pageA.goto(`/requests/${second.id}`);
    await pageA.getByRole("button", { name: "Aceptar" }).click();
    await expect(pageA.getByRole("heading", { name: "Reencuentro con Bruno" })).toBeVisible();
    expect(await eventPoints(userA, later)).toBe(20);
    expect(await eventPoints(userB, later)).toBe(20);
    expect(await lifetimePoints(userA)).toBe(90);
    expect(await lifetimePoints(userB)).toBe(70);
  });

  test("an invited friend's first connection pays +100 to the inviter and +50 to the friend", async ({ pageA, pageB, world, userA, userB, browser }) => {
    await pageA.goto("/invite");
    await expect(pageA.getByText("0 de 3")).toBeVisible();
    const friendContext = await browser.newContext();
    await skipTours(friendContext);
    const friend = await friendContext.newPage();
    await friend.goto(`/i/${userA.handle}`);
    await allowLinkedIn(friend, { name: "Gaby Invitada", email: `gaby-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@mail.mx` });
    await expect(friend).toHaveURL(`/onboarding/profile?invite=${userA.handle}`);
    const handle = await friend.evaluate(async () => ((await (await fetch("/api/me")).json()) as { handle: string }).handle);
    const [row] = await sql()<{ id: string; auth_user_id: string }[]>`select id, auth_user_id from users where handle = ${handle}`;
    if (!row) throw new Error("friend not created");
    const gaby: TestUser = { id: row.id, authUserId: row.auth_user_id, handle, name: "Gaby Invitada", headline: null, company: null, city: null, email: null };
    world.people.push(gaby);
    await friend.goto(`/e/${world.event.accessCode}/join`);
    await friend.getByRole("button", { name: "Aceptar y entrar" }).click();
    await expect(friend).toHaveURL("/home");
    await friend.goto(`/connect/${userB.handle}`);
    await friend.getByRole("button", { name: "Confirmar · +50 pts" }).click();
    await expect(friend.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    const [request] = await connectionsBetween(gaby, userB);
    if (!request) throw new Error("no request");
    await pageB.goto(`/requests/${request.id}`);
    await pageB.getByRole("button", { name: "Aceptar" }).click();
    await expect(pageB).toHaveURL(`/connections/${request.id}/done`);
    expect(await eventPoints(userA, world.event)).toBe(100);
    expect(await eventPoints(gaby, world.event)).toBe(100);
    expect(await eventPoints(userB, world.event)).toBe(50);

    // A second connection of the friend pays no invite bonus again.
    const carla = await world.addPerson({ name: "Carla Ríos" });
    await friend.goto(`/connect/${carla.handle}`);
    await friend.getByRole("button", { name: "Confirmar · +50 pts" }).click();
    await expect(friend.getByRole("heading", { name: "Solicitud enviada a Carla" })).toBeVisible();
    const [toCarla] = await connectionsBetween(gaby, carla);
    await sql()`update connections set status = 'accepted', kind = 'new', points = 50, responded_at = now() where id = ${toCarla?.id ?? ""}`;
    await friend.goto("/home");
    expect(await eventPoints(userA, world.event)).toBe(100);
    await friendContext.close();
  });
});
