import { describe, expect, test } from "bun:test";
import type { z } from "zod";
import { buildOpenApiDocument } from "./openapi";
import { isAdminAuth, NoBody } from "./route-spec";
import { ROUTES } from "./routes";

const NOT_IN_CONTRACT = new Set(["/api/openapi.json", "/api/docs"]);

// app/api/e/[code]/route.ts → /api/e/{code}
const toOpenApiPath = (file: string) =>
  `/${file}`.replace(/^\/app/, "").replace(/\/route\.ts$/, "").replace(/\[([^\]]+)\]/g, "{$1}");

async function routeFiles(): Promise<{ path: string; source: string }[]> {
  const files = [...new Bun.Glob("app/**/route.ts").scanSync(".")];
  return Promise.all(files.map(async (file) => ({ path: toOpenApiPath(file), source: await Bun.file(file).text() })));
}

const wiring = (route: { method: string; path: string } | undefined) => (route ? `${route.method} ${route.path}` : "missing");

const document = buildOpenApiDocument();

describe("OpenAPI document", () => {
  test("is OpenAPI 3.1 with the session security scheme", () => {
    expect(document.openapi).toBe("3.1.0");
    expect(document.components?.securitySchemes).toHaveProperty("supabaseSession");
  });

  test("contains every registered route once", () => {
    const operations = ROUTES.map((route) => `${route.method} ${route.path}`);
    expect(new Set(operations).size).toBe(operations.length);
    for (const route of ROUTES) expect(document.paths?.[route.path]).toHaveProperty(route.method);
  });

  test("every route file is in the document, wired to the matching spec", async () => {
    const byId = new Map(ROUTES.map((route) => [route.id, route]));
    for (const { path, source } of await routeFiles()) {
      if (NOT_IN_CONTRACT.has(path)) continue;
      const exports = [...source.matchAll(/export const (GET|POST|PATCH|DELETE) = defineRoute\(routes\.(\w+)/g)];
      expect(exports.length).toBeGreaterThan(0);
      for (const [, method, id] of exports) expect(wiring(byId.get(id ?? ""))).toEqual(`${method?.toLowerCase()} ${path}`);
    }
  });

  test("every registered route has a route file", async () => {
    const paths = new Set((await routeFiles()).map((file) => file.path));
    for (const route of ROUTES) expect(paths).toContain(route.path);
  });

  test("public routes need no session; user routes document 401; admin routes document only 404 (A11)", () => {
    for (const route of ROUTES) {
      const operation = document.paths?.[route.path]?.[route.method];
      if (route.auth === "public") expect(operation?.security).toEqual([]);
      else if (isAdminAuth(route.auth)) {
        expect(operation?.responses?.["401"]).toBeUndefined();
        expect(operation?.responses?.["403"]).toBeUndefined();
        expect(JSON.stringify(operation?.responses?.["404"])).toContain("not_found");
      } else expect(operation?.responses?.["401"]).toBeDefined();
    }
  });

  test("every example matches its schema", () => {
    for (const route of ROUTES) {
      const { schema, example, examples } = route.success;
      if (route.bodyExample !== undefined) expect(route.body.safeParse(route.bodyExample).error).toBeUndefined();
      if (!schema || schema === NoBody) continue;
      const values = [example, ...Object.values(examples ?? {}).map((named) => named.value)];
      for (const value of values) expect((schema as z.ZodType).safeParse(value).error).toBeUndefined();
    }
  });

  test("error codes are documented with examples", () => {
    const accept = document.paths?.["/api/connections/{id}/accept"]?.post?.responses?.["409"];
    expect(JSON.stringify(accept)).toContain("not_pending");
    expect(JSON.stringify(accept)).toContain("event_ended");
  });
});

describe("rate limits (T-036)", () => {
  test("scan, transcribe and draft document 429 rate_limited with Retry-After", () => {
    for (const path of ["/api/connections", "/api/transcribe", "/api/interactions/draft"]) {
      const response = document.paths?.[path]?.post?.responses?.["429"];
      expect(response && "headers" in response ? response.headers : undefined).toHaveProperty("Retry-After");
      expect(response?.description).toContain("rate_limited");
    }
  });
});
