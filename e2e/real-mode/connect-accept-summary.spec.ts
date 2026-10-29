// Skeleton: a real connect → accept → summary run between two fresh test users at Codex Conf 2026.
// Runs once T-000 lands the Playwright harness; needs TEST_AUTOMATION_SECRET and a seeded test event.
import { expect, test } from "../fixtures/real-mode";

test.describe("real mode @real", () => {
  test("two test users connect, accept and approve a summary", async ({ browser, testUsers, signIn }) => {
    const [ana, bruno] = await testUsers(2);
    if (!ana || !bruno) throw new Error("test users not created");

    const anaContext = await browser.newContext();
    const brunoContext = await browser.newContext();
    await signIn(anaContext, ana);
    await signIn(brunoContext, bruno);

    // Ana scans Bruno's personal QR.
    const anaPage = await anaContext.newPage();
    await anaPage.goto(`/u/${bruno.handle}`);
    // TODO(T-000): click the connect button, assert "request sent", then on Bruno's page accept the request
    // (/home incoming card → /requests/<id>), assert "+50" on both sides, then write and approve a note.

    const brunoPage = await brunoContext.newPage();
    await brunoPage.goto("/home");
    await expect(brunoPage).toHaveURL(/\/home/);

    await anaContext.close();
    await brunoContext.close();
  });
});
