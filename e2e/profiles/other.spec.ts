// 08 PerfilOtro (F-40): another person's card filtered by our relation (stranger, pending, peer), hidden links never
// shown, and unknown handles. The profile copy is Spanish-only, so both locales assert lib/copy/es.
import { ids, valeriaProfile } from "../../lib/api/examples";
import { UserProfile } from "../../lib/api/schemas";
import { BADGE_IDS } from "../../lib/badges/catalog";
import { common, networks, person } from "../../lib/copy/es";
import { formatPoints } from "../../lib/format";
import { acceptedConnection, call, expect, expectApiError, expectNotFound, sendRequest, skipTours, test } from "./helpers";

const valeria = valeriaProfile.card;

// Public LinkedIn, Instagram for connections only, GitHub for nobody; the generated links are blanked so the test owns them all.
const OWNER = {
  links: { linkedin: "https://www.linkedin.com/in/compa-owner", instagram: "https://www.instagram.com/compa.owner", github: "https://github.com/compa-owner", x: "", whatsapp: "", web: "" },
  visibility: { links: { linkedin: "public", instagram: "connections", github: "hidden" } },
} as const;

test.describe("another person in mock mode", () => {
  test.beforeEach(async ({ page }) => skipTours(page));

  test("a peer's card shows who they are, our numbers and their links @mock", async ({ page }) => {
    await page.goto(`/people/${valeria.handle}`);
    await expect(page.getByRole("heading", { name: valeria.name })).toBeVisible();
    await expect(page.getByText(`${valeria.headline} · ${valeria.company}`)).toBeVisible();
    await expect(page.getByText(person.connected, { exact: true })).toBeVisible();
    const scores = valeriaProfile.scores?.event;
    await expect(page.getByRole("link", { name: person.pointsRank(formatPoints("es", scores?.points ?? 0), scores?.rank ?? null) })).toHaveAttribute("href", "/ranking");
    for (const [key, url] of Object.entries(valeria.links ?? {})) {
      await expect(page.getByRole("link", { name: person.linkLabel(networks[key as keyof typeof networks], valeria.name) })).toHaveAttribute("href", url);
    }
    await expect(page.getByText(person.linksLocked)).toHaveCount(0);
    for (const label of [person.reconnections, person.eventsTogether, person.mutual]) await expect(page.getByText(label, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(person.badges) })).toHaveAttribute("href", `/me/badges?of=${valeria.handle}`);
    await expect(page.getByText(person.badgesCount(valeriaProfile.badges?.length ?? 0, BADGE_IDS.length))).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(person.lastTime) })).toHaveAttribute("href", `/connections/${ids.connection}/note`);
    await expect(page.getByRole("link", { name: new RegExp(person.mutualConnections) })).toHaveAttribute("href", "/connections");
    await expect(page.getByRole("link", { name: common.back })).toHaveAttribute("href", "/connections");
  });

  test("the last-time row opens the note and the badges card opens their badges @mock", async ({ page }) => {
    await page.goto(`/people/${valeria.handle}`);
    await page.getByRole("link", { name: new RegExp(person.lastTime) }).click();
    await expect(page).toHaveURL(new RegExp(`/connections/${ids.connection}/note$`));
    await page.goto(`/people/${valeria.handle}`);
    await page.getByRole("link", { name: new RegExp(person.badges) }).click();
    await expect(page).toHaveURL(new RegExp(`/me/badges\\?of=${valeria.handle}$`));
    await expect(page.getByRole("link", { name: common.back })).toHaveAttribute("href", `/people/${valeria.handle}`);
  });

  test("an unknown handle is not found @mock", async ({ page, mock }) => {
    await mock.mockServerError("user_not_found");
    await page.goto("/people/nobody-here");
    await expectNotFound(page);
  });
});

test.describe("another person in real mode", () => {
  test("a stranger sees public links only, a pending requester sees Pendiente @real", async ({ people }) => {
    const [owner, stranger] = await people([OWNER, {}]);
    if (!owner || !stranger) throw new Error("test users not created");
    const label = (network: keyof typeof networks) => person.linkLabel(networks[network], owner.user.name);
    await stranger.page.goto(`/people/${owner.user.handle}`);
    await expect(stranger.page.getByText(person.notConnected, { exact: true })).toBeVisible();
    await expect(stranger.page.getByRole("link", { name: label("linkedin") })).toHaveAttribute("href", OWNER.links.linkedin);
    await expect(stranger.page.getByRole("link", { name: label("instagram") })).toHaveCount(0);
    await expect(stranger.page.getByRole("link", { name: label("github") })).toHaveCount(0);
    await expect(stranger.page.getByText(person.linksLocked)).toBeVisible();
    const card = (await call(stranger.page.request, "GET", `/api/users/${owner.user.handle}`, UserProfile)).card;
    expect(Object.keys(card.links ?? {})).toEqual(["linkedin"]);

    await sendRequest(stranger, owner.user);
    await stranger.page.reload();
    await expect(stranger.page.getByText(person.pending, { exact: true })).toBeVisible();
    await expect(stranger.page.getByRole("link", { name: label("instagram") })).toHaveCount(0);
  });

  test("a peer sees connections links but never the hidden one @real", async ({ people }) => {
    const [owner, peer] = await people([OWNER, {}]);
    if (!owner || !peer) throw new Error("test users not created");
    await acceptedConnection(peer, owner);
    const label = (network: keyof typeof networks) => person.linkLabel(networks[network], owner.user.name);
    await peer.page.goto(`/people/${owner.user.handle}`);
    await expect(peer.page.getByText(person.connected, { exact: true })).toBeVisible();
    await expect(peer.page.getByRole("link", { name: label("linkedin") })).toBeVisible();
    await expect(peer.page.getByRole("link", { name: label("instagram") })).toHaveAttribute("href", OWNER.links.instagram);
    await expect(peer.page.getByRole("link", { name: label("github") })).toHaveCount(0);
    await expect(peer.page.getByText(person.linksLocked)).toHaveCount(0);
    await expect(peer.page.getByText(person.eventsTogether, { exact: true })).toBeVisible();
    const profile = await call(peer.page.request, "GET", `/api/users/${owner.user.handle}`, UserProfile);
    expect(Object.keys(profile.card.links ?? {}).sort()).toEqual(["instagram", "linkedin"]);
    expect(profile.connection?.status).toBe("accepted");
    expect(profile.relationship?.eventsTogether).toBe(1);
  });

  test("an unknown handle is not found on screen and in the API @real", async ({ people }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    await ana.page.goto("/people/nobody-with-this-handle");
    await expectNotFound(ana.page);
    await expectApiError(await ana.page.request.get("/api/users/nobody-with-this-handle"), 404, "user_not_found");
  });
});
