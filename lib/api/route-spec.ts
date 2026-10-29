import { z } from "zod";
import type { UserRow } from "../../db/schema";
import type { ErrorSpec } from "./errors";
import type { RateLimitRule } from "./rate-limits";

// "admin": super admins only, everyone else gets 404 (A11). "automation": a super admin, or the
// `x-compa-automation` header with TEST_AUTOMATION_SECRET; the handler then gets `user: null`.
export type Auth = "public" | "user" | "admin" | "automation";

export const isAdminAuth = (auth: Auth): boolean => auth === "admin" || auth === "automation";

type UserFor<A extends Auth> = A extends "public" ? null : A extends "automation" ? UserRow | null : UserRow;
export type Method = "get" | "post" | "patch" | "delete";
export type BodyKind = "none" | "json" | "multipart";

export const Empty = z.object({});
// Path and query schemas are objects (zod-openapi `requestParams`).
export type ObjectSchema = z.ZodType<unknown, Record<string, unknown>>;
export const NoBody = z.undefined();
type EmptySchema = typeof Empty;
type NoBodySchema = typeof NoBody;

export type NamedExample<T> = { summary: string; value: T };

export type SuccessSpec<R extends z.ZodType> = {
  status: number;
  description: string;
  schema?: R;
  example?: z.input<R>;
  // Extra named examples; mock mode serves one with `x-compa-mock-example: <name>`.
  examples?: Record<string, NamedExample<z.input<R>>>;
  // A second success status with the same body, e.g. 200 when the resource already existed.
  alsoStatus?: { status: number; description: string };
  // Location the mock returns for a 3xx response.
  redirect?: string;
};

// A per-user limit; `scope` narrows the counter to one resource of the request, e.g. one connection.
export type RouteRateLimit<B extends z.ZodType> = RateLimitRule & { scope?(body: z.output<B>): string };

export type RouteSpec<
  P extends ObjectSchema = EmptySchema,
  Q extends ObjectSchema = EmptySchema,
  B extends z.ZodType = EmptySchema,
  R extends z.ZodType = NoBodySchema,
  A extends Auth = Auth,
> = {
  id: string;
  method: Method;
  // OpenAPI style: /api/e/{code}
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  auth: A;
  params: P;
  query: Q;
  body: B;
  bodyKind: BodyKind;
  bodyExample?: z.input<B>;
  success: SuccessSpec<R>;
  errors: readonly ErrorSpec[];
  // Checked after auth and body validation, before the handler (signed-in users only).
  rateLimit?: readonly RouteRateLimit<B>[];
};

// Loose view of any spec, for code that only reads metadata (OpenAPI builder, mock mode).
export type AnyRouteSpec = RouteSpec<ObjectSchema, ObjectSchema, z.ZodType, z.ZodType, Auth>;

type RouteInput<P extends ObjectSchema, Q extends ObjectSchema, B extends z.ZodType, R extends z.ZodType, A extends Auth> = Omit<
  RouteSpec<P, Q, B, R, A>,
  "params" | "query" | "body" | "bodyKind"
> & { params?: P; query?: Q; body?: B; bodyKind?: BodyKind };

export function route<
  P extends ObjectSchema = EmptySchema,
  Q extends ObjectSchema = EmptySchema,
  B extends z.ZodType = EmptySchema,
  R extends z.ZodType = NoBodySchema,
  A extends Auth = "public",
>(input: RouteInput<P, Q, B, R, A>): RouteSpec<P, Q, B, R, A> {
  return {
    ...input,
    params: input.params ?? (Empty as unknown as P),
    query: input.query ?? (Empty as unknown as Q),
    body: input.body ?? (Empty as unknown as B),
    bodyKind: input.bodyKind ?? (input.body ? "json" : "none"),
  };
}

export type HandlerInput<P extends ObjectSchema, Q extends ObjectSchema, B extends z.ZodType, A extends Auth> = {
  req: Request;
  params: z.output<P>;
  query: z.output<Q>;
  body: z.output<B>;
  user: UserFor<A>;
};

export type HandlerResult<R extends z.ZodType> = Response | { status?: number; body?: z.input<R>; headers?: HeadersInit };

export type Handler<P extends ObjectSchema, Q extends ObjectSchema, B extends z.ZodType, R extends z.ZodType, A extends Auth> = (
  input: HandlerInput<P, Q, B, A>,
) => Promise<HandlerResult<R>>;

// Handler input and result types for one registered route: `InputOf<typeof routes.getMe>`.
export type InputOf<S> =
  S extends RouteSpec<infer P, infer Q, infer B, z.ZodType, infer A> ? HandlerInput<P, Q, B, A> : never;
export type ResultOf<S> = S extends RouteSpec<ObjectSchema, ObjectSchema, z.ZodType, infer R, Auth> ? Promise<HandlerResult<R>> : never;
