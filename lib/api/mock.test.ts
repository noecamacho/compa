import { afterEach, describe, expect, test } from "bun:test";
import { defineRoute } from "./define-route";
import { isMockRequest, mockResponse } from "./mock";
import * as routes from "./routes";

const url = "http://localhost/api/connections/0d9c8b7a-6f5e-4d3c-8b1a-0f9e8d7c6b5a/accept";
const post = (headers: Record<string, string> = {}, query = "") =>
  new Request(`${url}${query}`, { method: "POST", headers });
const ctx = { params: Promise.resolve({ id: "0d9c8b7a-6f5e-4d3c-8b1a-0f9e8d7c6b5a" }) };

afterEach(() => {
  delete process.env.API_MODE;
});

describe("isMockRequest", () => {
  test("env, header or query turns mock mode on", () => {
    expect(isMockRequest(post(), "mock")).toBe(true);
    expect(isMockRequest(post({ "x-compa-mock": "1" }), undefined)).toBe(true);
    expect(isMockRequest(post({}, "?mock=1"), undefined)).toBe(true);
    expect(isMockRequest(post(), undefined)).toBe(false);
  });
});

describe("mockResponse", () => {
  test("serves the registered success example", async () => {
    const response = mockResponse(routes.acceptConnection, post());
    expect(response.status).toBe(200);
    expect(response.headers.get("x-compa-mock")).toBe("1");
    expect(await response.json()).toEqual(routes.acceptConnection.success.example);
  });

  test("serves a named example", async () => {
    const response = mockResponse(routes.acceptConnection, post({ "x-compa-mock-example": "reconnection" }));
    expect(await response.json()).toMatchObject({ kind: "reconnection", points: 20 });
  });

  test("selects an error by code", async () => {
    const response = mockResponse(routes.acceptConnection, post({ "x-compa-mock-error": "event_ended" }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { code: "event_ended", message: "The event has ended; the request expired." } });
  });

  test("selects the first documented error with a status", async () => {
    const response = mockResponse(routes.createConnection, post({}, "?mockStatus=409"));
    expect(response.status).toBe(409);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe("self_connection");
  });

  test("an undocumented error is a 400 that lists the documented ones", async () => {
    const response = mockResponse(routes.getMe, post({ "x-compa-mock-error": "slug_taken" }));
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: { message: string } }).error.message).toContain("401 unauthorized");
  });

  test("204 and redirects have no body", async () => {
    expect(mockResponse(routes.declineConnection, post()).status).toBe(204);
    const redirect = mockResponse(routes.authCallback, new Request("http://localhost/auth/callback"));
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get("location")).toBe("http://localhost/me");
  });
});

describe("defineRoute", () => {
  test("mock mode needs no auth, database or handler", async () => {
    process.env.API_MODE = "mock";
    const response = await defineRoute(routes.acceptConnection)(post(), ctx);
    expect(response.status).toBe(200);
  });

  test("real mode without a handler is 501 not_implemented", async () => {
    const response = await defineRoute(routes.acceptConnection)(post(), ctx);
    expect(response.status).toBe(501);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe("not_implemented");
  });

  test("invalid path params are 400 invalid_input with fields", async () => {
    const handler = async () => ({ body: { rows: [] } });
    const response = await defineRoute(routes.leaderboard, handler)(new Request("http://localhost/x?limit=500"), {
      params: Promise.resolve({ slug: "Not A Slug" }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; fields: Record<string, string[]> } };
    expect(body.error.code).toBe("invalid_input");
    expect(Object.keys(body.error.fields)).toContain("slug");
  });

  test("a public handler gets parsed params and query", async () => {
    const route = defineRoute(routes.leaderboard, async ({ query }) => ({ body: { rows: [] }, headers: { "x-limit": `${query.limit}` } }));
    const response = await route(new Request("http://localhost/x"), { params: Promise.resolve({ slug: "founders-fest" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-limit")).toBe("20");
  });

  test("multipart handlers can read uploaded files", async () => {
    const route = defineRoute({ ...routes.transcribe, auth: "public" as const }, async ({ req }) => {
      const form = await req.formData();
      return { body: { text: form.get("audio") instanceof File ? "received" : "missing" } };
    });
    const form = new FormData();
    form.append("audio", new File(["sound"], "audio.webm", { type: "audio/webm" }));

    const response = await route(new Request("http://localhost/api/transcribe", { method: "POST", body: form }), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "received" });
  });
});
