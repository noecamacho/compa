// One wrapper for every route handler: mock mode, input validation, auth and error mapping.
import { z } from "zod";
import type { UserRow } from "../../db/schema";
import { ApiError, E, errorResponse, toApiError } from "./errors";
import { isMockRequest, mockResponse } from "./mock";
import { automationFrom } from "./automation";
import { isAdminAuth, type Auth, type Handler, type HandlerResult, type ObjectSchema, type RouteSpec } from "./route-spec";

type NextContext = { params: Promise<Record<string, string | string[] | undefined>> } | undefined;
export type RouteHandler = (req: Request, ctx: NextContext) => Promise<Response>;

function invalidInput(error: z.ZodError, where: string): ApiError {
  const { fieldErrors, formErrors } = z.flattenError(error);
  const fields = { ...(fieldErrors as Record<string, string[]>), ...(formErrors.length ? { [where]: formErrors } : {}) };
  return new ApiError(400, E.invalidInput.code, `Invalid ${where}.`, fields);
}

function parse<T extends z.ZodType>(schema: T, value: unknown, where: string): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw invalidInput(result.error, where);
  return result.data;
}

async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, E.invalidInput.code, "The body must be JSON.");
  }
}

async function readBody(spec: { bodyKind: string }, req: Request): Promise<unknown> {
  if (spec.bodyKind === "json") return readJson(req);
  return {};
}

// Loaded lazily so that mock mode and unit tests never import the database or Supabase.
async function resolveUser(auth: Auth, req: Request): Promise<UserRow | null> {
  if (auth === "public") return null;
  if (auth === "automation" && automationFrom(req)) return null;
  const { requireUser, currentUserOrNull } = await import("../server/auth");
  if (auth === "user") return requireUser();
  const { requireSuperAdmin } = await import("./admin-gate");
  return requireSuperAdmin(await currentUserOrNull());
}

// Per-request mocks (header or ?mock=1) would answer admin paths for anyone; they serve admin routes only on a
// mock deployment (API_MODE=mock), so in real mode a stranger always meets the same 404 (A11).
const servesMock = (spec: { auth: Auth }, req: Request): boolean =>
  isMockRequest(req) && (!isAdminAuth(spec.auth) || process.env.API_MODE === "mock");

function toResponse<R extends z.ZodType>(result: HandlerResult<R>, defaultStatus: number): Response {
  if (result instanceof Response) return result;
  const status = result.status ?? defaultStatus;
  if (result.body === undefined) return new Response(null, { status, headers: result.headers });
  return Response.json(result.body, { status, headers: result.headers });
}

function errorToResponse(error: unknown): Response {
  if (error instanceof ApiError) return errorResponse(error);
  console.error("unhandled route error", error);
  return errorResponse(toApiError(E.internal));
}

export function defineRoute<
  P extends ObjectSchema,
  Q extends ObjectSchema,
  B extends z.ZodType,
  R extends z.ZodType,
  A extends Auth,
>(spec: RouteSpec<P, Q, B, R, A>, handler?: Handler<P, Q, B, R, A>): RouteHandler {
  return async (req, ctx) => {
    if (servesMock(spec, req)) return mockResponse(spec, req);
    if (!handler) return errorResponse(toApiError(E.notImplemented));
    try {
      // Next.js passes no params for static paths.
      const params = parse(spec.params, (await ctx?.params) ?? {}, "path");
      const query = parse(spec.query, Object.fromEntries(new URL(req.url).searchParams), "query");
      const user = await resolveUser(spec.auth, req);
      // Multipart handlers validate the request themselves so they can read its File fields.
      const body = spec.bodyKind === "multipart" ? {} : parse(spec.body, await readBody(spec, req), "body");
      const input = { req, params, query, body, user } as Parameters<typeof handler>[0];
      return toResponse(await handler(input), spec.success.status);
    } catch (error) {
      return errorToResponse(error);
    }
  };
}
