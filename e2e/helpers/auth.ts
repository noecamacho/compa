// Sign-in for the suite: a session cookie for a person the database already holds (fast path, every spec), or the
// stand-in LinkedIn page the app serves with COMPA_TEST_AUTH=1 (bienvenida.spec exercises the real entry flow).
import type { BrowserContext, Page } from "@playwright/test";
import type { TestUser } from "./db";

export const SESSION_COOKIE = "compa_test_session";

export async function loginAs(context: BrowserContext, user: TestUser, baseURL: string): Promise<void> {
  await context.addCookies([{ name: SESSION_COOKIE, value: user.authUserId, url: baseURL }]);
}

export async function logout(context: BrowserContext): Promise<void> {
  await context.clearCookies({ name: SESSION_COOKIE });
}

export type LinkedInProfile = { name: string; headline?: string; company?: string; city?: string; email?: string };

// Fills the stand-in LinkedIn consent page already open on `page` and allows.
export async function allowLinkedIn(page: Page, profile: LinkedInProfile): Promise<void> {
  await page.getByLabel("Nombre").fill(profile.name);
  if (profile.headline !== undefined) await page.getByLabel("Puesto").fill(profile.headline);
  if (profile.company !== undefined) await page.getByLabel("Empresa").fill(profile.company);
  if (profile.city !== undefined) await page.getByLabel("Ciudad").fill(profile.city);
  if (profile.email !== undefined) await page.getByLabel("Correo").fill(profile.email);
  await page.getByRole("button", { name: "Permitir" }).click();
}
