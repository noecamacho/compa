import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { UrlParams } from "@/lib/admin/url";

type Props = {
  // The list's own path, e.g. "/admin"; the form GETs it.
  action: string;
  // Every current param; `q` goes in the search box, `page` is dropped (a new search starts on page 1), and keys the
  // `selects` own must be listed in `owned` so they are not sent twice.
  params: UrlParams;
  owned?: string[];
  searchLabel: string;
  placeholder?: string;
  submitLabel: string;
  // FilterTabs (phase or test chips).
  chips?: ReactNode;
  // ToolbarSelect elements; they live inside the form, so they submit with it.
  selects?: ReactNode;
  // "1–25 of 48"; rendered in a role="status" live region.
  result?: ReactNode;
};

const hiddenEntries = (params: UrlParams, owned: string[]) =>
  Object.entries(params).filter((entry): entry is [string, string] => entry[0] !== "q" && entry[0] !== "page" && !owned.includes(entry[0]) && Boolean(entry[1]));

// Server-rendered GET form, so search and filters work without JS (spec §5.1). Phone: search, chips, selects 50/50,
// result. 768–1279: search + selects, then chips + result. ≥1280: one row. Sticky from md (`--admin-sticky-top` on the
// list wrapper keeps a DataTable header under it).
export function ListToolbar({ action, params, owned = [], searchLabel, placeholder, submitLabel, chips, selects, result }: Props) {
  return (
    <div className="z-20 -mx-4 bg-paper px-4 py-3 md:sticky md:top-0 md:-mx-6 md:border-b-[1.5px] md:border-ink/15 md:px-6 xl:-mx-8 xl:px-8 2xl:-mx-12 2xl:px-12">
      <form method="get" action={action} role="search" className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center xl:flex xl:flex-row">
        {hiddenEntries(params, owned).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <div className="relative min-w-0 xl:w-[300px] xl:shrink-0">
          <label htmlFor="list-q" className="sr-only">
            {searchLabel}
          </label>
          <input
            id="list-q"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder={placeholder ?? searchLabel}
            enterKeyHint="search"
            maxLength={80}
            className="box-border block h-11 w-full rounded-[12px] bg-white pr-12 pl-3 font-body text-[16px] font-bold text-ink outline-none border-ink transition-shadow duration-200 placeholder:text-muted focus:shadow-[0_0_0_4px_#6BE4A3] md:text-[14px]"
          />
          <button type="submit" aria-label={submitLabel} title={submitLabel} className="absolute top-0 right-0 flex size-11 cursor-pointer items-center justify-center rounded-r-[12px] text-ink hover:bg-sun-soft">
            <Icon name="search" size={20} />
          </button>
        </div>
        {chips && <div className="min-w-0 md:col-start-1 md:row-start-2 xl:flex-1">{chips}</div>}
        {selects && <div className="grid grid-cols-2 gap-2 md:col-start-2 md:row-start-1 md:flex xl:shrink-0">{selects}</div>}
        {result && (
          <p role="status" className="m-0 text-[13px] font-extrabold whitespace-nowrap text-muted tabular-nums md:col-start-2 md:row-start-2 md:justify-self-end xl:ml-auto">
            {result}
          </p>
        )}
      </form>
    </div>
  );
}
