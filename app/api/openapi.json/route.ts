import { buildOpenApiDocument } from "@/lib/api/openapi";

export const dynamic = "force-static";

export function GET() {
  return Response.json(buildOpenApiDocument());
}
