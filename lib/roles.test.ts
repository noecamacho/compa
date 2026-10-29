import { describe, expect, test } from "bun:test";
import { canManageEvent, canManageUser } from "./api/admin-gate";
import { canAttend, isSuperAdmin, visibleAtEvent } from "./roles";

const real = { isTest: false };
const test_ = { isTest: true };

describe("roles (M20)", () => {
  test("only role super_admin counts", () => {
    expect(isSuperAdmin({ role: "super_admin" })).toBe(true);
    expect(isSuperAdmin({ role: "user" })).toBe(false);
    expect(isSuperAdmin(null)).toBe(false);
  });
});

describe("is_test exclusion", () => {
  test("test users never join a real event; anyone joins a test event", () => {
    expect(canAttend(test_, real)).toBe(false);
    expect(canAttend(real, real)).toBe(true);
    expect(canAttend(test_, test_)).toBe(true);
    expect(canAttend(real, test_)).toBe(true);
  });
  test("a real event's people leave test users out; a test event shows everyone", () => {
    const people = [
      { id: "a", isTest: false },
      { id: "b", isTest: true },
    ];
    expect(visibleAtEvent(real, people).map((p) => p.id)).toEqual(["a"]);
    expect(visibleAtEvent(test_, people).map((p) => p.id)).toEqual(["a", "b"]);
  });
  test("a test super admin manages test events and test people only", () => {
    expect(canManageEvent(test_, real)).toBe(false);
    expect(canManageEvent(test_, test_)).toBe(true);
    expect(canManageEvent(real, real)).toBe(true);
    expect(canManageUser(test_, real)).toBe(false);
    expect(canManageUser(real, test_)).toBe(true);
  });
});
