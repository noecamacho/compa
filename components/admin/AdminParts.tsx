import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

// Shared building blocks of the console. Desktop shows dense tables, a phone shows stacked cards; each page renders both
// and CSS picks one (`hidden md:block` / `md:hidden`), so there is no client-side width check and no layout flash.

type TableProps = { label: string; columns: string[]; children: ReactNode };

export function DataTable({ label, columns, children }: TableProps) {
  return (
    <Card className="hidden overflow-hidden md:block">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr className="bg-paper">
            {columns.map((column) => (
              <th key={column} scope="col" className="label-caps px-4 py-3 text-left" style={{ borderBottom: "2.5px solid var(--color-ink)" }}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </Card>
  );
}

export const Row = ({ children }: { children: ReactNode }) => <tr className="relative align-middle transition-colors hover:bg-sun-soft [&:not(:first-child)>td]:dashed-ink">{children}</tr>;

export const Cell = ({ children, className }: { children: ReactNode; className?: string }) => <td className={`px-4 py-3 text-[14px] font-bold ${className ?? ""}`}>{children}</td>;

// Phone list: one card per row, hidden from 768 px up where the table takes over.
export const CardList = ({ children }: { children: ReactNode }) => <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">{children}</ul>;

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

export type FilterOption = { key: string; label: string; href: string };

// URL-backed filter (back, refresh and share all keep it): links styled as a segmented control.
export function FilterTabs({ label, options, active }: { label: string; options: FilterOption[]; active: string }) {
  return (
    <nav aria-label={label} className="inline-flex max-w-full gap-1 self-start overflow-x-auto rounded-[14px] bg-white p-1 border-ink">
      {options.map((option) => (
        <Link
          key={option.key}
          href={option.href}
          aria-current={option.key === active ? "page" : undefined}
          className={`flex h-10 items-center rounded-[10px] px-4 text-[14px] font-extrabold whitespace-nowrap ${option.key === active ? "bg-ink text-paper" : "hover:bg-sun-soft"}`}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}

// The page's primary action, pinned to the thumb on a phone and inline at md+ (render the inline one beside the title).
export function MobileActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 mt-auto -mx-4 -mb-6 border-t-[2.5px] border-ink bg-paper px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">{children}</div>
  );
}
