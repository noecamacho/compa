// A push endpoint is a URL the server will POST to, so it is a server-side request forgery vector: only the browser
// push services are allowed, over https. `extraOrigins` (PUSH_ALLOWED_ORIGINS) admits a local mock push service in e2e.
const PUSH_SERVICE_HOSTS = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"];
const PUSH_SERVICE_SUFFIXES = [".push.apple.com", ".notify.windows.com"];

const isPushServiceHost = (host: string): boolean =>
  PUSH_SERVICE_HOSTS.includes(host) || PUSH_SERVICE_SUFFIXES.some((suffix) => host.endsWith(suffix));

export function isAllowedPushEndpoint(endpoint: string, extraOrigins: readonly string[] = []): boolean {
  if (!URL.canParse(endpoint)) return false;
  const url = new URL(endpoint);
  if (extraOrigins.includes(url.origin)) return true;
  return url.protocol === "https:" && url.port === "" && url.username === "" && isPushServiceHost(url.hostname);
}

export const allowedPushOrigins = (value: string | undefined): string[] =>
  (value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
