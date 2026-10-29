import { describe, expect, mock, test } from "bun:test";
import { AuthApiError, AuthInvalidJwtError, AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";
import { ApiError } from "../api/errors";
import type { ClaimsReader } from "./supabase";

// Each test decides what getClaims answers; the reader is passed in, so no module mock can leak between test files.
type Answer = Awaited<ReturnType<ClaimsReader["getClaims"]>>;
let answer: () => Promise<Answer> = async () => ({ data: null, error: null });
mock.module("server-only", () => ({}));
const { authUserIdFrom, isSignedOutError } = await import("./supabase");
const authUserId = () => authUserIdFrom({ getClaims: () => answer() });

const statusOf = async (run: Promise<unknown>) => run.then(() => 200, (error: unknown) => (error instanceof ApiError ? error.status : 500));

describe("authUserId (conference-scale finding 1)", () => {
  test("a verified JWT gives its subject", async () => {
    answer = async () => ({ data: { claims: { sub: "auth-1" } }, error: null });
    expect(await authUserId()).toBe("auth-1");
  });

  test("no session, an expired or forged JWT, or a rejected refresh token is signed out", async () => {
    for (const error of [new AuthSessionMissingError(), new AuthInvalidJwtError("expired"), new AuthApiError("Invalid Refresh Token", 400, "refresh_token_not_found")]) {
      answer = async () => ({ data: null, error });
      expect(await authUserId()).toBeNull();
    }
    answer = async () => ({ data: null, error: null });
    expect(await authUserId()).toBeNull();
  });

  test("Auth down, overloaded or rate limited is 503, never signed out", async () => {
    for (const error of [new AuthRetryableFetchError("fetch failed", 0), new AuthApiError("timed out", 504, undefined), new AuthApiError("rate limit", 429, "over_request_rate_limit")]) {
      answer = async () => ({ data: null, error });
      expect(await statusOf(authUserId())).toBe(503);
    }
    answer = async () => Promise.reject(new TypeError("fetch failed"));
    expect(await statusOf(authUserId())).toBe(503);
  });

  test("only Auth errors and an undecodable JWT can mean signed out", async () => {
    expect(isSignedOutError(new Error("boom"))).toBe(false);
    expect(isSignedOutError(null)).toBe(false);
    answer = async () => Promise.reject(new SyntaxError("Unexpected token"));
    expect(await authUserId()).toBeNull();
  });
});
