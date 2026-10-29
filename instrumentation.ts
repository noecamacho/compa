import type { Instrumentation } from "next";
import { logError, pathOnly, requestIdFrom } from "@/lib/server/log";

// Render, action and proxy failures that never reach a route's own catch (defineRoute logs those itself).
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) headers.set(name, [value].flat().join(", "));
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  logError({
    event: `${context.routeType}_error`,
    error,
    requestId: requestIdFrom(headers),
    method: request.method,
    path: pathOnly(request.path),
    digest,
  });
};
