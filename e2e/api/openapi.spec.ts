// The served API reference: /api/openapi.json is a well-formed OpenAPI 3.1 document that lists every route of
// lib/api/routes.ts with its success and error responses, and /api/docs renders it. Same in every mode.
import { z } from "zod";
import { expect, test } from "../fixtures";
import { label, ONCE_REASON, ROUTES, runsOnce } from "./helpers";

const Operation = z.object({
  operationId: z.string(),
  summary: z.string().min(1),
  tags: z.array(z.string()).min(1),
  responses: z.record(z.string(), z.object({ description: z.string() }).passthrough()),
});
const Document = z.object({
  openapi: z.string().regex(/^3\.1\./),
  info: z.object({ title: z.string().min(1), version: z.string().min(1) }),
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
  components: z.object({ schemas: z.record(z.string(), z.unknown()).optional() }).passthrough(),
});

const METHODS = new Set(["get", "post", "put", "patch", "delete"]);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

// Every "$ref" string anywhere in the document.
function refsIn(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(refsIn);
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => (key === "$ref" && typeof child === "string" ? [child] : refsIn(child)));
}

function resolves(document: unknown, ref: string): boolean {
  if (!ref.startsWith("#/")) return false;
  let node: unknown = document;
  for (const part of ref.slice(2).split("/")) {
    if (!isRecord(node)) return false;
    node = node[part];
  }
  return node !== undefined;
}

test.describe("API reference", () => {
  test.beforeEach(({}, testInfo) => test.skip(!runsOnce(testInfo), ONCE_REASON));

  test("GET /api/openapi.json lists every route with its responses", async ({ request }) => {
    const response = await request.get("/api/openapi.json");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    const raw: unknown = await response.json();
    const document = Document.parse(raw);

    const served = Object.entries(document.paths).flatMap(([path, item]) => Object.keys(item).filter((key) => METHODS.has(key)).map((method) => `${method} ${path}`));
    expect(served.sort()).toEqual(ROUTES.map((spec) => `${spec.method} ${spec.path}`).sort());

    for (const spec of ROUTES) {
      const operation = Operation.parse(document.paths[spec.path]?.[spec.method]);
      expect(operation.operationId, label(spec)).toBe(spec.id);
      const statuses = Object.keys(operation.responses);
      const documented = [spec.success.status, ...(spec.success.alsoStatus ? [spec.success.alsoStatus.status] : []), ...spec.errors.map((error) => error.status)];
      expect(statuses.sort(), label(spec)).toEqual([...new Set(documented.map(String))].sort());
      const errorText = JSON.stringify(Object.fromEntries(Object.entries(operation.responses).filter(([status]) => Number(status) >= 400)));
      for (const error of spec.errors) expect(errorText, `${label(spec)} documents ${error.code}`).toContain(`"${error.code}"`);
    }

    expect(new Set(served).size).toBe(ROUTES.length);
    const broken = refsIn(raw).filter((ref) => !resolves(raw, ref));
    expect(broken).toEqual([]);
  });

  test("GET /api/docs serves the reference page that reads the document", async ({ request }) => {
    const response = await request.get("/api/docs");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("<title>COMPA API</title>");
    expect(html).toContain('url: "/api/openapi.json"');
  });

  test("GET /api/health answers with its documented shape and no caching", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.headers()["cache-control"]).toContain("no-store");
    const body = z.object({ status: z.enum(["ok", "degraded"]), db: z.enum(["ok", "down"]), ms: z.number().nonnegative() }).parse(await response.json());
    // 200 only with the database answering; 503 otherwise (a mock server may run without one).
    expect(response.status()).toBe(body.db === "ok" ? 200 : 503);
    expect(body.status).toBe(body.db === "ok" ? "ok" : "degraded");
  });
});
