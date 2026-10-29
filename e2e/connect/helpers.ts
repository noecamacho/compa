// Helpers shared by the connect, requests and notifications specs: tours off, typed API calls as the signed-in
// browser context, and a throwaway test event (created as the seeded test admin) for window-dependent cases.
import { expect, type APIRequestContext, type APIResponse, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import type { z } from "zod";
import { TEST_ADMIN_HANDLE } from "../../db/seed-test-event";
import { AddedAttendee, AdminEventBody, type TestUserT } from "../../lib/api/admin-schemas";
import { ConnectionDetail, ConnectionList, ConnectionRequest, CreatedEvent, Notifications } from "../../lib/api/schemas";
import { copyFor, type Dictionary } from "../../lib/copy";
import { connect } from "../../lib/copy/es";
import { localeFromAcceptLanguage } from "../../lib/i18n";
import { asUser, type RealModeClient, type TestSessionCookies } from "../../lib/testing/real-mode";

const TOUR_IDS = ["connect", "home", "me", "ranking", "register"];

// The first-visit tours cover the screen and swallow clicks; mark them seen before any page script runs.
export async function skipTours(context: BrowserContext): Promise<void> {
  await context.addInitScript((ids: string[]) => {
    for (const id of ids) {
      try {
        localStorage.setItem(`compa:tour:${id}`, "done");
      } catch {
        // Blocked storage: the tour shows, the spec will notice.
      }
    }
  }, TOUR_IDS);
}

// The bilingual sections (lib/copy/en.ts) in the project's locale.
export const copyOf = (testInfo: TestInfo): Dictionary => copyFor(localeFromAcceptLanguage(testInfo.project.use.locale));

export async function json<T extends z.ZodType>(response: APIResponse, schema: T): Promise<z.output<T>> {
  return schema.parse(await response.json());
}

export async function errorCode(response: APIResponse): Promise<string | undefined> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== "object" || body === null || !("error" in body)) return undefined;
  const { error } = body;
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

export async function expectError(response: APIResponse, status: number, code: string): Promise<void> {
  expect(response.status(), `expected ${status} ${code}`).toBe(status);
  expect(await errorCode(response)).toBe(code);
}

type RequestOptions = { knew?: boolean; topics?: string[]; screenConsent?: boolean };

// POST /api/connections as the context's user; 201 for a new request, 200 for an existing pair.
export async function sendRequest(request: APIRequestContext, toHandle: string, options: RequestOptions = {}) {
  const { screenConsent = true, ...rest } = options;
  const response = await request.post("/api/connections", { data: { toHandle, ...(screenConsent ? { screenConsent } : {}), ...rest } });
  expect([200, 201], `POST /api/connections answered ${response.status()}`).toContain(response.status());
  return { status: response.status(), body: await json(response, ConnectionRequest) };
}

export async function accept(request: APIRequestContext, connectionId: string, knew?: boolean): Promise<APIResponse> {
  return request.post(`/api/connections/${connectionId}/accept`, { data: knew === undefined ? {} : { knew } });
}

export async function detailOf(request: APIRequestContext, connectionId: string) {
  const response = await request.get(`/api/connections/${connectionId}`);
  expect(response.status()).toBe(200);
  return json(response, ConnectionDetail);
}

export async function listOf(request: APIRequestContext) {
  const response = await request.get("/api/connections");
  expect(response.status()).toBe(200);
  return json(response, ConnectionList);
}

export async function notificationsOf(request: APIRequestContext) {
  const response = await request.get("/api/notifications");
  expect(response.status()).toBe(200);
  return json(response, Notifications);
}

const HOUR_MS = 60 * 60 * 1000;

export type ThrowawayEvent = { slug: string; name: string; startsAt: string };

// A private test event for cases that end or reorder a window, so the shared Codex Conf 2026 is never touched.
export class AdminEvents {
  private constructor(
    private readonly session: TestSessionCookies,
    private readonly baseUrl: string,
    private readonly created: string[] = [],
  ) {}

  static async signIn(realMode: RealModeClient, baseUrl: string): Promise<AdminEvents> {
    const admin = (await realMode.listTestUsers(TEST_ADMIN_HANDLE)).find((user) => user.handle === TEST_ADMIN_HANDLE);
    if (!admin) throw new Error(`@${TEST_ADMIN_HANDLE} is missing: run SEED_TEST_EVENT=1 bun run db:seed`);
    return new AdminEvents(await realMode.signInAs(admin), baseUrl);
  }

  // Running from `startsAgoHours` ago until an hour from now, with the given people checked in (latest check-in wins A2).
  async create(people: TestUserT[], startsAgoHours = 1): Promise<ThrowawayEvent> {
    const slug = `e2e-req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const body = { name: `E2E ${slug}`, slug, startsAt: new Date(now - startsAgoHours * HOUR_MS).toISOString(), endsAt: new Date(now + HOUR_MS).toISOString(), isTest: true };
    const { event } = await this.call("POST", "/api/admin/events", CreatedEvent, body);
    this.created.push(slug);
    for (const person of people) await this.call("POST", `/api/admin/events/${slug}/attendees`, AddedAttendee, { userId: person.id });
    return { slug, name: event.name, startsAt: event.startsAt };
  }

  async startsAt(slug: string): Promise<string> {
    return (await this.call("GET", `/api/admin/events/${slug}`, AdminEventBody)).event.startsAt;
  }

  async end(slug: string): Promise<void> {
    await this.call("POST", `/api/admin/events/${slug}/end`, AdminEventBody);
  }

  // Archived events leave every door, live and leaderboard list; the rows stay (soft delete).
  async archiveAll(): Promise<void> {
    for (const slug of this.created) await this.call("POST", `/api/admin/events/${slug}/archive`, AdminEventBody);
  }

  private call<T extends z.ZodType>(method: string, path: string, schema: T, body?: unknown) {
    return asUser(this.session, { baseUrl: this.baseUrl, method, path, body, schema });
  }
}

// The found-person "Conectar" link; the dock has a "Conectar" tab too, so match the target as well.
export const connectLink = (page: Page) => page.getByRole("link", { name: connect.connectButton }).and(page.locator('a[href^="/connect/"]'));

// notFound() inside a streamed (app) page keeps HTTP 200 (the loading boundary already flushed), so check the page.
export async function expectNotFound(page: Page): Promise<void> {
  await expect(page.getByText("This page could not be found.")).toBeVisible();
}
