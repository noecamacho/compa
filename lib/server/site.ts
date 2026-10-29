import "server-only";
import { headers } from "next/headers";

const configuredOrigin = () => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || null;

// The public origin links are built with: NEXT_PUBLIC_SITE_URL (https://compa.lol in production), else the request's own.
export const siteOrigin = (req: Request): string => configuredOrigin() || new URL(req.url).origin;

// Same rule for server components and handlers without a Request: never fall back to localhost in a shared link.
export async function requestOrigin(): Promise<string> {
  const configured = configuredOrigin();
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://compa.lol";
}
