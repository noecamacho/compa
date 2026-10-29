// Home (03 Inicio, 03b InicioVacio): every card and link, the empty and outside-event variants, live polling and the
// guided tour. The home copy is Spanish-only (lib/copy/index.ts), so both locales assert lib/copy/es; the bell is bilingual.
import { connectionList, eventDoor, ids, me, paola } from "../../lib/api/examples";
import { copyFor } from "../../lib/copy";
import { home, tour } from "../../lib/copy/es";
import { firstName, formatHour, formatPoints } from "../../lib/format";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { acceptedConnection, expect, expectErrorScreen, sendRequest, skipTours, test } from "../profiles/helpers";

const bellLabel = (locale: string | undefined, count: number) => copyFor(localeFromAcceptLanguage(locale)).notifications.bellLabel(count);

test.describe("home in mock mode", () => {
  test.beforeEach(async ({ page }) => skipTours(page));

  test("every card shows Diego's night and links to its screen @mock", async ({ page }, testInfo) => {
    await page.goto("/home");
    await expect(page.getByRole("link", { name: home.hello(firstName(me.name)) })).toHaveAttribute("href", "/me");
    await expect(page.getByRole("link", { name: bellLabel(testInfo.project.use.locale, 3) })).toHaveAttribute("href", "/notifications");
    await expect(page.getByRole("link", { name: tour.incoming.title(firstName(paola.name)) })).toHaveAttribute("href", `/requests/${ids.connection3}`);
    await expect(page.getByText(home.until(eventDoor.name, formatHour("es", eventDoor.endsAt)))).toBeVisible();
    await expect(page.getByText(String(eventDoor.counters.connections), { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: home.pairsNow })).toContainText(home.pair("Valeria", "Rodrigo"));
    const [before, rank, after] = home.rank(6, formatPoints("es", 1265));
    await expect(page.getByRole("link", { name: `${before}${rank}${after}` })).toHaveAttribute("href", "/ranking");
    await expect(page.getByRole("link", { name: new RegExp(home.connectHint) })).toHaveAttribute("href", "/connect");
    const invite = page.getByRole("link", { name: new RegExp(home.inviteTitle) });
    await expect(invite).toHaveAttribute("href", "/invite");
    await expect(invite.getByLabel(home.inviteProgress(1, 3))).toBeVisible();
    await expect(invite).toContainText(home.inviteLeft(2));
    await expect(page.getByText(home.startHere)).toHaveCount(0);
  });

  test("the cards navigate: request, ranking, connect, invite, bell and my profile @mock", async ({ page }, testInfo) => {
    const targets: [string | RegExp, RegExp][] = [
      [tour.incoming.title(firstName(paola.name)), new RegExp(`/requests/${ids.connection3}$`)],
      [new RegExp(home.connectHint), /\/connect$/],
      [new RegExp(home.inviteTitle), /\/invite$/],
      [bellLabel(testInfo.project.use.locale, 3), /\/notifications$/],
      [home.hello(firstName(me.name)), /\/me$/],
    ];
    for (const [name, url] of targets) {
      await page.goto("/home");
      await page.getByRole("link", { name }).click();
      await expect(page).toHaveURL(url);
    }
  });

  test("the first night shows the empty variant @mock", async ({ page }) => {
    await page.goto("/home?demo=empty");
    await expect(page.getByText(home.startHere)).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(home.connectHintEmpty) })).toHaveAttribute("href", "/connect");
    // The live card's ranking row turns into a nudge to the first connection.
    await expect(page.getByRole("link", { name: new RegExp(`${home.firstConnection}.*\\+50`) })).toHaveAttribute("href", "/connect");
    await expect(page.getByRole("link", { name: new RegExp(home.inviteTitle) })).toContainText(home.inviteLeft(3));
    await expect(page.getByRole("link", { name: tour.incoming.title(firstName(paola.name)) })).toHaveCount(0);
  });

  test("polling drops an answered request and clears the bell @mock", async ({ page }, testInfo) => {
    await page.goto("/home");
    const request = page.getByRole("link", { name: tour.incoming.title(firstName(paola.name)) });
    await expect(request).toBeVisible();
    await page.route("**/api/connections", (route) => route.fulfill({ json: { ...connectionList, incoming: [] } }));
    await page.route("**/api/notifications", (route) => route.fulfill({ json: { notifications: [], unseenCount: 0 } }));
    await expect(request).toHaveCount(0);
    await expect(page.getByRole("link", { name: bellLabel(testInfo.project.use.locale, 0), exact: true })).toBeVisible();
  });

  test("a failed /api/me shows the error screen @mock", async ({ page, mock }) => {
    await mock.mockServerError("unauthorized");
    await page.goto("/home");
    await expectErrorScreen(page);
  });
});

