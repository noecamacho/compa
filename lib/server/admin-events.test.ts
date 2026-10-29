import { describe, expect, mock, test } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { UserRow } from "../../db/schema";
import { AdminEventQuery } from "../api/admin-schemas";

mock.module("server-only", () => ({}));
const { escapeLike, eventListFilter, eventOrder, pageOffset, phaseFilter } = await import("./admin-events");

const dialect = new PgDialect();
const render = (fragment: SQL | undefined) => (fragment ? dialect.sqlToQuery(fragment) : { sql: "", params: [] });
const now = new Date("2026-10-29T20:00:00.000Z");
const realAdmin = { id: "a1", isTest: false, role: "super_admin" } as UserRow;
const testAdmin = { ...realAdmin, isTest: true } as UserRow;
const query = (raw: Record<string, string> = {}) => AdminEventQuery.parse(raw);

describe("phaseFilter: phaseOf in SQL (admin spec §7.1)", () => {
  test("running is live with now inside [startsAt, endsAt)", () => {
    const { sql, params } = render(phaseFilter("running", now));
    expect(sql).toBe('("events"."status" = $1 and "events"."starts_at" <= $2 and "events"."ends_at" > $3)');
    expect(params).toEqual(["live", now.toISOString(), now.toISOString()]);
  });

  test("upcoming is live before the start", () => {
    expect(render(phaseFilter("upcoming", now)).sql).toBe('("events"."status" = $1 and "events"."starts_at" > $2)');
  });

  test("ended includes live events whose window closed", () => {
    const { sql, params } = render(phaseFilter("ended", now));
    expect(sql).toBe('("events"."status" = $1 or ("events"."status" = $2 and "events"."ends_at" <= $3))');
    expect(params).toEqual(["ended", "live", now.toISOString()]);
  });

  test("draft and archived are plain statuses", () => {
    expect(render(phaseFilter("draft", now)).params).toEqual(["draft"]);
    expect(render(phaseFilter("archived", now)).params).toEqual(["archived"]);
  });
});

describe("eventListFilter", () => {
  test("defaults hide archived events and nothing else", () => {
    expect(render(eventListFilter(realAdmin, query(), now)).sql).toBe('"events"."status" <> $1');
  });

  test("legacy archived=1 lifts the filter", () => {
    expect(render(eventListFilter(realAdmin, query({ archived: "1" }), now)).sql).toBe("");
  });

  test("phase wins over status and archived", () => {
    const { params } = render(eventListFilter(realAdmin, query({ phase: "draft", status: "live", archived: "1" }), now));
    expect(params).toEqual(["draft"]);
  });

  test("q searches four columns with escaped wildcards and matches an access code exactly", () => {
    const { sql, params } = render(eventListFilter(realAdmin, query({ q: " 50%_Off ", archived: "1" }), now));
    expect(sql).toContain('"events"."name" ilike $1');
    expect(sql).toContain('"events"."access_code" = $5');
    expect(params).toEqual(["%50\\%\\_Off%", "%50\\%\\_Off%", "%50\\%\\_Off%", "%50\\%\\_Off%", "50%_off"]);
  });

  test("a test admin only ever sees test events", () => {
    const { sql, params } = render(eventListFilter(testAdmin, query({ test: "exclude" }), now));
    expect(sql).toBe('("events"."status" <> $1 and "events"."is_test" = $2 and "events"."is_test" = $3)');
    expect(params).toEqual(["archived", false, true]);
  });
});

describe("eventOrder", () => {
  const rendered = (sort: string, dir?: string) => {
    const parsed = query({ sort, ...(dir ? { dir } : {}) });
    return eventOrder(parsed.sort, parsed.dir, now).map((part) => render(part).sql);
  };

  test("default is newest start first with the id tiebreaker", () => {
    expect(rendered("startsAt")).toEqual(['"events"."starts_at" desc', '"events"."id" desc']);
  });

  test("name defaults to A to Z; an explicit dir wins", () => {
    expect(rendered("name")).toEqual(['"events"."name" asc', '"events"."id" asc']);
    expect(rendered("name", "desc")).toEqual(['"events"."name" desc', '"events"."id" desc']);
  });

  test("status ranks phases running, upcoming, draft, ended, archived", () => {
    const [key] = rendered("status", "asc");
    expect(key).toStartWith("case when");
    expect(key).toContain("then 0 when");
    expect(key).toEndWith("then 4 end asc");
  });

  test("attendees and connections order by correlated counts", () => {
    expect(rendered("attendees")[0]).toBe('(select count(*) from "event_attendees" where "event_attendees"."event_id" = "events"."id") desc');
    expect(rendered("connections")[0]).toContain("\"connections\".\"status\" = 'accepted'");
  });
});

describe("pagination and escaping", () => {
  test("page 1 starts at 0", () => {
    expect(pageOffset(1, 25)).toBe(0);
    expect(pageOffset(3, 25)).toBe(50);
  });

  test("escapeLike escapes backslash, percent and underscore", () => expect(escapeLike("a\\b%c_d")).toBe("a\\\\b\\%c\\_d"));

  test("query defaults keep today's callers unchanged", () => {
    expect(query()).toEqual({ archived: "0", test: "include", sort: "startsAt", page: 1, pageSize: 200 });
  });
});
