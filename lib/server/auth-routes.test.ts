import { afterEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("./supabase", () => ({
  createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ data: {}, error: new Error("expired") }) } }),
}));
mock.module("./linkedin", () => ({ upsertLinkedInUser: mock() }));

const { authCallback } = await import("./auth-routes");

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe("authCallback", () => {
  test("uses a provider-neutral error for failed email or LinkedIn sign-ins", async () => {
    const response = await authCallback({
      req: new Request("https://compa.lol/auth/callback?error=access_denied"),
      params: {},
      query: { error: "access_denied" },
      body: {},
      user: null,
    });

    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) throw new Error("Expected a redirect response");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://compa.lol/?error=signin");
  });
});
