// API contract in mock mode, generated from lib/api/routes.ts: every operation serves its documented examples
// (valid against its response schema) and every documented error with its status and the error envelope.
import type { APIRequestContext } from "@playwright/test";
import type { ErrorSpec } from "../../lib/api/errors";
import { MOCK_HEADERS } from "../../lib/api/mock-headers";
import type { AnyRouteSpec } from "../../lib/api/route-spec";
import { expect, test } from "../fixtures";
import { call, expectError, expectSuccessBody, label, mockHeaders, ONCE_REASON, ROUTES, runsOnce } from "./helpers";

// JSON round trip: what the documented example looks like on the wire.
const onTheWire = (value: unknown): unknown => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

async function expectExample(request: APIRequestContext, spec: AnyRouteSpec, name?: string) {
  const headers = mockHeaders(name ? { [MOCK_HEADERS.example]: name } : {});
  const response = await call(request, spec, { headers });
  expect(response.status(), `${spec.id} success status`).toBe(spec.success.status);
  expect(response.headers()[MOCK_HEADERS.mock]).toBe("1");
  const { redirect } = spec.success;
  if (redirect) {
    const location = new URL(response.headers().location ?? "", "http://x");
    expect(`${location.pathname}${location.search}`).toBe(redirect);
    return;
  }
  const body = await expectSuccessBody(spec, response);
  const documented = name ? spec.success.examples?.[name]?.value : spec.success.example;
  expect(body).toEqual(onTheWire(documented));
}

async function expectMockError(request: APIRequestContext, spec: AnyRouteSpec, error: ErrorSpec) {
  const response = await call(request, spec, { headers: mockHeaders({ [MOCK_HEADERS.error]: error.code }) });
  const body = await expectError(response, error.status, error.code);
  expect(body.error.message).toBe(error.message);
  expect(body.error.fields).toEqual(error.fields);
}

async function expectMockStatus(request: APIRequestContext, spec: AnyRouteSpec, status: number) {
  const first = spec.errors.find((error) => error.status === status);
  if (!first) throw new Error(`${spec.id} documents no ${status}`);
  await expectError(await call(request, spec, { headers: mockHeaders({ [MOCK_HEADERS.status]: `${status}` }) }), status, first.code);
}

test.describe("API contract, mock mode", () => {
  test.beforeEach(({}, testInfo) => test.skip(!runsOnce(testInfo), ONCE_REASON));

  test("the registry has one route per method and path @mock", () => {
    const keys = ROUTES.map((spec) => `${spec.method} ${spec.path}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(ROUTES.map((spec) => spec.id)).size).toBe(ROUTES.length);
  });

  for (const spec of ROUTES) {
    test(`${label(spec)} serves its examples and documented errors @mock`, async ({ request }) => {
      await test.step(`success ${spec.success.status} with the documented example`, () => expectExample(request, spec));
      for (const name of Object.keys(spec.success.examples ?? {})) {
        await test.step(`named example "${name}"`, () => expectExample(request, spec, name));
      }
      for (const error of spec.errors) {
        await test.step(`${error.status} ${error.code}`, () => expectMockError(request, spec, error));
      }
      for (const status of new Set(spec.errors.map((error) => error.status))) {
        await test.step(`x-compa-mock-status ${status} serves the first error with that status`, () => expectMockStatus(request, spec, status));
      }
      await test.step("an undocumented error answers 400 mock_error_unknown", async () => {
        const response = await call(request, spec, { headers: mockHeaders({ [MOCK_HEADERS.error]: "no_such_error" }) });
        await expectError(response, 400, "mock_error_unknown");
      });
    });
  }
});
