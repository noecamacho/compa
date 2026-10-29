// Mock mode: serve the examples registered in the OpenAPI document (lib/api/routes.ts), with no auth or database.
import { ApiError, errorResponse, toApiError, type ErrorSpec } from "./errors";
import { MOCK_HEADERS } from "./mock-headers";
import type { AnyRouteSpec } from "./route-spec";

const MOCK_RESPONSE_HEADERS = { [MOCK_HEADERS.mock]: "1" };

export function isMockRequest(req: Request, apiMode = process.env.API_MODE): boolean {
  if (apiMode === "mock") return true;
  if (req.headers.get(MOCK_HEADERS.mock) === "1") return true;
  return new URL(req.url).searchParams.get("mock") === "1";
}

type MockChoice = { error?: string; status?: string; example?: string };

function readChoice(req: Request): MockChoice {
  const query = new URL(req.url).searchParams;
  const pick = (header: string, param: string) => req.headers.get(header) ?? query.get(param) ?? undefined;
  return {
    error: pick(MOCK_HEADERS.error, "mockError"),
    status: pick(MOCK_HEADERS.status, "mockStatus"),
    example: pick(MOCK_HEADERS.example, "mockExample"),
  };
}

function findError(spec: AnyRouteSpec, choice: MockChoice): ErrorSpec | undefined {
  if (choice.error) return spec.errors.find((error) => error.code === choice.error);
  return spec.errors.find((error) => `${error.status}` === choice.status);
}

const wantsError = (spec: AnyRouteSpec, choice: MockChoice): boolean =>
  Boolean(choice.error) || (Boolean(choice.status) && choice.status !== `${spec.success.status}`);

function unknownMockError(spec: AnyRouteSpec, choice: MockChoice): Response {
  const documented = spec.errors.map((error) => `${error.status} ${error.code}`).join(", ") || "none";
  const asked = choice.error ?? choice.status;
  const error = new ApiError(400, "mock_error_unknown", `${spec.id} documents no error "${asked}". Documented: ${documented}.`);
  return errorResponse(error, MOCK_RESPONSE_HEADERS);
}

function successBody(spec: AnyRouteSpec, exampleName: string | undefined): unknown {
  const named = exampleName ? spec.success.examples?.[exampleName] : undefined;
  return named ? named.value : spec.success.example;
}

function mockSuccess(spec: AnyRouteSpec, req: Request, exampleName: string | undefined): Response {
  const { status, redirect } = spec.success;
  if (redirect) return new Response(null, { status, headers: { ...MOCK_RESPONSE_HEADERS, Location: new URL(redirect, req.url).toString() } });
  const body = successBody(spec, exampleName);
  if (body === undefined) return new Response(null, { status, headers: MOCK_RESPONSE_HEADERS });
  return Response.json(body, { status, headers: MOCK_RESPONSE_HEADERS });
}

export function mockResponse(spec: AnyRouteSpec, req: Request): Response {
  const choice = readChoice(req);
  if (!wantsError(spec, choice)) return mockSuccess(spec, req, choice.example);
  const error = findError(spec, choice);
  if (!error) return unknownMockError(spec, choice);
  return errorResponse(toApiError(error), MOCK_RESPONSE_HEADERS);
}
