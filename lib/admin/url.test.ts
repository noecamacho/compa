import { describe, expect, test } from "bun:test";
import { hrefWith } from "./url";

describe("hrefWith", () => {
  test("keeps the current params and applies the patch", () => {
    expect(hrefWith("/admin", { q: "fest", phase: "running" }, { sort: "name" })).toBe("/admin?q=fest&phase=running&sort=name");
  });

  test("drops undefined and empty values, and returns the bare path when nothing is left", () => {
    expect(hrefWith("/admin", { q: "", phase: undefined }, {})).toBe("/admin");
    expect(hrefWith("/admin", { q: "fest" }, { q: undefined })).toBe("/admin");
  });

  test("drops values equal to their default", () => {
    expect(hrefWith("/admin", { test: "include", sort: "startsAt" }, {}, { test: "include", sort: "startsAt" })).toBe("/admin");
    expect(hrefWith("/admin", {}, { test: "only" }, { test: "include" })).toBe("/admin?test=only");
  });

  test("resets page when anything other than page changes", () => {
    expect(hrefWith("/admin", { q: "fest", page: "3" }, { phase: "draft" })).toBe("/admin?q=fest&phase=draft");
  });

  test("keeps the requested page when only page changes, and drops page 1", () => {
    expect(hrefWith("/admin", { q: "fest", page: "3" }, { page: "4" })).toBe("/admin?q=fest&page=4");
    expect(hrefWith("/admin", { q: "fest", page: "3" }, { page: "1" })).toBe("/admin?q=fest");
  });

  test("does not reset page for a patch that changes nothing", () => {
    expect(hrefWith("/admin", { q: "fest", page: "3" }, { q: "fest" })).toBe("/admin?q=fest&page=3");
  });

  test("encodes values", () => {
    expect(hrefWith("/admin/people", {}, { q: "ana & co/50%" })).toBe("/admin/people?q=ana+%26+co%2F50%25");
  });
});
