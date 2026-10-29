import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

// Shared building blocks of the console. Desktop shows dense tables, a phone shows stacked cards; each page renders both
// and CSS picks one (`hidden md:block` / `md:hidden`), so there is no client-side width check and no layout flash.

export type SortDir = "asc" | "desc";

export type Column = {
  key: string;
  // Usually text; a node for a header control (the select-page checkbox).
  label: ReactNode;
  // Makes the header a sort link (spec §5.1).
  sortKey?: string;
  // Responsive visibility, for example "hidden lg:table-cell"; give the matching Cell the same class.
  className?: string;
  align?: "left" | "right" | "center";
};

// `hrefFor(sortKey, undefined)` means "this column, its default direction" (the API picks asc for name, desc otherwise).
export type TableSort = { key: string; dir: SortDir; hrefFor: (sortKey: string, dir: SortDir | undefined) => string };

type TableProps = { label: string; columns: Column[]; sort?: TableSort; children: ReactNode };

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;
const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

// `overflow-clip`, not `overflow-hidden`: a hidden overflow makes the card a scroll container and the sticky header stops
// sticking (edge case 39). Set `--admin-sticky-top` on an ancestor to park the header under a sticky toolbar.
export function DataTable({ label, columns, sort, children }: TableProps) {
  return (
    <Card className="hidden overflow-clip md:block">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <HeaderCell key={column.key} column={column} sort={sort} />
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </Card>
  );
}

function HeaderCell({ column, sort }: { column: Column; sort?: TableSort }) {
  const active = sort && column.sortKey === sort.key ? sort.dir : undefined;
  const ariaSort = column.sortKey && sort ? (active ? ARIA_SORT[active] : "none") : undefined;
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`sticky top-[var(--admin-sticky-top,0px)] z-[15] h-12 bg-paper px-3 py-1 text-[12px] font-extrabold whitespace-nowrap text-muted ${ALIGN[column.align ?? "left"]} ${column.className ?? ""}`}
      style={{ boxShadow: "inset 0 -2.5px 0 var(--color-ink)" }}
    >
      {column.sortKey && sort ? <SortLink column={column} sortKey={column.sortKey} sort={sort} active={active} /> : column.label}
    </th>
  );
}

function SortLink({ column, sortKey, sort, active }: { column: Column; sortKey: string; sort: TableSort; active: SortDir | undefined }) {
  const next = active ? (active === "asc" ? "desc" : "asc") : undefined;
  return (
    <Link href={sort.hrefFor(sortKey, next)} className={`inline-flex min-h-11 items-center gap-1 rounded-[6px] hover:text-ink focus-visible:outline-2 focus-visible:outline-ink ${active ? "text-ink" : ""}`}>
      {column.label}
      <span aria-hidden className="inline-block w-3 text-center">
        {active === "asc" ? "↑" : active === "desc" ? "↓" : "↕"}
      </span>
    </Link>
  );
}

// A row with a checked checkbox (bulk selection) stays highlighted.
export const Row = ({ children }: { children: ReactNode }) => (
  <tr className="relative align-middle transition-colors hover:bg-sun-soft has-[input:checked]:bg-sun-soft [&:not(:first-child)>td]:dashed-ink">{children}</tr>
);

export const Cell = ({ children, className }: { children: ReactNode; className?: string }) => <td className={`px-3 py-3 text-[14px] font-bold ${className ?? ""}`}>{children}</td>;

// Phone list: one card per row, hidden from 768 px up where the table takes over.
// `className` adds layout, for example "sm:grid sm:grid-cols-2" for two columns on a landscape phone.
export const CardList = ({ children, className }: { children: ReactNode; className?: string }) => (
  <ul className={`m-0 flex list-none flex-col gap-3 p-0 md:hidden ${className ?? ""}`}>{children}</ul>
);

type EmptyProps = { title: string; body?: string; action?: ReactNode };

// Never a bare "no data": say what will appear here and offer the one next step.
export function EmptyState({ title, body, action }: EmptyProps) {
  return (
    <Card tone="paper" size="flat" className="flex flex-col items-start gap-2 px-5 py-6" style={{ borderStyle: "dashed" }}>
      <p className="m-0 font-display text-[20px] leading-[1.15] font-bold">{title}</p>
      {body && <p className="m-0 max-w-[460px] text-[14px] font-bold text-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}

// `count` arrives formatted (formatCount); `className` handles responsive visibility, e.g. "xl:hidden" for the QR tab.
export type FilterOption = { key: string; label: string; href: string; count?: string; className?: string };

// URL-backed filter (back, refresh and share all keep it): links styled as a segmented control, 44 px targets. When the
// options overflow (Spanish at 360) it scrolls, with an edge fade where scroll-driven animations exist (globals.css).
export function FilterTabs({ label, options, active }: { label: string; options: FilterOption[]; active: string }) {
  return (
    <nav aria-label={label} className="scroll-fade-x inline-flex max-w-full gap-1 self-start overflow-x-auto rounded-[14px] bg-white p-1 [scrollbar-width:none] border-ink">
      {options.map((option) => (
        <Link
          key={option.key}
          href={option.href}
          aria-current={option.key === active ? "page" : undefined}
          className={`flex h-11 shrink-0 items-center gap-2 rounded-[10px] px-4 text-[14px] font-extrabold whitespace-nowrap ${option.key === active ? "bg-ink text-paper" : "hover:bg-sun-soft"} ${option.className ?? ""}`}
        >
          {option.label}
          {option.count !== undefined && (
            <span className={`rounded-[7px] px-[6px] text-[12px] tabular-nums ${option.key === active ? "bg-paper/20" : "bg-ink/10"}`}>{option.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

// A form's save bar, pinned above the admin bottom nav on a phone (spec §3) and inline at md+.
export function MobileActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom))] z-10 mt-auto -mx-4 -mb-4 border-t-[2.5px] border-ink bg-paper px-4 py-3 md:hidden">{children}</div>
  );
}
