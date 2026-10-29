// F-68 on screen: a scan answered 429 shows the rate-limit copy (rate_limited or limit_reached) and stays on the
// register screen. The HTTP side (counts per user, Retry-After) is in e2e/api/contract-real.spec.ts.
import * as X from "../../lib/api/examples";
import { common, register } from "../../lib/copy/es";
import { expect, test } from "../fixtures";
import { skipTours } from "./helpers";

const CASES = [
  { code: "rate_limited", copy: common.rateLimited },
  { code: "limit_reached", copy: common.limitReached },
];

test.describe("rate limits on screen", () => {
  test.beforeEach(({ context }) => skipTours(context));

  for (const { code, copy } of CASES) {
    test(`a scan answered ${code} shows its copy and keeps the form @mock`, async ({ page, mock }) => {
      await page.goto(`/connect/${X.valeriaPublic.handle}`);
      await mock.mockError(code, "**/api/connections");
      const statuses: number[] = [];
      page.on("response", (response) => response.url().endsWith("/api/connections") && statuses.push(response.status()));
      const confirm = page.getByRole("button", { name: new RegExp(`^${register.confirm(0).split(" · ")[0]}`) });
      await confirm.click();
      await expect(page.getByText(copy)).toBeVisible();
      expect(statuses).toContain(429);
      await expect(confirm).toBeEnabled();
      await expect(page).toHaveURL(new RegExp(`/connect/${X.valeriaPublic.handle}$`));
    });
  }
});
