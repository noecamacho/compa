import { describe, expect, mock, test } from "bun:test";
import type { EventRow, UserRow } from "../../db/schema";
import { ApiError } from "../api/errors";

mock.module("server-only", () => ({}));
const { deleteTestUser, requireTestTarget } = await import("./test-users");
const { ensureCheckedIn } = await import("./events");

function caught(run: () => unknown): ApiError {
  try {
    run();
  } catch (error) {
    if (error instanceof ApiError) return error;
  }
  throw new Error("expected an ApiError");
}

describe("test sessions refuse real people (A11)", () => {
  test("a real user reads as an unknown test user", () => {
    const error = caught(() => requireTestTarget({ id: "u1", isTest: false, role: "super_admin" } as UserRow));
    expect(error.status).toBe(404);
    expect(error.code).toBe("test_user_not_found");
  });
  test("a missing user reads the same way", () => expect(caught(() => requireTestTarget(undefined)).code).toBe("test_user_not_found"));
  test("a test user passes", () => {
    const row = { id: "t1", isTest: true } as UserRow;
    expect(requireTestTarget(row)).toBe(row);
  });
});

describe("check-in keeps test users out of real events (M20)", () => {
  test("refused before touching the database", async () => {
    const neverCalled = new Proxy({}, { get: () => { throw new Error("database touched"); } });
    const promise = ensureCheckedIn({ id: "t1", isTest: true } as UserRow, { id: "e1", isTest: false } as EventRow, true, neverCalled as never);
    const error = await promise.then(() => null, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("test_user_not_allowed");
  });
});

describe("a test admin cannot delete their own account (admin spec §7.5)", () => {
  test("refused with 409 before touching the database", async () => {
    const self = { id: "6a0f6c1e-1b2d-4c3e-8f4a-5b6c7d8e9f01", isTest: true, role: "super_admin" } as UserRow;
    const input = { req: new Request("http://localhost"), user: self, params: { id: self.id }, query: {}, body: {} };
    const error = await deleteTestUser(input).then(() => null, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).code).toBe("cannot_delete_self");
  });
});
