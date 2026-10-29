// F-25 Simultaneous mutual scans: the unique pair index keeps one connection per event. Routing the second
// scanner to Accept (T-037) is not built; today they land on the pending screen of the same connection.
import { register } from "../../lib/copy/es";
import { expect, test } from "../fixtures";
import { accept, listOf, sendRequest, skipTours } from "../connect/helpers";

test.describe("requests: mutual scans", () => {
  test("A and B scan each other at the same moment: one connection @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    const [first, second] = await Promise.all([sendRequest(ana.page.request, bruno.user.handle), sendRequest(bruno.page.request, ana.user.handle)]);
    expect(first.body.connectionId).toBe(second.body.connectionId);
    expect([first.status, second.status].sort()).toEqual([200, 201]);
    for (const side of [ana, bruno]) {
      const list = await listOf(side.page.request);
      expect(list.people.flatMap((entry) => entry.meetings).map((meeting) => meeting.connectionId)).toEqual([first.body.connectionId]);
    }
  });

  test("B scans A after A's request: same connection, and B can still accept it @real", async ({ twoUsers }) => {
    const [ana, bruno] = twoUsers;
    const { body: sent } = await sendRequest(ana.page.request, bruno.user.handle);
    await skipTours(bruno.context);
    await bruno.page.goto(`/connect/${ana.user.handle}`);
    const answered = bruno.page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/connections"));
    await bruno.page.getByRole("button", { name: register.confirm(50) }).click();
    expect((await answered).status()).toBe(200);
    await expect(bruno.page).toHaveURL(new RegExp(`/connections/${sent.connectionId}/done$`));
    expect((await listOf(bruno.page.request)).incoming.map((item) => item.connectionId)).toEqual([sent.connectionId]);
    expect((await accept(bruno.page.request, sent.connectionId)).status()).toBe(200);
  });
});
