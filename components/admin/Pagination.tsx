import Link from "next/link";
import type { ReactNode } from "react";
import type { Dictionary } from "@/lib/copy";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
  copy: Dictionary["admin"]["ui"]["list"];
  // Page-size links (25 / 50 / 100) from md; omit to hide them.
  pageSizes?: { sizes: number[]; hrefFor: (size: number) => string };
};

const pageCount = (total: number, pageSize: number) => Math.max(1, Math.ceil(total / pageSize));

const BUTTON = "box-border inline-flex h-11 items-center justify-center rounded-[12px] bg-white px-4 font-display text-[15px] font-bold whitespace-nowrap border-ink";

// « Previous · Page 2 of 4 · Next » (spec §5.1). Plain links, so it works without JS; a disabled end is an aria-disabled
// span, not a link. Past the last page it says so and links back to the last one (edge case 2).
export function Pagination({ page, pageSize, total, hrefFor, copy, pageSizes }: Props) {
  const pages = pageCount(total, pageSize);
  if (page > pages && total > 0) return <PastEnd page={page} href={hrefFor(pages)} copy={copy} />;
  if (pages === 1 && !pageSizes) return null;
  return (
    <nav aria-label={copy.pagination} className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex flex-1 items-center justify-between gap-3 md:flex-none md:justify-start">
        <Step href={page > 1 ? hrefFor(page - 1) : null} rel="prev">
          <span aria-hidden>« </span>
          {copy.prev}
        </Step>
        <span className="text-[14px] font-extrabold text-muted tabular-nums">{copy.pageOf(Math.min(page, pages), pages)}</span>
        <Step href={page < pages ? hrefFor(page + 1) : null} rel="next">
          {copy.next}
          <span aria-hidden> »</span>
        </Step>
      </span>
      {pageSizes && <PageSizes current={pageSize} {...pageSizes} label={copy.pageSize} />}
    </nav>
  );
}

function Step({ href, rel, children }: { href: string | null; rel: "prev" | "next"; children: ReactNode }) {
  if (!href)
    return (
      <span aria-disabled="true" className={`${BUTTON} opacity-50`}>
        {children}
      </span>
    );
  return (
    <Link href={href} rel={rel} className={`${BUTTON} shadow-hard-2 pressable`}>
      {children}
    </Link>
  );
}

function PageSizes({ current, sizes, hrefFor, label }: { current: number; sizes: number[]; hrefFor: (size: number) => string; label: string }) {
  return (
    <span className="hidden items-center gap-2 text-[13px] font-extrabold text-muted md:flex">
      {label}
      {sizes.map((size) => (
        <Link key={size} href={hrefFor(size)} aria-current={size === current ? "true" : undefined} className={`inline-flex h-9 min-w-9 items-center justify-center rounded-[9px] px-2 tabular-nums ${size === current ? "bg-ink text-paper" : "text-ink hover:bg-sun-soft"}`}>
          {size}
        </Link>
      ))}
    </span>
  );
}

function PastEnd({ page, href, copy }: { page: number; href: string; copy: Props["copy"] }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-3 text-[14px] font-extrabold">
      {copy.pastEnd(page)}
      <Link href={href} className="inline-flex min-h-11 items-center underline">
        {copy.lastPage}
      </Link>
    </p>
  );
}
