import { describe, expect, test } from "bun:test";
import { copyFor } from "../copy";
import { LOCALES } from "../i18n";
import { ApiClientError } from "./client";
import { errorText } from "./error-text";

describe.each(LOCALES)("errorText (%s)", (locale) => {
  const copy = copyFor(locale);
  const { apiErrors, common } = copy;

  test("never shows the raw browser or server message", () => {
    expect(errorText(copy, new ApiClientError(0, "network_error", "Failed to fetch"))).toBe(apiErrors.codes.network_error);
    expect(errorText(copy, new ApiClientError(409, "not_pending", "This request was already answered."))).toBe(apiErrors.codes.not_pending);
    expect(errorText(copy, new ApiClientError(401, "unauthorized", "Sign in with LinkedIn to continue."))).toBe(apiErrors.signedOut);
    expect(errorText(copy, new ApiClientError(429, "rate_limited", "slow down"))).toBe(common.rateLimited);
    expect(errorText(copy, new ApiClientError(429, "limit_reached", "Limit reached."))).toBe(common.limitReached);
    expect(errorText(copy, new ApiClientError(503, "unknown", "Service Unavailable"))).toBe(apiErrors.server);
    expect(errorText(copy, new ApiClientError(503, "auth_unavailable", "Sign-in could not be checked right now."))).toBe(apiErrors.codes.auth_unavailable);
    expect(errorText(copy, new Error("boom"))).toBe(apiErrors.generic);
  });

  test("reads the recorder's upload errors by shape", () => {
    const upload = Object.assign(new Error("TimeoutError"), { status: 0, code: "timeout" });
    expect(errorText(copy, upload)).toBe(apiErrors.codes.timeout);
  });
});

test("the same code reads differently in each language", () => {
  const error = new ApiClientError(409, "not_pending", "This request was already answered.");
  expect(errorText(copyFor("es"), error)).not.toBe(errorText(copyFor("en"), error));
});
