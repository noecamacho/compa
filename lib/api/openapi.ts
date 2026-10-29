// Builds the OpenAPI 3.1 document from the route registry (lib/api/routes.ts).
import { z } from "zod";
import {
  createDocument,
  type ZodOpenApiContentObject,
  type ZodOpenApiObject,
  type ZodOpenApiOperationObject,
  type ZodOpenApiPathsObject,
  type ZodOpenApiRequestBodyObject,
  type ZodOpenApiResponsesObject,
} from "zod-openapi";
import { type ErrorSpec } from "./errors";
import { MOCK_HEADERS } from "./mock-headers";
import { NoBody, type AnyRouteSpec } from "./route-spec";
import { ROUTES } from "./routes";
import { ErrorFields } from "./schemas";

const SESSION = "supabaseSession";

type StatusKey = `${1 | 2 | 3 | 4 | 5}${string}`;
const statusKey = (status: number) => `${status}` as StatusKey;

const DESCRIPTION = `COMPA API. Sign-in is LinkedIn only (Supabase session cookie, set by \`/auth/callback\`).

**Mock mode** (no auth, no database): set \`API_MODE=mock\` on the deployment, or send \`${MOCK_HEADERS.mock}: 1\`, or add \`?mock=1\`.
Responses are the examples in this document. Pick an error with \`${MOCK_HEADERS.error}: <code>\` or \`${MOCK_HEADERS.status}: <status>\`
(also \`?mockError=\` / \`?mockStatus=\`), and a named success example with \`${MOCK_HEADERS.example}: <name>\`.`;

const errorSchema = (codes: string[]) =>
  z.object({
    error: z.object({ code: z.enum(codes as [string, ...string[]]), message: z.string(), fields: ErrorFields.optional() }),
  });

function groupByStatus(errors: readonly ErrorSpec[]): Map<number, ErrorSpec[]> {
  const groups = new Map<number, ErrorSpec[]>();
  for (const error of errors) groups.set(error.status, [...(groups.get(error.status) ?? []), error]);
  return groups;
}

const errorExample = (error: ErrorSpec) => ({
  summary: error.message,
  value: { error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } },
});

function errorResponses(errors: readonly ErrorSpec[]): ZodOpenApiResponsesObject {
  const responses: ZodOpenApiResponsesObject = {};
  for (const [status, group] of groupByStatus(errors)) {
    const examples = Object.fromEntries(group.map((error) => [error.code, errorExample(error)]));
    const content = { "application/json": { schema: errorSchema(group.map((e) => e.code)), examples } };
    responses[statusKey(status)] = { description: group.map((e) => e.code).join(", "), content };
  }
  return responses;
}

function successContent(spec: AnyRouteSpec): ZodOpenApiContentObject | undefined {
  const { schema, example, examples } = spec.success;
  if (!schema || schema === NoBody) return undefined;
  const named = examples ? { default: { summary: "Default", value: example }, ...examples } : undefined;
  return { "application/json": named ? { schema, examples: named } : { schema, example } };
}

function successResponses(spec: AnyRouteSpec): ZodOpenApiResponsesObject {
  const { status, description, redirect, alsoStatus } = spec.success;
  const content = successContent(spec);
  const headers = redirect ? z.object({ Location: z.string().meta({ example: redirect }) }) : undefined;
  const responses: ZodOpenApiResponsesObject = { [statusKey(status)]: { description, content, headers } };
  if (alsoStatus) responses[statusKey(alsoStatus.status)] = { description: alsoStatus.description, content };
  return responses;
}

function requestBody(spec: AnyRouteSpec): ZodOpenApiRequestBodyObject | undefined {
  if (spec.bodyKind === "none") return undefined;
  const type = spec.bodyKind === "multipart" ? "multipart/form-data" : "application/json";
  const example = spec.bodyExample === undefined ? {} : { example: spec.bodyExample };
  return { required: true, content: { [type]: { schema: spec.body, ...example } } };
}

const MOCK_PARAMETERS = (["mock", "error", "status", "example"] as const).map((key) => ({
  $ref: `#/components/parameters/${key}MockHeader`,
}));

function operation(spec: AnyRouteSpec): ZodOpenApiOperationObject {
  return {
    operationId: spec.id,
    summary: spec.summary,
    description: spec.description,
    tags: spec.tags,
    security: spec.auth === "public" ? [] : [{ [SESSION]: [] }],
    "x-compa-auth": spec.auth,
    requestParams: { path: spec.params, query: spec.query },
    parameters: MOCK_PARAMETERS,
    requestBody: requestBody(spec),
    responses: { ...successResponses(spec), ...errorResponses(spec.errors) },
  };
}

function paths(routes: readonly AnyRouteSpec[]): ZodOpenApiPathsObject {
  const result: ZodOpenApiPathsObject = {};
  for (const spec of routes) result[spec.path] = { ...result[spec.path], [spec.method]: operation(spec) };
  return result;
}

const headerParameter = (name: string, description: string, example: string) => ({
  name,
  in: "header" as const,
  required: false,
  description,
  schema: { type: "string" as const },
  example,
});

const components: ZodOpenApiObject["components"] = {
  securitySchemes: {
    [SESSION]: {
      type: "apiKey",
      in: "cookie",
      name: "sb-<project-ref>-auth-token",
      description: "Supabase Auth session cookie set by `/auth/callback` (LinkedIn OIDC). Same-origin fetch sends it.",
    },
  },
  parameters: {
    mockMockHeader: headerParameter(MOCK_HEADERS.mock, "`1` serves the documented example; no auth or database.", "1"),
    errorMockHeader: headerParameter(MOCK_HEADERS.error, "With mock mode: return this documented error code.", "not_pending"),
    statusMockHeader: headerParameter(MOCK_HEADERS.status, "With mock mode: return the first documented error with this status.", "409"),
    exampleMockHeader: headerParameter(MOCK_HEADERS.example, "With mock mode: return this named success example.", "fallback"),
  },
};

export function buildOpenApiDocument(routes: readonly AnyRouteSpec[] = ROUTES) {
  return createDocument({
    openapi: "3.1.0",
    info: { title: "COMPA API", version: "0.1.0", description: DESCRIPTION },
    servers: [{ url: "/", description: "This deployment" }],
    security: [{ [SESSION]: [] }],
    tags: [
      { name: "auth" },
      { name: "profile" },
      { name: "events" },
      { name: "connections" },
      { name: "live", description: "Public big screen (A5, A6)" },
      { name: "summaries", description: "AI summaries (M18, A9)" },
    ],
    paths: paths(routes),
    components,
  });
}
