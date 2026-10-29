import { describe, expect, test } from "bun:test";
import { isSessionPoolerUrl } from "../db/connect";

describe("isSessionPoolerUrl", () => {
  test("flags the Supabase session pooler", () => {
    expect(isSessionPoolerUrl("postgresql://postgres.ref:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres")).toBe(true);
  });
  test("accepts the transaction pooler and other hosts", () => {
    expect(isSessionPoolerUrl("postgresql://postgres.ref:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres")).toBe(false);
    expect(isSessionPoolerUrl("postgresql://postgres:postgres@127.0.0.1:5432/postgres")).toBe(false);
  });
});
