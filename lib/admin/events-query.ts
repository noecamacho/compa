// URL state of the /admin events list (spec §5.1, §6.1, edge cases 1 and 44): searchParams in, normalized params out.
import { z } from "zod";
import { EVENT_SORTS, EventPhase } from "../api/admin-schemas";
import type { EventPhaseT } from "./event-phase";
import { parsePageParams, type RawSearchParams } from "./page-params";
import { sortDirection, type SortDir } from "./sort";
import type { UrlParams } from "./url";

const EventSort = z.enum(EVENT_SORTS);
const Dir = z.enum(["asc", "desc"]);
export const TEST_SCOPES = ["include", "exclude", "only"] as const;
export const PAGE_SIZES = [25, 50, 100] as const;

export type EventSortT = z.infer<typeof EventSort>;

const EventListParams = z.object({
  q: z.string().trim().max(80).optional(),
  phase: EventPhase.optional(),
  // Legacy `/admin?archived=1` links map to the Archived chip.
  archived: z.literal("1").optional(),
  test: z.enum(TEST_SCOPES).default("include"),
  sort: EventSort.default("startsAt"),
  dir: Dir.optional(),
  // The phone sort select sends `sort:dir` in one value; it wins over `sort` and `dir`.
  order: z.string().optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.enum(["25", "50", "100"]).default("25"),
});

// Values the URL leaves out; hrefWith drops them.
export const EVENT_LIST_DEFAULTS: UrlParams = { test: "include", sort: "startsAt", pageSize: "25" };

export type EventListState = {
  q?: string;
  phase?: EventPhaseT;
  test: (typeof TEST_SCOPES)[number];
  sort: EventSortT;
  // Explicit only when the URL says so; `effectiveDir` applies the per-sort default.
  dir?: SortDir;
  effectiveDir: SortDir;
  page: number;
  pageSize: number;
  // Canonical params for building links (no `order`, no `archived`).
  url: UrlParams;
  filtered: boolean;
};

function fromOrder(order: string | undefined): { sort: EventSortT; dir: SortDir } | null {
  const [sort, dir] = (order ?? "").split(":");
  const parsedSort = EventSort.safeParse(sort);
  const parsedDir = Dir.safeParse(dir);
  return parsedSort.success && parsedDir.success ? { sort: parsedSort.data, dir: parsedDir.data } : null;
}

// Never throws: a bad key falls back to its default.
export function eventListState(raw: RawSearchParams): EventListState {
  const params = parsePageParams(EventListParams, raw);
  const order = fromOrder(params.order);
  const sort = order?.sort ?? params.sort;
  const dir = order?.dir ?? params.dir;
  const phase = params.phase ?? (params.archived ? "archived" : undefined);
  const q = params.q || undefined;
  const url: UrlParams = { q, phase, test: params.test, sort, dir, page: String(params.page), pageSize: params.pageSize };
  return {
    q,
    phase,
    test: params.test,
    sort,
    dir,
    effectiveDir: sortDirection(sort, dir),
    page: params.page,
    pageSize: Number(params.pageSize),
    url,
    filtered: Boolean(q || phase || params.test !== "include"),
  };
}

// The GET /api/admin/events query for a state.
export function eventsApiQuery(state: EventListState): string {
  const entries = Object.entries(state.url).filter((entry): entry is [string, string] => Boolean(entry[1]));
  return new URLSearchParams(entries).toString();
}
