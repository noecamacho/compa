import { describe, expect, test } from "bun:test";
import { testSession, testUser } from "../api/admin-examples";
import { parseSetCookie, RealModeError, realModeClient } from "./real-mode";

const SECRET = "z".repeat(40);
const BASE = "http://localhost:3000";

type Seen = { url: string; init?: RequestInit };

function fakeFetch(respond: (seen: Seen) => Response) {
  const calls: Seen[] = [];
  const doFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const seen = { url: String(url), init };
    calls.push(seen);
    return respond(seen);
  }) as typeof fetch;
  return { calls, doFetch };
}

describe("real-mode client", () => {
  test("sends the automation header and reads the created users", async () => {
    const { calls, doFetch } = fakeFetch(() => Response.json({ users: [testUser] }, { status: 201 }));
    const users = await realModeClient({ baseUrl: BASE, secret: SECRET, fetch: doFetch }).createTestUsers({ count: 1, checkInTo: "codex-conf-2026" });
    expect(users[0]?.handle).toBe(testUser.handle);
    expect(calls[0]?.url).toBe(`${BASE}/api/admin/test-users`);
    expect((calls[0]?.init?.headers as Record<string, string>)["x-compa-automation"]).toBe(SECRET);
  });

  test("signInAs keeps the session cookies and drops cleared chunks", async () => {
    const headers = new Headers();
    headers.append("Set-Cookie", "sb-ref-auth-token=base64-abc; Path=/; Max-Age=3600; SameSite=lax; HttpOnly");
    headers.append("Set-Cookie", "sb-ref-auth-token.1=; Path=/; Max-Age=0");
    const { doFetch } = fakeFetch(() => Response.json(testSession, { headers }));
    const session = await realModeClient({ baseUrl: BASE, secret: SECRET, fetch: doFetch }).signInAs({ ...testUser, links: {}, interests: [], currentEvent: null } as never);
    expect(session.cookies.map((cookie) => cookie.name)).toEqual(["sb-ref-auth-token"]);
    expect(session.cookieHeader).toBe("sb-ref-auth-token=base64-abc");
  });

  test("a refusal surfaces the error code, never the secret", async () => {
    const { doFetch } = fakeFetch(() => Response.json({ error: { code: "not_found", message: "Not found." } }, { status: 404 }));
    const error = await realModeClient({ baseUrl: BASE, secret: SECRET, fetch: doFetch })
      .deleteTestUser("8c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e02")
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RealModeError);
    expect((error as RealModeError).code).toBe("not_found");
    expect(String((error as Error).message)).not.toContain(SECRET);
  });

  test("parses cookie attributes", () => {
    const cookie = parseSetCookie("a=b; Path=/x; Secure; HttpOnly; SameSite=None");
    expect(cookie).toMatchObject({ name: "a", value: "b", path: "/x", secure: true, httpOnly: true, sameSite: "None" });
  });
});