test.describe("home tour", () => {
  test("opens on the first visit only @mock", async ({ page }) => {
    await page.goto("/home");
    const dialog = page.getByRole("dialog", { name: tour.home[0]?.title });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: tour.skip }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("link", { name: new RegExp(home.connectHint) })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("?tour=1 walks every step forward and back, then finishes @mock", async ({ page }) => {
    await skipTours(page);
    await page.goto("/home?tour=1");
    const total = tour.home.length;
    for (const [index, step] of tour.home.entries()) {
      const dialog = page.getByRole("dialog", { name: step.title });
      await expect(dialog).toContainText(tour.step(index + 1, total));
      await expect(dialog).toContainText(step.body);
      if (index === 1) {
        await dialog.getByRole("button", { name: tour.back }).click();
        await expect(page.getByRole("dialog", { name: tour.home[0]?.title })).toBeVisible();
        await page.getByRole("dialog").getByRole("button", { name: tour.next }).click();
      }
      const last = index === total - 1;
      await page.getByRole("dialog").getByRole("button", { name: last ? tour.done : tour.next }).click();
    }
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/home$/);
  });

  test("Escape closes the tour @mock", async ({ page }) => {
    await skipTours(page);
    await page.goto("/home?tour=1");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("home in real mode", () => {
  test("a newcomer at the test event sees the empty home with the live card @real", async ({ people, testEvent }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    await ana.page.goto("/home");
    await expect(ana.page.getByRole("link", { name: home.hello(firstName(ana.user.name)) })).toBeVisible();
    await expect(ana.page.getByText(new RegExp(`^${testEvent.name} · `))).toBeVisible();
    await expect(ana.page.getByText(home.startHere)).toBeVisible();
    await expect(ana.page.getByRole("link", { name: new RegExp(home.firstConnection) })).toHaveAttribute("href", "/connect");
    await expect(ana.page.getByRole("link", { name: new RegExp(home.inviteTitle) })).toContainText(home.inviteLeft(3));
  });

  test("someone not checked in anywhere sees the outside-event card @real", async ({ people }) => {
    const [ana] = await people([{}], { checkIn: false });
    if (!ana) throw new Error("test user not created");
    await ana.page.goto("/home");
    await expect(ana.page.getByText(home.noEventTitle)).toBeVisible();
    await expect(ana.page.getByText(home.noEventHint)).toBeVisible();
    await expect(ana.page.getByText(home.connectionsTonight)).toHaveCount(0);
  });

  test("a new request appears on the open home within one poll @real", async ({ people }) => {
    const [ana, bruno] = await people([{}, {}]);
    if (!ana || !bruno) throw new Error("test users not created");
    await bruno.page.goto("/home");
    await expect(bruno.page.getByText(home.startHere)).toBeVisible();
    const id = await sendRequest(ana, bruno.user);
    await expect(bruno.page.getByRole("link", { name: tour.incoming.title(firstName(ana.user.name)) })).toHaveAttribute("href", `/requests/${id}`);
  });

  test("after an accepted connection the home ranks me with my points @real", async ({ people }) => {
    const [ana, bruno] = await people([{}, {}]);
    if (!ana || !bruno) throw new Error("test users not created");
    await acceptedConnection(ana, bruno);
    // Rankings are cached per server instance for 3 s (wiki/conference-scale.md): reload until the new points show.
    await expect(async () => {
      await ana.page.goto("/home");
      await expect(ana.page.getByRole("link", { name: /Vas en el #\d+ con 50 pts/ })).toHaveAttribute("href", "/ranking", { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await expect(ana.page.getByText(home.startHere)).toHaveCount(0);
    await expect(ana.page.getByRole("link", { name: new RegExp(home.connectHint) })).toBeVisible();
  });
});
