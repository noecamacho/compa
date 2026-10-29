import "server-only";

// The public origin links are built with: NEXT_PUBLIC_SITE_URL (https://compa.lol in production), else the request's own.
export const siteOrigin = (req: Request): string => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(req.url).origin;
