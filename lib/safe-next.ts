// `next` must be a same-site path: "/u/luis" yes; "//evil.com", "https://evil.com" or "/\\evil" no.
export function safeNext(next: string | undefined, fallback = "/me"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
